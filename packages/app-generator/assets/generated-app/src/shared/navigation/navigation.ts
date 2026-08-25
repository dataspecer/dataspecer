import type { OperationKind } from '../operations/operation-kind.ts';
import { referenceIdOf } from '../types/aggregate.ts';

export interface RoutableActionDescriptor {
  targetPath: string;
  requiresEntityId: boolean;
}

export interface NavigationActionDescriptor extends RoutableActionDescriptor {
  id: string;
  label: string;
  /** Target operation used to select the action's icon and emphasis. */
  operation: OperationKind;
  /** Title used to name the destination. */
  targetTitle: string;
}

export interface AssociationNavigationActionDescriptor extends RoutableActionDescriptor {
  id: string;
  fieldPath: string;
}

export interface OperationNavigationDescriptor {
  pageActions: readonly NavigationActionDescriptor[];
  rowActions: readonly NavigationActionDescriptor[];
  associationActions: readonly AssociationNavigationActionDescriptor[];
  successRedirect?: NavigationActionDescriptor;
  /** Destination used when a form is cancelled. */
  cancelTarget?: NavigationActionDescriptor;
}

/** Query parameter containing the current entity IRI. */
export const ENTITY_ID_PARAMETER = 'id';

/** Query parameter containing the selected composed-entity path. */
export const ENTITY_PATH_PARAMETER = 'at';

function toEntityPath(routePath: string, id: string): string {
  return `${routePath}?${new URLSearchParams({ [ENTITY_ID_PARAMETER]: id }).toString()}`;
}

export function hrefForAction(
  action: RoutableActionDescriptor | undefined,
  entityId?: string
): string | undefined {
  if (!action) {
    return undefined;
  }
  if (!action.requiresEntityId) {
    return action.targetPath;
  }
  return entityId ? toEntityPath(action.targetPath, entityId) : undefined;
}

/** Separates the list action used in breadcrumbs from the remaining page actions. */
export function partitionPageActions(actions: readonly NavigationActionDescriptor[]): {
  list?: NavigationActionDescriptor;
  rest: NavigationActionDescriptor[];
} {
  const list = actions.find((action) => action.operation === 'ReadList');
  return { list, rest: actions.filter((action) => action !== list) };
}

export function entityIdFromValue(value: unknown): string | undefined {
  return referenceIdOf(value);
}
