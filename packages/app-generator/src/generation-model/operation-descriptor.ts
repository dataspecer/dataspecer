import type { ApplicationNode } from '../graph/types.ts';
import { DeletePolicy, Operation } from '../graph/types.ts';
import type {
  GeneratedAggregateDescriptor,
  GeneratedDeleteDescriptor,
  GeneratedOperationDescriptor,
} from './types.ts';

import { toPageComponentName, toRouteId } from '../utils/naming.ts';

export function buildOperationDescriptor(
  node: ApplicationNode,
  aggregate: GeneratedAggregateDescriptor
): GeneratedOperationDescriptor {
  const pageComponentName = toPageComponentName(node.id);
  const descriptor: GeneratedOperationDescriptor = {
    id: node.id,
    nodeId: node.id,
    aggregateIri: aggregate.iri,
    aggregateName: aggregate.name,
    operation: node.operation,
    routeId: toRouteId(node.id),
    pageComponentName,
    pageTitle: getPageTitle(node, aggregate),
    navigation: {
      pageActions: [],
      rowActions: [],
      associationActions: [],
    },
  };

  if (node.operation === Operation.Delete) {
    descriptor.delete = buildDeleteDescriptor(node);
  }

  return descriptor;
}

function buildDeleteDescriptor(node: ApplicationNode): GeneratedDeleteDescriptor {
  const cascadePaths = Object.entries(node.config?.delete ?? {})
    .filter(([, value]) => value === DeletePolicy.Cascade)
    .map(([path]) => path)
    .sort((left, right) => left.localeCompare(right));

  return {
    cascadePaths,
  };
}

function getPageTitle(node: ApplicationNode, aggregate: GeneratedAggregateDescriptor): string {
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
