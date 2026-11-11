import { Loader, TriangleAlert } from "lucide-react"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SparqlError } from "@/sources/sparql-client"

/**
 * Says why the catalogue could not be loaded.
 */
function errorMessage(error: unknown, t: TFunction): string {
  if (!(error instanceof SparqlError)) {
    return t("search.error.unknown")
  }
  switch (error.kind) {
    case "network": return t("search.error.network")
    case "timeout": return t("search.error.timeout")
    case "parse": return t("search.error.parse")
    default: return t("search.error.http", { message: error.message })
  }
}

/**
 * Says that something could not be loaded from the source, and why, with a
 * button to try again.
 */
export function LoadErrorAlert({ error, onRetry }: { error: unknown, onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <Alert variant="destructive">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{t("search.error.title")}</AlertTitle>
      <AlertDescription>
        {errorMessage(error, t)}
        <div className="mt-2">
          <Button variant="outline" size="xsm" onClick={onRetry}>
            {t("search.error.retry")}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Says that the catalogue of the source is being loaded.
 */
export function LoadingIndicator() {
  const { t } = useTranslation()
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center gap-2 text-muted-foreground">
      <Loader className="h-4 w-4 animate-spin" />
      {t("search.loading")}
    </div>
  )
}
