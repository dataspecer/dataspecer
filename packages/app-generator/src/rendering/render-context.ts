import type { Property, Schema } from 'ldkit';

import type {
  GeneratedAggregateDescriptor,
  GeneratedFieldDescriptor,
  GeneratedOperationDescriptor,
  GenerationModel,
} from '../generation-model/types.ts';

import { toModuleName, toOperationClassName, toPropertyName } from '../utils/naming.ts';
import { FieldKind } from '../metadata/types.ts';
import { datatypeMapping } from './datatypes.ts';

export interface GeneratedAppRenderContext {
  model: GenerationModel;
  aggregates: RenderedAggregate[];
  pages: RenderedPage[];
  json: (value: unknown) => string;
}

export interface RenderedAggregate extends GeneratedAggregateDescriptor {
  moduleName: string;
  descriptorName: string;
  modelName: string;
  schemaName: string;
  fields: RenderedField[];
  /**
   * Recursive plain objects matching the generated runtime `FieldDescriptor` shape, ready to be
   * emitted as JSON in the aggregate descriptor template.
   */
  descriptorFields: DescriptorField[];
  /**
   * The LDKit schema object for the aggregate, keyed by property name so the read result matches
   * the generated model.
   */
  ldkitSchema: Schema;
  /**
   * The LDKit schema rendered as TypeScript source. Datatype types are emitted as `xsd.*`
   * namespace references rather than plain IRIs, which is what LDKit's `Schema` type requires.
   */
  ldkitSchemaSource: string;
}

export interface RenderedField extends GeneratedFieldDescriptor {
  propertyName: string;
  modelType: string;
  /** The field as a TypeScript member declaration, for example `name?: string | null`. */
  modelDeclaration: string;
  /** TypeScript expression producing the default value for required fields. */
  emptyValue: string;
  fields?: RenderedField[];
}

interface DescriptorField {
  path: string;
  propertyName: string;
  label: string;
  kind: string;
  many: boolean;
  required: boolean;
  propertyIri?: string;
  datatype?: string;
  targetAggregateIri?: string;
  targetClassIri?: string;
  associationKind?: string;
  isReverse?: boolean;
  fields?: DescriptorField[];
}

export interface RenderedPage {
  fileName: string;
  componentName: string;
  moduleName: string;
  modelName: string;
  operationClassName: string;
  operation: GeneratedOperationDescriptor;
}

export function buildRenderContext(model: GenerationModel): GeneratedAppRenderContext {
  const aggregates = model.aggregates.map((aggregate) => {
    const fields = aggregate.fields.map(toRenderedField);
    const schema = buildLdkitSchema(aggregate.classIri, fields);
    return {
      ...aggregate,
      moduleName: toModuleName(aggregate.name),
      descriptorName: `${aggregate.safeName}AggregateDescriptor`,
      modelName: `${aggregate.safeName}Model`,
      schemaName: `${aggregate.safeName}LdkitSchema`,
      fields,
      descriptorFields: fields.map(toDescriptorField),
      ldkitSchema: schema,
      ldkitSchemaSource: toLdkitSchemaSource(schema),
    };
  });
  const aggregateByIri = new Map(aggregates.map((aggregate) => [aggregate.iri, aggregate]));

  return {
    model,
    aggregates,
    pages: model.operations.map((operation) => {
      const aggregate = aggregateByIri.get(operation.aggregateIri);
      if (!aggregate) {
        throw new Error(`Missing aggregate render context for "${operation.aggregateIri}".`);
      }

      return {
        fileName: `${operation.pageComponentName}.tsx`,
        componentName: operation.pageComponentName,
        moduleName: aggregate.moduleName,
        modelName: aggregate.modelName,
        operationClassName: toOperationClassName(operation.nodeId),
        operation,
      };
    }),
    json: (value) => JSON.stringify(value, null, 2),
  };
}

