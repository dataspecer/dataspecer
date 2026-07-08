import type { Schema } from 'ldkit';

import type {
  GeneratedAggregateDescriptor,
  GeneratedFieldDescriptor,
} from '../generation-model/types.ts';

import { FieldKind } from '../metadata/types.ts';
import { toModuleName, toPropertyName } from '../utils/naming.ts';
import { datatypeMapping } from './datatypes.ts';
import { hasNestedSchema } from './field-shape.ts';
import { buildLdkitSchema, toLdkitSchemaSource } from './ldkit-schema.ts';

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

export function toRenderedAggregate(aggregate: GeneratedAggregateDescriptor): RenderedAggregate {
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
