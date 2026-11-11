import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

interface PaginatorProps {
  /** Zero-based number of the shown page. */
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

/**
 * Buttons for moving between the pages of a listing. It is hidden when the
 * listing has a single page.
 */
export function Paginator({ page, pageCount, onPageChange }: PaginatorProps) {
  const { t } = useTranslation()

  if (pageCount <= 1) {
    return null
  }
  return (
    <div className="mt-3 flex items-center justify-end gap-3">
      <span className="text-caption text-muted-foreground">
        {t("paginator.page", { page: page + 1, pages: pageCount })}
      </span>
      <Button
        variant="outline"
        size="xsm"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="mr-1 h-3.5 w-3.5" />
        {t("paginator.previous")}
      </Button>
      <Button
        variant="outline"
        size="xsm"
        disabled={page >= pageCount - 1}
        onClick={() => onPageChange(page + 1)}
      >
        {t("paginator.next")}
        <ChevronRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