function toRenderedField(field: GeneratedFieldDescriptor): RenderedField {
  const children = field.fields?.map(toRenderedField);
  const propertyName = toPropertyName(field.path);
  const modelType = toModelType(field, children);
  return {
    ...field,
    fields: children,
    propertyName,
    modelType,
    modelDeclaration: toModelDeclaration(propertyName, field.required, modelType),
    emptyValue: toEmptyValue(field, children),
  };
}

/**
 * Formats a field as a TypeScript member declaration. Optional fields are marked with `?` and
 * widened with `| null`, because LDKit returns null for an absent optional value.
 */
function toModelDeclaration(propertyName: string, required: boolean, modelType: string): string {
  return required ? `${propertyName}: ${modelType}` : `${propertyName}?: ${modelType} | null`;
}

function toDescriptorField(field: RenderedField): DescriptorField {
  return {
    path: field.path,
    propertyName: field.propertyName,
    label: field.label,
    kind: field.kind,
    many: field.many,
    required: field.required,
    ...(field.propertyIri ? { propertyIri: field.propertyIri } : {}),
    ...(field.datatype ? { datatype: field.datatype } : {}),
    ...(field.targetAggregateIri ? { targetAggregateIri: field.targetAggregateIri } : {}),
    ...(field.targetClassIri ? { targetClassIri: field.targetClassIri } : {}),
    ...(field.associationKind ? { associationKind: field.associationKind } : {}),
    ...(field.isReverse ? { isReverse: true } : {}),
    ...(field.fields ? { fields: field.fields.map(toDescriptorField) } : {}),
  };
}

/**
 * An association expands into a nested entity only when it exposes inline fields and its target
 * class is known. Without a class IRI there is no @type for the nested schema, so the
 * association is treated as a reference instead. The LDKit schema, model type, and empty value
 * all rely on this so they describe the same shape.
 */
function hasNestedSchema(field: GeneratedFieldDescriptor): boolean {
  return Boolean(field.fields?.length && field.targetClassIri);
}

/**
 * Builds the LDKit schema for an aggregate from its rendered fields. The class IRI becomes the
 * entity @type, primitives use their datatype, associations with inline fields expand under
 * @schema, and associations without inline fields stay references that resolve to the target
 * IRI. Fields without a property IRI cannot be queried and are omitted.
 */
function buildLdkitSchema(classIri: string, fields: RenderedField[]): Schema {
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
function toLdkitSchemaSource(schema: Schema): string {
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
  if (!field.required) {
    property['@optional'] = true;
  }
  return property;
}

function toModelType(field: GeneratedFieldDescriptor, children?: RenderedField[]): string {
  if (field.kind === FieldKind.Association) {
    const baseType =
      hasNestedSchema(field) && children
        ? `{ id?: string; ${children.map((child) => child.modelDeclaration).join('; ')} }`
        : 'string';
    return field.many ? `${baseType}[]` : baseType;
  }

  const mapping = datatypeMapping(field.datatype);
  if (mapping.multilang) {
    // LDKit returns a language to value map, and to value array map when the field repeats.
    return field.many ? 'Record<string, string[]>' : 'Record<string, string>';
  }
  return field.many ? `${mapping.tsType}[]` : mapping.tsType;
}

function toEmptyValue(field: GeneratedFieldDescriptor, children?: RenderedField[]): string {
  if (field.kind === FieldKind.Association) {
    if (field.many) {
      return '[]';
    }
    if (!(hasNestedSchema(field) && children)) {
      // A reference is an IRI string.
      return '""';
    }
    const requiredChildren = children.filter((child) => child.required);
    if (requiredChildren.length === 0) {
      return '{}';
    }
    return `{ ${requiredChildren
      .map((child) => `${child.propertyName}: ${child.emptyValue}`)
      .join(', ')} }`;
  }

  const mapping = datatypeMapping(field.datatype);
  if (mapping.multilang) {
    // A language map, empty whether or not the field repeats.
    return '{}';
  }
  return field.many ? '[]' : mapping.emptyValue;
}
