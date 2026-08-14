import type { Property, Schema } from 'ldkit';

import type { RenderedField } from './rendered-aggregate.ts';

import { FieldKind } from '../metadata/types.ts';
import { datatypeMapping } from './datatypes.ts';

/**
 * Builds the LDKit schema for an aggregate from its rendered fields. The class IRI becomes the
 * entity @type, primitives use their datatype, and associations with a target class expand under
 * @schema (with inline fields when present, otherwise just the target @type) so they read and
 * write as resource IRIs. Fields without a property IRI cannot be queried and are omitted.
 */
export function buildLdkitSchema(classIri: string, fields: RenderedField[]): Schema {
  const schema: Schema = { '@type': classIri };
  for (const field of fields) {
    if (!field.propertyIri) {
      continue;
    }
    schema[field.propertyName] = buildLdkitProperty(field);
  }
  return schema;
}

// The only xsd namespace IRIs in a schema are datatype @type values, so rewriting them to xsd.*
// references is safe. Class IRIs (entity @type) and predicate IRIs (@id) never use this prefix.
const XSD_TYPE_IRI = /"http:\/\/www\.w3\.org\/2001\/XMLSchema#([A-Za-z]+)"/g;

/**
 * Renders the schema as TypeScript source. Datatype @type values become `xsd.*` references so the
 * generated schema is assignable to LDKit's `Schema` type, which requires branded namespace
 * datatypes rather than plain IRIs.
 */
export function toLdkitSchemaSource(schema: Schema): string {
  return JSON.stringify(schema, null, 2).replace(XSD_TYPE_IRI, 'xsd.$1');
}

function buildLdkitProperty(field: RenderedField): Property {
  const property: Property = { '@id': field.propertyIri as string };
  if (field.isReverse) {
    property['@inverse'] = true;
  }

  if (field.kind === FieldKind.Association) {
    if (field.targetClassIri) {
      // Both inline-nested associations and plain references expand under @schema, so LDKit reads
      // and writes them as resource IRIs rather than string literals. A reference has no nested
      // fields, so its schema carries only the target @type.
      property['@schema'] = buildLdkitSchema(field.targetClassIri, field.fields ?? []);
    }
    // An association without a target class stays a bare reference with no @type.
  } else {
    const mapping = datatypeMapping(field.datatype);
    if (mapping.ldkitType) {
      property['@type'] = mapping.ldkitType;
    }
    // An untyped primitive uses LDKit's default literal handling.
  }

  if (field.many) {
    property['@array'] = true;
  }
  // Missing read values should not make LDKit treat the whole resource as absent. Generated forms enforce
  // mutation cardinality separately.
  property['@optional'] = true;
  return property;
}
