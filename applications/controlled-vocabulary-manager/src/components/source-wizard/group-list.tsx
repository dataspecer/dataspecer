import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { usePagedListing, type PageLoader } from "@/hooks/use-paged-listing"
import { selectName } from "@/lib/language"
import { pageCount } from "@/lib/paging"
import type { SourceGroup, VocabularySource } from "@/sources/types"
import { ListingView } from "./listing-view"
import { Paginator } from "./paginator"

interface GroupListProps {
  source: VocabularySource
  /** Zero-based number of the shown page. */
  page: number
  onPageChange: (page: number) => void
  onSelect: (group: SourceGroup) => void
}

/**
 * The groups of the vocabularies of the source, such as their publishers,
 * with the number of vocabularies in each, paged.
 */
export function GroupList({ source, page, onPageChange, onSelect }: GroupListProps) {
  const { t, i18n } = useTranslation()
  const load = useCallback<PageLoader<SourceGroup>>(
    (request, options) => source.listGroups
      ? source.listGroups(request, options)
      : Promise.resolve({ items: [], total: 0 }),
    [source],
  )
  const { state, retry } = usePagedListing(load, page)

  // A remembered page can be past the end when the listing has become shorter.
  const lastPage = state.status === "ready" ? pageCount(state.total) - 1 : null
  useEffect(() => {
    if (lastPage !== null && page > lastPage) {
      onPageChange(lastPage)
    }
  }, [lastPage, page, onPageChange])

  const total = state.status === "error" ? null : state.total
  return (
    <>
      <ListingView
        state={state}
        onRetry={retry}
        getKey={(group) => group.id}
        renderItem={(group) => (
          <button
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50"
            onClick={() => onSelect(group)}
          >
            <span className="font-medium">{selectName(group.label, i18n.language)}</span>
            <Badge variant="secondary">{t("search.count", { count: group.count })}</Badge>
          </button>
        )}
      />
      {total !== null && (
        <Paginator
          page={page}
          pageCount={pageCount(total)}
          onPageChange={onPageChange}
          disabled={state.status === "loading"}
        />
      )}
    </>
  )
}
