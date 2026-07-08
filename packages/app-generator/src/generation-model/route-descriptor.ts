import { Operation } from '../graph/types.ts';
import type { GeneratedOperationDescriptor, GeneratedRouteDescriptor } from './types.ts';

export function buildRouteDescriptor(
  operation: GeneratedOperationDescriptor
): GeneratedRouteDescriptor {
  const requiresEntityId =
    operation.operation === Operation.ReadDetail ||
    operation.operation === Operation.Update ||
    operation.operation === Operation.Delete;

  return {
    id: operation.routeId,
    nodeId: operation.nodeId,
    path: `/${operation.routeId}`,
    operationId: operation.id,
    pageComponentName: operation.pageComponentName,
    requiresEntityId,
  };
}
