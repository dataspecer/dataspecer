import type {
  GeneratedAggregateDescriptor,
  GeneratedFieldDescriptor,
  GeneratedOperationDescriptor,
  GenerationModel,
} from '../generation-model/types.ts';

import { toKebabName, toPropertyName } from '../utils/naming.ts';
import { FieldKind } from '../metadata/types.ts';

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
}

export interface RenderedField extends GeneratedFieldDescriptor {
  propertyName: string;
  modelType: string;
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
    return {
      ...aggregate,
      moduleName: toKebabName(aggregate.name),
      descriptorName: `${aggregate.safeName}AggregateDescriptor`,
      modelName: `${aggregate.safeName}Model`,
      schemaName: `${aggregate.safeName}LdkitSchema`,
      fields,
      descriptorFields: fields.map(toDescriptorField),
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
        operationClassName: `${operation.pageComponentName.replace(/Page$/, '')}Operation`,
        operation,
      };
    }),
    json: (value) => JSON.stringify(value, null, 2),
  };
}

function toRenderedField(field: GeneratedFieldDescriptor): RenderedField {
  const children = field.fields?.map(toRenderedField);
  return {
    ...field,
    fields: children,
    propertyName: toPropertyName(field.path),
    modelType: toModelType(field, children),
    emptyValue: toEmptyValue(field, children),
  };
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
    ...(field.fields ? { fields: field.fields.map(toDescriptorField) } : {}),
  };
}

function toModelType(field: GeneratedFieldDescriptor, children?: RenderedField[]): string {
  let baseType: string;
  if (field.kind === FieldKind.Association) {
    baseType = children?.length
      ? `{ id?: string; ${children
          .map((child) => `${child.propertyName}${child.required ? '' : '?'}: ${child.modelType}`)
          .join('; ')} }`
      : 'string';
  } else {
    baseType = primitiveDatatypeToType(field.datatype);
  }
  return field.many ? `${baseType}[]` : baseType;
}

function toEmptyValue(field: GeneratedFieldDescriptor, children?: RenderedField[]): string {
  if (field.many) {
    return '[]';
  }
  if (field.kind === FieldKind.Association) {
    if (!children?.length) {
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
  switch (primitiveDatatypeToType(field.datatype)) {
    case 'number':
      return '0';
    case 'boolean':
      return 'false';
    default:
      return '""';
  }
}

function primitiveDatatypeToType(datatype: string | undefined): string {
  switch (localDatatypeName(datatype)) {
    case 'integer':
    case 'int':
    case 'long':
    case 'decimal':
    case 'float':
    case 'double':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'string':
    default:
      return 'string';
  }
}

function localDatatypeName(datatype: string | undefined): string | undefined {
  if (!datatype) {
    return undefined;
  }
  const separatorIndex = Math.max(datatype.lastIndexOf('#'), datatype.lastIndexOf('/'));
  return separatorIndex >= 0 ? datatype.slice(separatorIndex + 1) : datatype;
}
