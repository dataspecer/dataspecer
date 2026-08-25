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

  const operationById = new Map(operations.map((operation) => [operation.id, operation]));
  const transitionDescriptors = sortBy(
    graph.edges.filter((edge) => edge.type === EdgeType.Transition),
    [(edge) => edge.id]
  ).map((edge) => buildEdgeDescriptor(edge, operationByNodeId));
  const redirectDescriptors = sortBy(
    graph.edges.filter((edge) => edge.type === EdgeType.Redirect),
    [(edge) => edge.id]
  ).map((edge) => buildEdgeDescriptor(edge, operationByNodeId));

  for (const operation of operations) {
    operation.navigation = buildOperationNavigation(
      operation,
      transitionDescriptors,
      redirectDescriptors,
      operationById,
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
      // graph validation guarantees exactly one RDF datasource before this model is built
      id: graph.datasources[0].id,
      type: DatasourceType.Rdf,
      endpoint: graph.datasources[0].endpoint,
    },
    aggregates,
    operations,
    navigation: transitionDescriptors,
    redirects: redirectDescriptors,
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
