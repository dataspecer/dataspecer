
/**
 * @param items Items to read value from.
 * @returns Null if the value is missing.
 */
export function createProfiledGetter<T extends { id: string }>(
  items: T[],
): (id: string | null) => T | null {
  // Prepare record of items so we can access them directly.
  const map: Record<string, T> = {};
  items.forEach(item => map[item.id] = item);
  // Retrieve item with given identifier or default.
  return (id) => {
    if (id === null) {
      return null;
    }
    return map[id] ?? null;
  };
}
