import type { ApplicationEdge } from '../graph/types.ts';
import type { GeneratedNavigationDescriptor, GeneratedOperationDescriptor } from './types.ts';

export function buildEdgeDescriptor(
  edge: ApplicationEdge,
  operationByNodeId: ReadonlyMap<string, GeneratedOperationDescriptor>
): GeneratedNavigationDescriptor {
  return {
    id: edge.id,
    sourceOperationId: requireOperation(operationByNodeId, edge.source).id,
    targetOperationId: requireOperation(operationByNodeId, edge.target).id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
  };
}

function requireOperation(
  operationByNodeId: ReadonlyMap<string, GeneratedOperationDescriptor>,
  nodeId: string
): GeneratedOperationDescriptor {
  const operation = operationByNodeId.get(nodeId);
  if (!operation) {
    throw new Error(`Missing operation descriptor for node "${nodeId}".`);
  }

  return operation;
}
