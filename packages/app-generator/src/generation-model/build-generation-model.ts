import { sortBy } from 'es-toolkit';

import { toKebabName, toPascalName, toRouteId } from '../utils/naming.ts';

import type { ApplicationEdge, ApplicationGraph, ApplicationNode } from '../graph/types.ts';
import { DatasourceType, DeletePolicy, EdgeType, Operation } from '../graph/types.ts';
import type {
  AggregateFieldMetadata,
  AggregateMetadata,
  SpecificationMetadata,
} from '../metadata/types.ts';
import type {
  GeneratedAggregateDescriptor,
  GeneratedDeleteDescriptor,
  GeneratedDetailDescriptor,
  GeneratedFieldDescriptor,
  GeneratedFormDescriptor,
  GeneratedListDescriptor,
  GeneratedOperationDescriptor,
  GeneratedRouteDescriptor,
  GenerationModel,
} from './types.ts';

export function buildGenerationModel(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata
): GenerationModel {
  const aggregateMap = new Map(metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const operationByNodeId = new Map<string, GeneratedOperationDescriptor>();
  const operations = sortBy(graph.nodes, [(node) => node.id]).map((node) => {
    const aggregate = requireAggregate(aggregateMap, node.aggregateIri);
    const operation = buildOperationDescriptor(node, aggregate);
    operationByNodeId.set(node.id, operation);
    return operation;
  });

  const routes = operations.map(buildRouteDescriptor);

  return {
    app: {
      name: graph.name,
      safeName: toKebabName(graph.name),
      dataSpecificationIri: graph.dataSpecificationIri,
    },
    datasource: {
      id: graph.datasources[0].id,
      type: DatasourceType.Rdf,
      endpoint: graph.datasources[0].endpoint,
    },
    aggregates: sortBy(metadata.aggregates, [(aggregate) => aggregate.iri]).map(
      buildAggregateDescriptor
    ),
    operations,
    routes,
    navigation: sortBy(
      graph.edges.filter((edge) => edge.type === EdgeType.Transition),
      [(edge) => edge.id]
    ).map((edge) => buildEdgeDescriptor(edge, operationByNodeId)),
    redirects: sortBy(
      graph.edges.filter((edge) => edge.type === EdgeType.Redirect),
      [(edge) => edge.id]
    ).map((edge) => buildEdgeDescriptor(edge, operationByNodeId)),
  };
}

function buildAggregateDescriptor(aggregate: AggregateMetadata): GeneratedAggregateDescriptor {
  return {
    iri: aggregate.iri,
    name: aggregate.name,
    safeName: toPascalName(aggregate.name),
    classIri: aggregate.classIri,
    fields: sortBy(aggregate.fields, [(field) => field.path]).map(buildFieldDescriptor),
  };
}

function buildOperationDescriptor(
  node: ApplicationNode,
  aggregate: AggregateMetadata
): GeneratedOperationDescriptor {
  const pageComponentName = `${toPascalName(node.id)}Page`;
  const descriptor: GeneratedOperationDescriptor = {
    id: node.id,
    nodeId: node.id,
    aggregateIri: aggregate.iri,
    aggregateName: aggregate.name,
    operation: node.operation,
    routeId: toRouteId(node.id),
    pageComponentName,
    pageTitle: getPageTitle(node, aggregate),
  };

  if (node.operation === Operation.ReadList) {
    descriptor.list = buildListDescriptor(aggregate.fields);
  }

  if (node.operation === Operation.ReadDetail) {
    descriptor.detail = buildDetailDescriptor(aggregate.fields);
  }

  if (node.operation === Operation.Create || node.operation === Operation.Update) {
    descriptor.form = buildFormDescriptor(aggregate.fields);
  }

  if (node.operation === Operation.Delete) {
    descriptor.delete = buildDeleteDescriptor(node);
  }

  return descriptor;
}

function buildRouteDescriptor(operation: GeneratedOperationDescriptor): GeneratedRouteDescriptor {
  const requiresEntityId =
    operation.operation === Operation.ReadDetail ||
    operation.operation === Operation.Update ||
    operation.operation === Operation.Delete;

  return {
    id: operation.routeId,
    nodeId: operation.nodeId,
    path: requiresEntityId ? `/${operation.routeId}/:id` : `/${operation.routeId}`,
    operationId: operation.id,
    pageComponentName: operation.pageComponentName,
  };
}

function buildEdgeDescriptor(
  edge: ApplicationEdge,
  operationByNodeId: Map<string, GeneratedOperationDescriptor>
) {
  return {
    id: edge.id,
    sourceOperationId: requireOperation(operationByNodeId, edge.source).id,
    targetOperationId: requireOperation(operationByNodeId, edge.target).id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
  };
}

function buildListDescriptor(fields: AggregateFieldMetadata[]): GeneratedListDescriptor {
  return {
    columns: sortBy(fields, [(field) => field.path]).map(buildFieldDescriptor),
  };
}

function buildDetailDescriptor(fields: AggregateFieldMetadata[]): GeneratedDetailDescriptor {
  return {
    fields: sortBy(fields, [(field) => field.path]).map(buildFieldDescriptor),
  };
}

function buildFormDescriptor(fields: AggregateFieldMetadata[]): GeneratedFormDescriptor {
  return {
    fields: sortBy(fields, [(field) => field.path]).map(buildFieldDescriptor),
    placeholder: true,
  };
}

function buildDeleteDescriptor(node: ApplicationNode): GeneratedDeleteDescriptor {
  const cascadePaths = Object.entries(node.config?.delete ?? {})
    .filter(([, value]) => value === DeletePolicy.Cascade)
    .map(([path]) => path)
    .sort((left, right) => left.localeCompare(right));

  return {
    cascadePaths,
    placeholder: true,
  };
}

function buildFieldDescriptor(field: AggregateFieldMetadata): GeneratedFieldDescriptor {
  return {
    path: field.path,
    label: field.label,
    kind: field.kind,
    ...(field.propertyIri ? { propertyIri: field.propertyIri } : {}),
    ...(field.datatype ? { datatype: field.datatype } : {}),
    many: field.many ?? false,
    required: field.required ?? false,
    ...(field.targetAggregateIri ? { targetAggregateIri: field.targetAggregateIri } : {}),
    ...(field.targetClassIri ? { targetClassIri: field.targetClassIri } : {}),
    ...(field.associationKind ? { associationKind: field.associationKind } : {}),
    ...(field.fields
      ? { fields: sortBy(field.fields, [(child) => child.path]).map(buildFieldDescriptor) }
      : {}),
  };
}

function getPageTitle(node: ApplicationNode, aggregate: AggregateMetadata): string {
  if (node.config?.pageTitle) {
    return node.config.pageTitle;
  }

  return `${operationLabel(node.operation)} ${aggregate.name}`;
}

function operationLabel(operation: ApplicationNode['operation']): string {
  switch (operation) {
    case Operation.ReadList:
      return 'List';
    case Operation.ReadDetail:
      return 'Detail';
    default:
      return operation;
  }
}

function requireAggregate(
  aggregateMap: Map<string, AggregateMetadata>,
  aggregateIri: string
): AggregateMetadata {
  const aggregate = aggregateMap.get(aggregateIri);
  if (!aggregate) {
    throw new Error(`Missing aggregate metadata for "${aggregateIri}".`);
  }

  return aggregate;
}

function requireOperation(
  operationByNodeId: Map<string, GeneratedOperationDescriptor>,
  nodeId: string
): GeneratedOperationDescriptor {
  const operation = operationByNodeId.get(nodeId);
  if (!operation) {
    throw new Error(`Missing operation descriptor for node "${nodeId}".`);
  }

  return operation;
}
