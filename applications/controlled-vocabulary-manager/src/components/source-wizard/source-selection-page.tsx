import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConfig } from "@/contexts/config-context"
import { selectName } from "@/lib/language"
import { cn } from "@/lib/utils"
import { sourceDescriptors } from "@/sources/registry"

interface SourceSelectionPageProps {
  /** The source chosen earlier, selected again when the user returns to this page. */
  initialSourceId: string | null
  onCancel: () => void
  onContinue: (sourceId: string) => void
}

export function SourceSelectionPage({ initialSourceId, onCancel, onContinue }: SourceSelectionPageProps) {
  const { t, i18n } = useTranslation()
  const { managerUrl } = useConfig()
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSourceId ?? sourceDescriptors.find((source) => source.available)?.id ?? null,
  )

  return (
    <>
      <Breadcrumb
        items={[
          { label: t("breadcrumb.packageManager"), href: managerUrl },
          { label: t("breadcrumb.controlledVocabularies") },
          { label: t("breadcrumb.addFromSource") },
        ]}
        onItemClick={onCancel}
      />
      <h1 className="text-page-title font-semibold mb-6">{t("sourceSelection.title")}</h1>
      <div className="space-y-2">
        {sourceDescriptors.map((source) => {
          const selected = source.id === selectedId
          return (
            <button
              key={source.id}
              type="button"
              disabled={!source.available}
              aria-pressed={selected}
              onClick={() => setSelectedId(source.id)}
              className={cn(
                "w-full text-left bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between",
                "cursor-pointer hover:border-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border",
                selected && "border-primary ring-1 ring-primary",
              )}
            >
              <div>
                <div className={cn("font-medium", selected && "text-primary")}>
                  {selectName(source.name, i18n.language)}
                  {!source.available && (
                    <Badge variant="secondary" className="ml-2">{t("sourceSelection.comingSoon")}</Badge>
                  )}
                </div>
                <div className="text-caption text-muted-foreground">{source.url}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        })}
      </div>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
        <Button size="sm" disabled={selectedId === null} onClick={() => selectedId !== null && onContinue(selectedId)}>
          {t("sourceSelection.continue")}
        </Button>
      </div>
    </>
  )
}
