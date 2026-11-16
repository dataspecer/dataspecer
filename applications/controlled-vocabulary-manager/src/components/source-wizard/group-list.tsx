import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { selectName } from "@/lib/language"
import type { SourceGroup } from "@/sources/types"
import { PagedList } from "./paged-list"

interface GroupListProps {
  groups: SourceGroup[]
  /** Zero-based number of the shown page. */
  page: number
  onPageChange: (page: number) => void
  onSelect: (group: SourceGroup) => void
}

/**
 * The groups of the vocabularies of the source, such as their publishers,
 * with the number of vocabularies in each, paged.
 */
export function GroupList({ groups, page, onPageChange, onSelect }: GroupListProps) {
  const { t, i18n } = useTranslation()
  return (
    <PagedList
      items={groups}
      page={page}
      onPageChange={onPageChange}
      getKey={(group) => group.id}
      renderItem={(group) => (
        <button
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50"
          onClick={() => onSelect(group)}
        >
          <span className="font-medium">{selectName(group.label, i18n.language)}</span>
          <span className="flex items-center gap-3">
            <Badge variant="secondary">{t("search.count", { count: group.count })}</Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </span>
        </button>
      )}
    />
  )
}
