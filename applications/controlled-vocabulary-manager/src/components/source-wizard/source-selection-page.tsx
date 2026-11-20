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
  onCancel: () => void
  onContinue: (sourceId: string) => void
}

export function SourceSelectionPage({ onCancel, onContinue }: SourceSelectionPageProps) {
  const { t, i18n } = useTranslation()
  const { managerUrl } = useConfig()

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
        {sourceDescriptors.map((source) => (
          <button
            key={source.id}
            type="button"
            disabled={!source.available}
            onClick={() => onContinue(source.id)}
            className={cn(
              "w-full text-left bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between",
              "cursor-pointer hover:border-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border",
            )}
          >
            <div>
              <div className="font-medium">
                {selectName(source.name, i18n.language)}
                {!source.available && (
                  <Badge variant="secondary" className="ml-2">{t("sourceSelection.comingSoon")}</Badge>
                )}
              </div>
              <div className="text-caption text-muted-foreground">{source.url}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
      </div>
    </>
  )
}
