/**
 * Number of items on a page of a listing of a source.
 */
export const PAGE_SIZE = 20

/**
 * Number of pages needed for the items. An empty listing has one empty page.
 */
export function pageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
