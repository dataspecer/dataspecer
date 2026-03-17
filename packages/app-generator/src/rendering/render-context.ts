import type {
  GeneratedAggregateDescriptor,
  GeneratedFieldDescriptor,
  GeneratedOperationDescriptor,
  GenerationModel,
} from '../generation-model/types.ts';
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
}

export interface RenderedField extends GeneratedFieldDescriptor {
  propertyName: string;
  modelType: string;
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
  const aggregates = model.aggregates.map((aggregate) => ({
    ...aggregate,
    moduleName: toKebabCase(aggregate.name),
    descriptorName: `${aggregate.safeName}AggregateDescriptor`,
    modelName: `${aggregate.safeName}Model`,
    schemaName: `${aggregate.safeName}LdkitSchema`,
    fields: aggregate.fields.map((field) => {
      const renderedField = {
        ...field,
        many: field.many ?? false,
        required: field.required ?? false,
      };
      return {
        ...renderedField,
        propertyName: toPropertyName(field.path),
        modelType: toModelType(renderedField),
      };
    }),
  }));
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

function toModelType(field: GeneratedFieldDescriptor): string {
  const baseType =
    field.kind === FieldKind.Association ? 'string' : primitiveDatatypeToType(field.datatype);
  return field.many ? `${baseType}[]` : baseType;
}

function primitiveDatatypeToType(datatype: string | undefined): string {
  switch (datatype) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'string':
    default:
      return 'string';
  }
}

function toPropertyName(path: string): string {
  const parts = path.split(/[^a-zA-Z0-9_$]+/).filter(Boolean);
  const [first = 'value', ...rest] = parts;
  return [first, ...rest.map(capitalize)].join('');
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
