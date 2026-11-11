import { Info } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { LanguageString } from "@dataspecer/core/core/core-resource"
import { selectName } from "@/lib/language"

interface MetadataDerivationProps {
  /** What the source does to derive the metadata of a vocabulary. */
  text: LanguageString
}

/**
 * Tells how the source derives the metadata the form is prefilled with.
 */
export function MetadataDerivation({ text }: MetadataDerivationProps) {
  const { t, i18n } = useTranslation()
  return (
    <div className="flex gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 mb-4 text-sm text-muted-foreground">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <div className="font-medium">{t("form.derivation.title")}</div>
        {selectName(text, i18n.language)}
      </div>
    </div>
  )
}
