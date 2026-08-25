import type {
  GeneratedAggregateDescriptor,
  GeneratedFieldDescriptor,
} from '../generation-model/types.ts';

import { hasNestedModel } from '../metadata/field-shape.ts';
import { projectGeneratedField } from '../generation-model/aggregate-descriptor.ts';
import { FieldKind } from '../metadata/types.ts';
import { joinFieldPath } from '../utils/field-path.ts';
import { toModuleName, toNestedModelTypeName, toPropertyName } from '../utils/naming.ts';
import { datatypeMapping, type FormControl } from './datatypes.ts';
import {
  buildLdkitSchemaBundle,
  ldkitSchemaNamespaces,
  toLdkitSchemaSource,
  type LdkitSchemaNamespace,
} from './ldkit-schema.ts';

export interface RenderedAggregate extends GeneratedAggregateDescriptor {
  moduleName: string;
  descriptorName: string;
  modelName: string;
  schemaName: string;
  fields: RenderedField[];
  nestedModels: RenderedNestedModel[];
  /**
   * Recursive plain objects matching the generated runtime `FieldDescriptor` shape, ready to be
   * emitted as JSON in the aggregate descriptor template.
   */
  descriptorFields: DescriptorField[];
  /**
   * The LDKit schema bundle rendered as TypeScript source. Datatype types use namespace
   * expressions rather than plain IRIs, which is what LDKit's `Schema` type requires.
   */
  ldkitSchemaSource: string;
  /** Namespace imports referenced by `ldkitSchemaSource`. */
  ldkitSchemaNamespaces: LdkitSchemaNamespace[];
  /** Whether the generated model needs the shared multilingual value type. */
  usesMultilingualValues: boolean;
}

export interface RenderedField extends GeneratedFieldDescriptor {
  propertyName: string;
  modelType: string;
  nestedModelName?: string;
  /** The field as a TypeScript member declaration, for example `name?: string | null`. */
  modelDeclaration: string;
  /** Form control for an editable primitive field. Absent for associations. */
  formControl?: FormControl;
  fields?: RenderedField[];
}

export interface RenderedNestedModel {
  name: string;
  fields: RenderedField[];
}

type DescriptorField = Omit<GeneratedFieldDescriptor, 'fields'> & {
  propertyName: string;
  formControl?: FormControl;
  fields?: DescriptorField[];
};

export function toRenderedAggregate(aggregate: GeneratedAggregateDescriptor): RenderedAggregate {
  const modelName = `${aggregate.safeName}Model`;
  const fields = aggregate.fields.map((field) => toRenderedField(field, aggregate.safeName));
  const schema = buildLdkitSchemaBundle(aggregate.classIri, fields);
  const ldkitSchemaSource = toLdkitSchemaSource(schema);
  return {
    ...aggregate,
    moduleName: toModuleName(aggregate.name),
    descriptorName: `${aggregate.safeName}AggregateDescriptor`,
    modelName,
    schemaName: `${aggregate.safeName}LdkitSchemas`,
    fields,
    nestedModels: collectNestedModels(fields),
    descriptorFields: fields.map(toDescriptorField),
    ldkitSchemaSource,
    ldkitSchemaNamespaces: ldkitSchemaNamespaces(ldkitSchemaSource),
    usesMultilingualValues: fields.some(usesMultilingualValue),
  };
}

function toRenderedField(
  field: GeneratedFieldDescriptor,
  aggregateTypeName: string,
  pathPrefix = ''
): RenderedField {
  const fieldPath = joinFieldPath(pathPrefix, field.path);
  const children = field.fields?.map((child) =>
    toRenderedField(child, aggregateTypeName, fieldPath)
  );
  const propertyName = toPropertyName(field.path);
  const nestedModelName = hasNestedModel(field)
    ? toNestedModelTypeName(aggregateTypeName, fieldPath)
    : undefined;
  const modelType = toModelType(field, children, nestedModelName);
  const formControl =
    field.kind === FieldKind.Primitive ? datatypeMapping(field.datatype).formControl : undefined;
  return {
    ...field,
    fields: children,
    propertyName,
    ...(nestedModelName ? { nestedModelName } : {}),
    modelType,
    modelDeclaration: toModelDeclaration(propertyName, field.required, modelType),
    ...(formControl ? { formControl } : {}),
  };
}

function collectNestedModels(fields: RenderedField[]): RenderedNestedModel[] {
  return fields.flatMap((field) => {
    if (!field.nestedModelName || !field.fields) {
      return [];
    }
    return [
      ...collectNestedModels(field.fields),
      { name: field.nestedModelName, fields: field.fields },
    ];
  });
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
    ...projectGeneratedField(field),
    propertyName: field.propertyName,
    ...(field.formControl ? { formControl: field.formControl } : {}),
    ...(field.fields ? { fields: field.fields.map(toDescriptorField) } : {}),
  };
}

function toModelType(
  field: GeneratedFieldDescriptor,
  children?: RenderedField[],
  nestedModelName?: string
): string {
  if (field.kind === FieldKind.Association) {
    let baseType: string;
    if (hasNestedModel(field) && children) {
      baseType = nestedModelName as string;
    } else {
      // Pointer properties are strings inside LDKit and { id } references in the public model.
      baseType = '{ id: string }';
    }
    return field.many ? `${baseType}[]` : baseType;
  }

  const mapping = datatypeMapping(field.datatype);
  return field.many && !mapping.multilingual ? `${mapping.tsType}[]` : mapping.tsType;
}

function usesMultilingualValue(field: RenderedField): boolean {
  return (
    field.formControl === 'multilingual' ||
    (hasNestedModel(field) && field.fields.some(usesMultilingualValue))
  );
}
