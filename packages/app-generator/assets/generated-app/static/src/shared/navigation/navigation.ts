import type { OperationKind } from '../operations/operation-kind.ts';

export interface RoutableActionDescriptor {
  targetPath: string;
  requiresEntityId: boolean;
}

export interface NavigationActionDescriptor extends RoutableActionDescriptor {
  id: string;
  label: string;
  /** Operation the action leads to, which decides its icon and emphasis. */
  operation: OperationKind;
  /** Title of the page the action leads to, for naming the destination in navigation. */
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
  /** Where a form goes when it is abandoned, used when the success redirect needs an id. */
  cancelTarget?: NavigationActionDescriptor;
}

/** Query parameter carrying the entity IRI of a route that needs one. */
export const ENTITY_ID_PARAMETER = 'id';

/** Query parameter carrying which composed entity a form is editing. */
export const ENTITY_PATH_PARAMETER = 'at';

export function toEntityPath(routePath: string, id: string): string {
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

/**
 * Splits the page actions into the one that goes back to the list, which belongs in the
 * breadcrumbs, and the rest, which belong in the action cluster.
 */
export function partitionPageActions(actions: readonly NavigationActionDescriptor[]): {
  list?: NavigationActionDescriptor;
  rest: NavigationActionDescriptor[];
} {
  const list = actions.find((action) => action.operation === 'ReadList');
  return { list, rest: actions.filter((action) => action !== list) };
}

export function entityIdFromValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}
