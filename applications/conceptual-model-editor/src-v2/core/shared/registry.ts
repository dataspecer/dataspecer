
/**
 * @returns A general registry object.
 */
export function createRegistry<ItemType extends { id: string }>()
  : Registry<ItemType> {

  const list: Record<string, ItemType> = {};

  return {
    list() {
      return Object.values(list);
    },
    get(identifier) {
      return list[identifier] ?? null;
    },
    register(value) {
      list[value.id] = value;
    },
  }
}

/**
 * A general registry interface.
 */
export interface Registry<ItemType extends { id: string }> {

  list(): ItemType[];

  get(identifier: string): ItemType | null;

  register(value: ItemType): void;

}
