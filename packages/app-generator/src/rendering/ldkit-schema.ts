import type { Property, Schema } from 'ldkit';
import { ldkit } from 'ldkit/namespaces';

import { hasNestedModel } from '../metadata/field-shape.ts';
import { AssociationKind } from '../graph/types.ts';
import { RDF_TYPES_PROPERTY } from '../generation-model/types.ts';
import { FieldKind } from '../metadata/types.ts';
import { compositeKey } from '../utils/composite-key.ts';
import { datatypeMapping } from './datatypes.ts';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

/**
 * LDKit uses schemas for both querying and encoding. Lists omit compositions to keep paging
 * bounded, details expand inline compositions without filtering child types, and writes use
 * target-specific types and IRI links so each entity is saved separately.
 */
export interface GeneratedLdkitSchemaBundle {
  /** Root-typed schema used by detail reads. Inline composition children are type-less. */
  detail: Schema;
  /** Root-typed schema used by list reads. Composition fields are omitted. */
  list: Schema;
  /** Write schemas keyed by the JSON representation of their inline field path. */
  writes: Record<string, Schema>;
  /** Specialized write schemas keyed first by field path and then by specialization IRI. */
  specializationWrites: Record<string, Record<string, Schema>>;
}

export type LdkitSchemaNamespace = 'ldkit' | 'xsd';

/** Field properties used to construct LDKit schemas. */
export interface LdkitSchemaField {
  path: string;
  propertyName: string;
  kind: FieldKind;
  propertyIri?: string;
  datatype?: string;
  many: boolean;
  targetAggregateIri?: string;
  targetClassIri?: string;
  associationKind?: AssociationKind;
  isReverse?: boolean;
  fields?: readonly LdkitSchemaField[];
  specializations?: readonly {
    specializationIri: string;
    classIri: string;
    fieldPaths: readonly string[];
  }[];
}

/** Builds the operation-specific LDKit schemas used for one aggregate. */
export function buildLdkitSchemaBundle(
  classIri: string,
  fields: readonly LdkitSchemaField[],
): GeneratedLdkitSchemaBundle {
  const writes: Record<string, Schema> = {
    [entityTargetKey([])]: buildWriteSchema(classIri, fields),
  };
  const specializationWrites: Record<string, Record<string, Schema>> = {};
  collectNestedWriteSchemas(fields, [], writes, specializationWrites);

  return {
    detail: buildReadSchema(classIri, fields, true),
    list: buildReadSchema(classIri, fields, false),
    writes,
    specializationWrites,
  };
}

function buildReadSchema(
  classIri: string | undefined,
  fields: readonly LdkitSchemaField[],
  includeCompositions: boolean,
): Schema {
  const schema: Schema = classIri ? { '@type': classIri } : {};
  for (const field of fields) {
    if (!field.propertyIri || (!includeCompositions && isComposition(field))) {
      continue;
    }
    schema[field.propertyName] = buildReadProperty(field);
  }
  return schema;
}

function buildReadProperty(field: LdkitSchemaField): Property {
  const property = baseProperty(field, 'read');
  if (field.kind === FieldKind.Association) {
    if (hasNestedModel(field)) {
      const nestedSchema = buildReadSchema(undefined, field.fields, true);
      // A type triple keeps an otherwise empty composition decodable and provides specialization
      // evidence when the field has specialized shapes.
      nestedSchema[RDF_TYPES_PROPERTY] = {
        '@id': RDF_TYPE,
        '@type': ldkit.IRI,
        '@array': true,
        '@optional': true,
      };
      property['@schema'] = nestedSchema;
    } else {
      const displaySchema = referenceDisplaySchema(field);
      if (displaySchema) {
        property['@schema'] = displaySchema;
      } else {
        property['@type'] = ldkit.IRI;
      }
    }
  } else {
    setPrimitiveType(property, field);
  }
  return property;
}

/**
 * Reads a reference with the primitive fields its structure selected on the target, so a list or
 * detail can show a name instead of an IRI. Associations of the target are left out.
 */
