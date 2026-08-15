import { Operation } from '../graph/types.ts';
import { FieldKind } from '../metadata/types.ts';
import { sortBy } from 'es-toolkit';

import type {
  GeneratedAggregateDescriptor,
  GeneratedAssociationNavigationActionDescriptor,
  GeneratedFieldDescriptor,
  GeneratedNavigationActionDescriptor,
  GeneratedNavigationDescriptor,
  GeneratedOperationDescriptor,
  GeneratedOperationNavigation,
  GeneratedRedirectDescriptor,
  GeneratedRouteDescriptor,
} from './types.ts';

export function buildOperationNavigation(
  sourceOperation: GeneratedOperationDescriptor,
  transitions: readonly GeneratedNavigationDescriptor[],
  redirects: readonly GeneratedRedirectDescriptor[],
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
          ...associationActionsFor(sourceAggregate.fields, targetAggregate, action, false)
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
          ...associationActionsFor(sourceAggregate.fields, targetAggregate, action, true)
        );
      }
    }
  }

  const successRedirect = buildSuccessRedirect(
    sourceOperation,
    sourceAggregate,
    redirects,
    operationById,
    routeByOperationId,
    aggregateByIri
  );

  return {
    pageActions: byOperation(pageActions),
    rowActions: byOperation(rowActions),
    associationActions,
    ...(successRedirect ? { successRedirect } : {}),
  };
}

function buildSuccessRedirect(
  sourceOperation: GeneratedOperationDescriptor,
  sourceAggregate: GeneratedAggregateDescriptor,
  redirects: readonly GeneratedRedirectDescriptor[],
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

  const configured = redirects.find(
    (redirect) => redirect.sourceOperationId === sourceOperation.id
  );
  if (configured) {
    const targetOperation = requireOperationById(operationById, configured.targetOperationId);
    const targetRoute = requireRoute(routeByOperationId, targetOperation.id);
    return buildNavigationAction(configured.id, targetOperation, targetRoute);
  }

  // if not configured, fallback redirect to list
  const listOperation = operationById
    .values()
    .find(
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
    operation: listOperation.operation,
    targetTitle: listOperation.pageTitle,
    targetPath: listRoute.path,
    requiresEntityId: listRoute.requiresEntityId,
  };
}

const ACTION_ORDER: readonly Operation[] = [
  Operation.ReadList,
  Operation.ReadDetail,
  Operation.Create,
  Operation.Update,
  Operation.Delete,
];

function byOperation(
  actions: GeneratedNavigationActionDescriptor[]
): GeneratedNavigationActionDescriptor[] {
  return sortBy(actions, [
    (action) => ACTION_ORDER.indexOf(action.operation),
    (action) => action.id,
  ]);
}

function buildNavigationAction(
  id: string,
  targetOperation: GeneratedOperationDescriptor,
  targetRoute: GeneratedRouteDescriptor
): GeneratedNavigationActionDescriptor {
  return {
    id,
    label: operationActionLabel(targetOperation.operation),
    operation: targetOperation.operation,
    targetTitle: targetOperation.pageTitle,
    targetPath: targetRoute.path,
    requiresEntityId: targetRoute.requiresEntityId,
  };
}

function associationActionsFor(
  fields: readonly GeneratedFieldDescriptor[],
  targetAggregate: GeneratedAggregateDescriptor,
  action: GeneratedNavigationActionDescriptor,
  recursive: boolean,
  pathPrefix = ''
): GeneratedAssociationNavigationActionDescriptor[] {
  return fields.flatMap((field) => {
    const fieldPath = pathPrefix ? `${pathPrefix}.${field.path}` : field.path;
    const nested =
      recursive && field.fields
        ? associationActionsFor(field.fields, targetAggregate, action, recursive, fieldPath)
        : [];
    if (
      field.kind === FieldKind.Association &&
      (field.targetAggregateIri === targetAggregate.iri ||
        field.targetClassIri === targetAggregate.classIri)
    ) {
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
