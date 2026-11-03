import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { usePagedListing, type PageLoader } from "@/hooks/use-paged-listing"
import { selectName } from "@/lib/language"
import { pageCount } from "@/lib/paging"
import type { CandidateFilter, SourceCandidate, VocabularySource } from "@/sources/types"
import { ListingView } from "./listing-view"
import { Paginator } from "./paginator"

interface CandidateListProps {
  source: VocabularySource
  filter: CandidateFilter
  /** Zero-based number of the shown page. */
  page: number
  onPageChange: (page: number) => void
  onSelect: (candidate: SourceCandidate) => void
}

/**
 * The vocabularies of the source that match the filter, paged.
 * The publisher is named in each row only when the vocabularies are not limited to one.
 */
export function CandidateList({ source, filter, page, onPageChange, onSelect }: CandidateListProps) {
  const { i18n } = useTranslation()
  const { groupId, query } = filter
  const load = useCallback<PageLoader<SourceCandidate>>(
    (request, options) => source.listCandidates({ groupId, query }, request, options),
    [source, groupId, query],
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
        getKey={(candidate) => candidate.id}
        renderItem={(candidate) => (
          <button className="w-full px-4 py-3 text-left hover:bg-muted/50" onClick={() => onSelect(candidate)}>
            <div className="font-medium">{selectName(candidate.title, i18n.language)}</div>
            {groupId === undefined && (
              <div className="text-caption text-muted-foreground">
                {selectName(candidate.groupLabel, i18n.language)}
              </div>
            )}
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
