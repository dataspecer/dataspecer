import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { pageCount, pageItems } from "@/lib/paging"
import { Paginator } from "./paginator"

interface PagedListProps<T> {
  /** All the items of the list, of which one page is shown. */
  items: T[]
  /** Zero-based number of the shown page. A page past the end is shown as the last one. */
  page: number
  onPageChange: (page: number) => void
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
}

/**
 * One page of a list, with the buttons for moving between the pages, or a note that the list is empty.
 */
export function PagedList<T>({ items, page, onPageChange, getKey, renderItem }: PagedListProps<T>) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
        {t("search.empty")}
      </div>
    )
  }
  const pages = pageCount(items.length)
  const shown = Math.min(page, pages - 1)
  return (
    <>
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {pageItems(items, shown).map((item) => (
          <div key={getKey(item)}>{renderItem(item)}</div>
        ))}
      </div>
      <Paginator page={shown} pageCount={pages} onPageChange={onPageChange} />
    </>
  )
}