function referenceDisplaySchema(field: LdkitSchemaField): Schema | undefined {
  if (!field.targetClassIri) {
    return undefined;
  }
  const schema: Schema = {};
  // two display fields may share one RDF predicate, but LDKit rejects a schema with a repeated @id, so only the first
  // field for a predicate is read
  const takenPropertyIris = new Set<string>();
  for (const displayField of field.fields ?? []) {
    if (displayField.kind !== FieldKind.Primitive || !displayField.propertyIri) {
      continue;
    }
    if (takenPropertyIris.has(displayField.propertyIri)) {
      continue;
    }
    takenPropertyIris.add(displayField.propertyIri);
    schema[displayField.propertyName] = buildReadProperty(displayField);
  }
  return takenPropertyIris.size > 0 ? schema : undefined;
}

function buildWriteSchema(classIri: string, fields: readonly LdkitSchemaField[]): Schema {
  const schema: Schema = { '@type': classIri };
  for (const field of fields) {
    if (!field.propertyIri) {
      continue;
    }
    const property = baseProperty(field, 'write');
    if (field.kind === FieldKind.Association) {
      // composite mutations write children separately and put only their IRIs in the parent
      property['@type'] = ldkit.IRI;
    } else {
      setPrimitiveType(property, field);
    }
    schema[field.propertyName] = property;
  }
  return schema;
}

function collectNestedWriteSchemas(
  fields: readonly LdkitSchemaField[],
  parentPath: readonly string[],
  writes: Record<string, Schema>,
  specializationWrites: Record<string, Record<string, Schema>>,
): void {
  for (const field of fields) {
    if (!hasNestedModel(field)) {
      continue;
    }

    const fieldPath = [...parentPath, field.path];
    const key = entityTargetKey(fieldPath);
    if (field.specializations?.length) {
      specializationWrites[key] = Object.fromEntries(
        field.specializations.map((specialization) => {
          const fieldPaths = new Set(specialization.fieldPaths);
          const specializationFields = field.fields.filter((candidate) =>
            fieldPaths.has(candidate.path),
          );
          return [
            specialization.specializationIri,
            buildWriteSchema(specialization.classIri, specializationFields),
          ];
        }),
      );
    } else {
      writes[key] = buildWriteSchema(field.targetClassIri, field.fields);
    }

    collectNestedWriteSchemas(field.fields, fieldPath, writes, specializationWrites);
  }
}

function baseProperty(field: LdkitSchemaField, mode: 'read' | 'write'): Property {
  // keep properties optional so incomplete RDF stays visible and updates can omit fields (form validation enforces
  // cardinality on save)
  const property: Property = {
    '@id': field.propertyIri as string,
    '@optional': true,
  };
  if (field.isReverse) {
    property['@inverse'] = true;
  }
  // a multilingual read is always an array, a write must not be: LDKit updates an array property
  // through an array or an $add/$set/$remove object, and a multilingual value is keyed by language
  const multilingual = datatypeMapping(field.datatype).multilingual === true;
  if ((mode === 'read' && multilingual) || (field.many && !multilingual)) {
    property['@array'] = true;
  }
  return property;
}

function setPrimitiveType(property: Property, field: LdkitSchemaField): void {
  const mapping = datatypeMapping(field.datatype);
  if (mapping.multilingual) {
    property['@multilang'] = true;
  } else if (mapping.ldkitType) {
    property['@type'] = mapping.ldkitType;
  }
}

function isComposition(field: LdkitSchemaField): boolean {
  return (
    field.kind === FieldKind.Association && field.associationKind === AssociationKind.Composition
  );
}

function entityTargetKey(fieldPath: readonly string[]): string {
  return compositeKey(...fieldPath);
}

const XSD_TYPE_IRI = /"http:\/\/www\.w3\.org\/2001\/XMLSchema#([A-Za-z][A-Za-z0-9]*)"/g;
const LDKIT_IRI_TYPE = /"https:\/\/ldkit\.io\/ontology\/IRI"/g;

/**
 * JSON serialization turns LDKit namespace members into full IRI strings, but LDKit's Schema type
 * accepts the namespace members. Restoring those expressions keeps emitted schemas assignable.
 */
export function toLdkitSchemaSource(schema: GeneratedLdkitSchemaBundle): string {
  return JSON.stringify(schema, null, 2)
    .replace(XSD_TYPE_IRI, 'xsd.$1')
    .replace(LDKIT_IRI_TYPE, 'ldkit.IRI');
}

/** Returns the namespace imports referenced by emitted schema source. */
export function ldkitSchemaNamespaces(source: string): LdkitSchemaNamespace[] {
  return [
    ...(source.includes('ldkit.') ? (['ldkit'] as const) : []),
    ...(source.includes('xsd.') ? (['xsd'] as const) : []),
  ];
}
