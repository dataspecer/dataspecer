import { Loader } from "lucide-react"
import { useTranslation } from "react-i18next"
import { selectName } from "@/lib/language"
import type { SourceCandidate } from "@/sources/types"
import { PagedList } from "./paged-list"

interface CandidateListProps {
  candidates: SourceCandidate[]
  /** Whether the group of each vocabulary is named in its row. */
  showGroup: boolean
  /** Zero-based number of the shown page. */
  page: number
  onPageChange: (page: number) => void
  onSelect: (candidate: SourceCandidate) => void
  /** The vocabulary that is being read, shown with a spinner. */
  readingId: string | null
}

/**
 * The vocabularies, paged.
 * The publisher is named in each row only when the vocabularies are not limited to one.
 */
export function CandidateList({ candidates, showGroup, page, onPageChange, onSelect, readingId }: CandidateListProps) {
  const { i18n } = useTranslation()
  return (
    <PagedList
      items={candidates}
      page={page}
      onPageChange={onPageChange}
      getKey={(candidate) => candidate.id}
      renderItem={(candidate) => (
        <button
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-muted/50"
          onClick={() => onSelect(candidate)}
        >
          <span>
            <span className="block font-medium">{selectName(candidate.title, i18n.language)}</span>
            {showGroup && (
              <span className="block text-caption text-muted-foreground">
                {selectName(candidate.groupLabel, i18n.language)}
              </span>
            )}
          </span>
          {candidate.id === readingId && <Loader className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </button>
      )}
    />
  )
}
