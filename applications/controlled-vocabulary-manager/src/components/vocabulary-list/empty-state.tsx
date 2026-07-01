import { BookOpen } from "lucide-react"
import { useTranslation } from "react-i18next"

export function EmptyState() {
  const { t } = useTranslation()

  return (
    <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
      <BookOpen className="mx-auto mb-2 h-7 w-7" />
      {t("list.empty.message")}
      <br />
      <span className="text-caption">{t("list.empty.hint")}</span>
    </div>
  )
}
