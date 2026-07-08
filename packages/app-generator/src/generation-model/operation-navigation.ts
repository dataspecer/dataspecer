import { Operation } from '../graph/types.ts';
import { FieldKind } from '../metadata/types.ts';
import type {
  GeneratedAggregateDescriptor,
  GeneratedAssociationNavigationActionDescriptor,
  GeneratedFieldDescriptor,
  GeneratedNavigationActionDescriptor,
  GeneratedNavigationDescriptor,
  GeneratedOperationDescriptor,
  GeneratedOperationNavigation,
  GeneratedRouteDescriptor,
} from './types.ts';

export function buildOperationNavigation(
  sourceOperation: GeneratedOperationDescriptor,
  transitions: readonly GeneratedNavigationDescriptor[],
  operationById: ReadonlyMap<string, GeneratedOperationDescriptor>,
  routeByOperationId: ReadonlyMap<string, GeneratedRouteDescriptor>,
  aggregateByIri: ReadonlyMap<string, GeneratedAggregateDescriptor>
): GeneratedOperationNavigation {
  const sourceAggregate = requireAggregate(aggregateByIri, sourceOperation.aggregateIri);
  const pageActions: GeneratedNavigationActionDescriptor[] = [];
  const rowActions: GeneratedNavigationActionDescriptor[] = [];
  const associationActions: GeneratedAssociationNavigationActionDescriptor[] = [];

  for (const transition of transitions) {
    if (transition.sourceOperationId !== sourceOperation.id) {
      continue;
    }

    const targetOperation = requireOperationById(operationById, transition.targetOperationId);
    const targetRoute = requireRoute(routeByOperationId, targetOperation.id);
    const targetAggregate = requireAggregate(aggregateByIri, targetOperation.aggregateIri);
    const action = buildNavigationAction(transition.id, targetOperation, targetRoute);

    if (sourceOperation.operation === Operation.ReadList) {
      if (targetOperation.operation === Operation.Create) {
        pageActions.push(action);
      } else if (
        targetOperation.operation === Operation.Update ||
        targetOperation.operation === Operation.Delete
      ) {
        rowActions.push(action);
      } else if (targetOperation.operation === Operation.ReadDetail) {
        if (sourceAggregate.classIri === targetAggregate.classIri) {
          rowActions.push(action);
        }
        associationActions.push(
          ...associationActionsFor(sourceAggregate.fields, targetAggregate.classIri, action, false)
        );
      }
    }

    if (sourceOperation.operation === Operation.ReadDetail) {
      if (
        targetOperation.operation === Operation.ReadList ||
        targetOperation.operation === Operation.Update ||
        targetOperation.operation === Operation.Delete
      ) {
        pageActions.push(action);
      } else if (targetOperation.operation === Operation.ReadDetail) {
        associationActions.push(
          ...associationActionsFor(sourceAggregate.fields, targetAggregate.classIri, action, true)
        );
      }
    }
  }

  const successRedirect = buildSuccessRedirect(
    sourceOperation,
    sourceAggregate,
    operationById,
    routeByOperationId,
    aggregateByIri
  );

  return {
    pageActions,
    rowActions,
    associationActions,
    ...(successRedirect ? { successRedirect } : {}),
  };
}

// A write form returns to its class's list once it succeeds. The list is matched by class rather
// than by aggregate IRI, because a list projection and a detail structure are distinct aggregates
// of the same class, and matched without a graph edge so a Create or Update page always has a
// destination.
function buildSuccessRedirect(
  sourceOperation: GeneratedOperationDescriptor,
  sourceAggregate: GeneratedAggregateDescriptor,
  operationById: ReadonlyMap<string, GeneratedOperationDescriptor>,
  routeByOperationId: ReadonlyMap<string, GeneratedRouteDescriptor>,
  aggregateByIri: ReadonlyMap<string, GeneratedAggregateDescriptor>
): GeneratedNavigationActionDescriptor | undefined {
  if (
    sourceOperation.operation !== Operation.Create &&
    sourceOperation.operation !== Operation.Update &&
    sourceOperation.operation !== Operation.Delete
  ) {
    return undefined;
  }

  const listOperation = [...operationById.values()].find(
    (candidate) =>
      candidate.operation === Operation.ReadList &&
      aggregateByIri.get(candidate.aggregateIri)?.classIri === sourceAggregate.classIri
  );
  const listRoute = listOperation && routeByOperationId.get(listOperation.id);
  if (!listOperation || !listRoute) {
    return undefined;
  }

  return {
    id: `${sourceOperation.id}:success:${listOperation.id}`,
    label: 'Back to list',
    targetPath: listRoute.path,
    requiresEntityId: listRoute.requiresEntityId,
  };
}

function buildNavigationAction(
  id: string,
  targetOperation: GeneratedOperationDescriptor,
  targetRoute: GeneratedRouteDescriptor
): GeneratedNavigationActionDescriptor {
  return {
    id,
    label: operationActionLabel(targetOperation.operation),
    targetPath: targetRoute.path,
    requiresEntityId: targetRoute.requiresEntityId,
  };
}

function associationActionsFor(
  fields: readonly GeneratedFieldDescriptor[],
  targetClassIri: string,
  action: GeneratedNavigationActionDescriptor,
  recursive: boolean,
  pathPrefix = ''
): GeneratedAssociationNavigationActionDescriptor[] {
  return fields.flatMap((field) => {
    const fieldPath = pathPrefix ? `${pathPrefix}.${field.path}` : field.path;
    const nested =
      recursive && field.fields
        ? associationActionsFor(field.fields, targetClassIri, action, recursive, fieldPath)
        : [];
    if (field.kind === FieldKind.Association && field.targetClassIri === targetClassIri) {
      return [
        {
          id: `${action.id}:${fieldPath}`,
          fieldPath,
          targetPath: action.targetPath,
          requiresEntityId: action.requiresEntityId,
        },
        ...nested,
      ];
    }
    return nested;
  });
}

function operationActionLabel(operation: Operation): string {
  switch (operation) {
    case Operation.Create:
      return 'Create';
    case Operation.ReadDetail:
      return 'Detail';
    case Operation.ReadList:
      return 'List';
    case Operation.Update:
      return 'Edit';
    case Operation.Delete:
      return 'Delete';
    default:
      throw new Error(`Unsupported operation "${String(operation)}".`);
  }
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

function requireOperationById(
  operationById: ReadonlyMap<string, GeneratedOperationDescriptor>,
  operationId: string
): GeneratedOperationDescriptor {
  const operation = operationById.get(operationId);
  if (!operation) {
    throw new Error(`Missing operation descriptor for id "${operationId}".`);
  }

  return operation;
}

function requireRoute(
  routeByOperationId: ReadonlyMap<string, GeneratedRouteDescriptor>,
  operationId: string
): GeneratedRouteDescriptor {
  const route = routeByOperationId.get(operationId);
  if (!route) {
    throw new Error(`Missing route descriptor for operation "${operationId}".`);
  }

  return route;
}
