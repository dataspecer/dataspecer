import type { Property, Schema } from 'ldkit';
import { ldkit } from 'ldkit/namespaces';

import type { RenderedField } from './rendered-aggregate.ts';

import { AssociationKind } from '../graph/types.ts';
import { FieldKind } from '../metadata/types.ts';
import { datatypeMapping } from './datatypes.ts';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
export const RDF_TYPES_PROPERTY = '__rdfTypes';

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

/** Builds the operation-specific LDKit schemas used for one aggregate. */
export function buildLdkitSchemaBundle(
  classIri: string,
  fields: RenderedField[]
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
  fields: RenderedField[],
  includeCompositions: boolean
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

function buildReadProperty(field: RenderedField): Property {
  const property = baseProperty(field);
  if (field.kind === FieldKind.Association) {
    if (hasInlineCompositionSchema(field)) {
      const nestedSchema = buildReadSchema(undefined, field.fields ?? [], true);
      if (field.specializations?.length) {
        // because LDKit returns only declared properties, expose rdf:type for specialization selection
        nestedSchema[RDF_TYPES_PROPERTY] = {
          '@id': RDF_TYPE,
          '@type': ldkit.IRI,
          '@array': true,
          '@optional': true,
        };
      }
      property['@schema'] = nestedSchema;
    } else {
      property['@type'] = ldkit.IRI;
    }
  } else {
    setPrimitiveType(property, field);
  }
  return property;
}

function buildWriteSchema(classIri: string, fields: RenderedField[]): Schema {
  const schema: Schema = { '@type': classIri };
  for (const field of fields) {
    if (!field.propertyIri) {
      continue;
    }
    const property = baseProperty(field);
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
  fields: RenderedField[],
  parentPath: readonly string[],
  writes: Record<string, Schema>,
  specializationWrites: Record<string, Record<string, Schema>>
): void {
  for (const field of fields) {
    if (!hasInlineCompositionSchema(field)) {
      continue;
    }

    const fieldPath = [...parentPath, field.path];
    const key = entityTargetKey(fieldPath);
    if (field.specializations?.length) {
      specializationWrites[key] = Object.fromEntries(
        field.specializations.map((specialization) => {
          const fieldPaths = new Set(specialization.fieldPaths);
          const specializationFields = (field.fields ?? []).filter((candidate) =>
            fieldPaths.has(candidate.path)
          );
          return [
            specialization.specializationIri,
            buildWriteSchema(specialization.classIri, specializationFields),
          ];
        })
      );
    } else if (field.targetClassIri) {
      writes[key] = buildWriteSchema(field.targetClassIri, field.fields ?? []);
    }

    collectNestedWriteSchemas(field.fields ?? [], fieldPath, writes, specializationWrites);
  }
}

function baseProperty(field: RenderedField): Property {
  // keep properties optional so incomplete RDF stays visible and updates can omit fields (form validation enforces
  // cardinality on save)
  const property: Property = {
    '@id': field.propertyIri as string,
    '@optional': true,
  };
  if (field.isReverse) {
    property['@inverse'] = true;
  }
  if (field.many) {
    property['@array'] = true;
  }
  return property;
}

function setPrimitiveType(property: Property, field: RenderedField): void {
  const mapping = datatypeMapping(field.datatype);
  if (mapping.ldkitType) {
    property['@type'] = mapping.ldkitType;
  }
}

function isComposition(field: RenderedField): boolean {
  return (
    field.kind === FieldKind.Association && field.associationKind === AssociationKind.Composition
  );
}

function hasInlineCompositionSchema(field: RenderedField): boolean {
  return Boolean(
    isComposition(field) &&
    !field.targetAggregateIri &&
    field.targetClassIri &&
    field.fields !== undefined
  );
}

function entityTargetKey(fieldPath: readonly string[]): string {
  return JSON.stringify(fieldPath);
}

const XSD_TYPE_IRI = /"http:\/\/www\.w3\.org\/2001\/XMLSchema#([A-Za-z]+)"/g;
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
