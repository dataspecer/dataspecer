import { sortBy } from 'es-toolkit';

import { Operation } from '../graph/types.ts';
import { FieldKind } from '../metadata/types.ts';
import { joinFieldPath } from '../utils/field-path.ts';

import { hasNestedModel } from '../metadata/field-shape.ts';
import type {
  GeneratedAggregateDescriptor,
  GeneratedAssociationNavigationActionDescriptor,
  GeneratedFieldDescriptor,
  GeneratedNavigationActionDescriptor,
  GeneratedNavigationDescriptor,
  GeneratedOperationDescriptor,
  GeneratedOperationNavigation,
  GeneratedRedirectDescriptor,
} from './types.ts';

export function buildOperationNavigation(
  sourceOperation: GeneratedOperationDescriptor,
  transitions: readonly GeneratedNavigationDescriptor[],
  redirects: readonly GeneratedRedirectDescriptor[],
  operationById: ReadonlyMap<string, GeneratedOperationDescriptor>,
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
    const targetAggregate = requireAggregate(aggregateByIri, targetOperation.aggregateIri);
    const action = buildNavigationAction(transition.id, targetOperation);

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
    aggregateByIri
  );

  const cancelTarget = isWriteOperation(sourceOperation.operation)
    ? listAction(`${sourceOperation.id}:cancel`, sourceAggregate, operationById, aggregateByIri)
    : undefined;

  return {
    pageActions: byOperation(pageActions),
    rowActions: byOperation(rowActions),
    associationActions,
    ...(successRedirect ? { successRedirect } : {}),
    ...(cancelTarget ? { cancelTarget } : {}),
  };
}

function buildSuccessRedirect(
  sourceOperation: GeneratedOperationDescriptor,
  sourceAggregate: GeneratedAggregateDescriptor,
  redirects: readonly GeneratedRedirectDescriptor[],
  operationById: ReadonlyMap<string, GeneratedOperationDescriptor>,
  aggregateByIri: ReadonlyMap<string, GeneratedAggregateDescriptor>
): GeneratedNavigationActionDescriptor | undefined {
  if (!isWriteOperation(sourceOperation.operation)) {
    return undefined;
  }

  const configured = redirects.find(
    (redirect) => redirect.sourceOperationId === sourceOperation.id
  );
  if (configured) {
    const targetOperation = requireOperationById(operationById, configured.targetOperationId);
    return buildNavigationAction(configured.id, targetOperation);
  }

  // without an explicit redirect, return to any list that presents the same RDF class
  return listAction(
    `${sourceOperation.id}:success`,
    sourceAggregate,
    operationById,
    aggregateByIri
  );
}

function listAction(
  idPrefix: string,
  sourceAggregate: GeneratedAggregateDescriptor,
  operationById: ReadonlyMap<string, GeneratedOperationDescriptor>,
  aggregateByIri: ReadonlyMap<string, GeneratedAggregateDescriptor>
): GeneratedNavigationActionDescriptor | undefined {
  const listOperation = operationById
    .values()
    .find(
      (candidate) =>
        candidate.operation === Operation.ReadList &&
        aggregateByIri.get(candidate.aggregateIri)?.classIri === sourceAggregate.classIri
    );
  if (!listOperation) {
    return undefined;
  }

  return {
    id: `${idPrefix}:${listOperation.id}`,
    label: 'Back to list',
    operation: listOperation.operation,
    targetTitle: listOperation.pageTitle,
    targetPath: listOperation.path,
    requiresEntityId: listOperation.requiresEntityId,
  };
}

function isWriteOperation(operation: Operation): boolean {
  return (
    operation === Operation.Create ||
    operation === Operation.Update ||
    operation === Operation.Delete
  );
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
  targetOperation: GeneratedOperationDescriptor
): GeneratedNavigationActionDescriptor {
  return {
    id,
    label: operationActionLabel(targetOperation.operation),
    operation: targetOperation.operation,
    targetTitle: targetOperation.pageTitle,
    targetPath: targetOperation.path,
    requiresEntityId: targetOperation.requiresEntityId,
  };
}

function associationActionsFor(
  fields: readonly GeneratedFieldDescriptor[],
  targetAggregate: GeneratedAggregateDescriptor,
  action: GeneratedNavigationActionDescriptor,
  recursive: boolean,
  pathPrefix = ''
): GeneratedAssociationNavigationActionDescriptor[] {
  // detail reads contain inline compositions, while list rows contain only root fields
  return fields.flatMap((field) => {
    const fieldPath = joinFieldPath(pathPrefix, field.path);
    const nested =
      recursive && hasNestedModel(field)
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
