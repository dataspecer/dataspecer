/**
 * Number of items on a page of a listing of a source.
 */
export const PAGE_SIZE = 20

/**
 * The items of the page, which is zero-based. A page past the end is empty.
 */
export function pageItems<T>(items: T[], page: number, pageSize: number = PAGE_SIZE): T[] {
  return items.slice(page * pageSize, (page + 1) * pageSize)
}

/**
 * Number of pages needed for the items. An empty listing has one empty page.
 */
export function pageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
