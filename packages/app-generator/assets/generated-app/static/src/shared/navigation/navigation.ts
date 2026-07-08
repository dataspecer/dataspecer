interface RoutableActionDescriptor {
  targetPath: string;
  requiresEntityId: boolean;
}

export interface NavigationActionDescriptor extends RoutableActionDescriptor {
  id: string;
  label: string;
}

export interface AssociationNavigationActionDescriptor extends RoutableActionDescriptor {
  id: string;
  fieldPath: string;
}

export function toEntityPath(routePath: string, id: string): string {
  return `${routePath}?${new URLSearchParams({ id }).toString()}`;
}

export function hrefForAction(
  action: RoutableActionDescriptor,
  entityId?: string
): string | undefined {
  if (!action.requiresEntityId) {
    return action.targetPath;
  }
  return entityId ? toEntityPath(action.targetPath, entityId) : undefined;
}

export function readRouteEntityId(search: string): string {
  return new URLSearchParams(search).get('id') ?? '';
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
