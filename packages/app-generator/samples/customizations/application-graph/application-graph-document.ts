import type { DataSource } from '@/shared/data-source/data-source.ts';
import { DataSourceAggregateDescriptor } from '@/modules/data-source/descriptor.ts';
import type { DataSourceModel } from '@/modules/data-source/model.ts';
import type { ApplicationGraphModel, ApplicationGraphNodesConfigModel } from './model.ts';

enum Operation {
  Create = 'Create',
  ReadList = 'ReadList',
  ReadDetail = 'ReadDetail',
  Update = 'Update',
  Delete = 'Delete',
}

enum EdgeType {
  Transition = 'transition',
  Redirect = 'redirect',
}

enum DatasourceType {
  Rdf = 'rdf',
}

enum AssociationKind {
  Composition = 'composition',
  Aggregation = 'aggregation',
}

enum DeletePolicy {
  Cascade = 'cascade',
}

interface ApplicationGraphDocument {
  name: string;
  dataSpecificationIri: string;
  datasources: Array<{ id: string; type: DatasourceType; endpoint: string }>;
  nodes: Array<{
    id: string;
    aggregateIri: string;
    operation: Operation;
    config?: {
      pageTitle?: string;
      associations?: Record<string, AssociationKind>;
      delete?: Record<string, DeletePolicy>;
    };
  }>;
  edges: Array<{ id: string; source: string; target: string; type: EdgeType }>;
}

export async function buildApplicationGraphDocument(
  item: ApplicationGraphModel,
  dataSource: DataSource,
): Promise<ApplicationGraphDocument> {
  const dataSourceEntity = await dataSource.readDetail<DataSourceModel>({
    aggregate: DataSourceAggregateDescriptor,
    id: item.datasources.id,
  });
  if (dataSourceEntity === null) {
    throw new Error("The graph's data source no longer exists.");
  }

  return {
    name: requiredString(item.name, 'Graph name'),
    dataSpecificationIri: requiredString(
      item.dataSpecificationIri,
      'Data specification identifier',
    ),
    datasources: [
      {
        id: requiredString(dataSourceEntity.identifier, 'Data source identifier'),
        type: referenceCode(
          dataSourceEntity.type,
          Object.values(DatasourceType),
          'Data source type',
        ),
        endpoint: requiredString(dataSourceEntity.endpoint, 'Data source endpoint'),
      },
    ],
    nodes: (item.nodes ?? []).map((node) => {
      const config = node.config ? buildNodeConfig(node.config) : undefined;
      return {
        id: requiredString(node.identifier, 'Node identifier'),
        aggregateIri: requiredString(node.aggregateIri, 'Node data structure'),
        operation: referenceCode(node.operation, Object.values(Operation), 'Node operation'),
        ...(config ? { config } : {}),
      };
    }),
    edges: (item.edges ?? []).map((edge) => ({
      id: requiredString(edge.identifier, 'Edge identifier'),
      source: requiredReferenceField(edge.source, 'identifier', 'Edge source'),
      target: requiredReferenceField(edge.target, 'identifier', 'Edge target'),
      type: referenceCode(edge.type, Object.values(EdgeType), 'Edge type'),
    })),
  };
}

function buildNodeConfig(
  config: ApplicationGraphNodesConfigModel,
): ApplicationGraphDocument['nodes'][number]['config'] | undefined {
  const associations = Object.fromEntries(
    (config.associations ?? []).map((setting) => [
      requiredString(setting.propertyPath, 'Association property path'),
      referenceCode(setting.kind, Object.values(AssociationKind), 'Association kind'),
    ]),
  );
  const deleteRules = Object.fromEntries(
    (config.deleteRules ?? []).map((setting) => [
      requiredString(setting.propertyPath, 'Delete property path'),
      referenceCode(setting.policy, Object.values(DeletePolicy), 'Delete policy'),
    ]),
  );
  const result = {
    ...(config.pageTitle ? { pageTitle: config.pageTitle } : {}),
    ...(Object.keys(associations).length > 0 ? { associations } : {}),
    ...(Object.keys(deleteRules).length > 0 ? { delete: deleteRules } : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
}

type EntityReference = { id: string; code?: string; identifier?: string };

function referenceCode<TValue extends string>(
  reference: EntityReference,
  values: readonly TValue[],
  label: string,
): TValue {
  const value = requiredReferenceField(reference, 'code', label);
  const match = values.find((candidate) => candidate === value);
  if (match === undefined) {
    throw new Error(`${label} has unsupported value "${value}".`);
  }
  return match;
}

function requiredReferenceField(
  reference: EntityReference,
  property: 'code' | 'identifier',
  label: string,
): string {
  const value = reference[property];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} details are unavailable. The referenced entity may be missing.`);
  }
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is missing.`);
  }
  return value;
}
