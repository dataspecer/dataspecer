import type { Property, Schema } from 'ldkit';

import type { RenderedField } from './rendered-aggregate.ts';

import { FieldKind } from '../metadata/types.ts';
import { datatypeMapping } from './datatypes.ts';
import { hasNestedSchema } from './field-shape.ts';

/**
 * Builds the LDKit schema for an aggregate from its rendered fields. The class IRI becomes the
 * entity @type, primitives use their datatype, associations with inline fields expand under
 * @schema, and associations without inline fields stay references that resolve to the target IRI.
 * Fields without a property IRI cannot be queried and are omitted.
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
    if (hasNestedSchema(field)) {
      property['@schema'] = buildLdkitSchema(field.targetClassIri as string, field.fields ?? []);
    }
    // Associations without a nested schema stay references, so LDKit returns the target IRI.
  } else {
    const mapping = datatypeMapping(field.datatype);
    if (mapping.multilang) {
      property['@multilang'] = true;
    } else if (mapping.ldkitType) {
      property['@type'] = mapping.ldkitType;
    }
    // A missing datatype mapping leaves the value as a plain string, LDKit's default.
  }

  if (field.many) {
    property['@array'] = true;
  }
  // Missing read values should not make LDKit treat the whole resource as absent.
  // TODO: Keep create and update validation separate so required fields stay required there.
  property['@optional'] = true;
  return property;
}
