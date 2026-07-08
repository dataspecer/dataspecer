import { sortBy } from 'es-toolkit';

import type { ApplicationGraph } from '../graph/types.ts';
import { DatasourceType, EdgeType } from '../graph/types.ts';
import type { SpecificationMetadata } from '../metadata/types.ts';
import type {
  GeneratedAggregateDescriptor,
  GeneratedOperationDescriptor,
  GenerationModel,
} from './types.ts';

import { toAppName } from '../utils/naming.ts';
import { buildAggregateDescriptor } from './aggregate-descriptor.ts';
import { buildEdgeDescriptor } from './edge-descriptor.ts';
import { buildOperationDescriptor } from './operation-descriptor.ts';
import { buildOperationNavigation } from './operation-navigation.ts';
import { buildRouteDescriptor } from './route-descriptor.ts';

export function buildGenerationModel(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata
): GenerationModel {
  const aggregates = sortBy(metadata.aggregates, [(aggregate) => aggregate.iri]).map(
    buildAggregateDescriptor
  );
  const aggregateByIri = new Map(aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const operationByNodeId = new Map<string, GeneratedOperationDescriptor>();
  const operations = sortBy(graph.nodes, [(node) => node.id]).map((node) => {
    const aggregate = requireAggregate(aggregateByIri, node.aggregateIri);
    const operation = buildOperationDescriptor(node, aggregate);
    operationByNodeId.set(node.id, operation);
    return operation;
  });

  const routes = operations.map(buildRouteDescriptor);
  const routeByOperationId = new Map(routes.map((route) => [route.operationId, route]));
  const operationById = new Map(operations.map((operation) => [operation.id, operation]));
  const transitionDescriptors = sortBy(
    graph.edges.filter((edge) => edge.type === EdgeType.Transition),
    [(edge) => edge.id]
  ).map((edge) => buildEdgeDescriptor(edge, operationByNodeId));

  for (const operation of operations) {
    operation.navigation = buildOperationNavigation(
      operation,
      transitionDescriptors,
      operationById,
      routeByOperationId,
      aggregateByIri
    );
  }

  return {
    app: {
      name: graph.name,
      safeName: toAppName(graph.name),
      dataSpecificationIri: graph.dataSpecificationIri,
    },
    datasource: {
      id: graph.datasources[0].id,
      type: DatasourceType.Rdf,
      endpoint: graph.datasources[0].endpoint,
    },
    aggregates,
    operations,
    routes,
    navigation: transitionDescriptors,
    redirects: sortBy(
      graph.edges.filter((edge) => edge.type === EdgeType.Redirect),
      [(edge) => edge.id]
    ).map((edge) => buildEdgeDescriptor(edge, operationByNodeId)),
  };
}

function requireAggregate(
  aggregateByIri: ReadonlyMap<string, GeneratedAggregateDescriptor>,
  aggregateIri: string
): GeneratedAggregateDescriptor {
  const aggregate = aggregateByIri.get(aggregateIri);
  if (!aggregate) {
    throw new Error(`Missing aggregate metadata for "${aggregateIri}".`);
  }

  return aggregate;
}
