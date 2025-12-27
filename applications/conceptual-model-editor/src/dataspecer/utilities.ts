
/**
 * Find and return item with given identifier.
 */
export function findByIdentifier<T extends { identifier: string }>(
  identifier: string,
  items: T[],
): T | null {
  return items.find(item => item.identifier === identifier) ?? null;
}
