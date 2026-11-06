import { TriangleAlert, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { MetadataWarning } from "@/sources/types"

interface MetadataWarningsProps {
  warnings: MetadataWarning[]
  onDismiss: () => void
}

/**
 * Says what could not be read from the source, so that the user fills in
 * those fields by hand.
 */
export function MetadataWarnings({ warnings, onDismiss }: MetadataWarningsProps) {
  const { t } = useTranslation()
  return (
    <Alert variant="warning" className="mb-4">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        {t("form.warnings.title")}
        <Button type="button" variant="ghost" size="xsm" aria-label={t("form.warnings.dismiss")} onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-5">
          {warnings.map((warning) => (
            <li key={warning.code}>
              {t(`form.warnings.${warning.code}`)}
              {warning.detail && <span className="break-all"> ({warning.detail})</span>}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
