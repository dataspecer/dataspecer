
export function createProfiledGetter<T extends { id: string }>(
  items: T[],
  defaultItem: T
): (id: string | null) => T | null {
  const map: Record<string, T> = {};
  items.forEach(item => map[item.id] = item);
  return (id: string | null) => map[id ?? ""] ?? defaultItem ?? null;
}
