import type { ReactNode } from "react"
import { Loader, TriangleAlert } from "lucide-react"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ListingState } from "@/hooks/use-paged-listing"
import { SparqlError } from "@/sources/sparql-client"

interface ListingViewProps<T> {
  state: ListingState<T>
  onRetry: () => void
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
}

/**
 * Says why a listing could not be loaded.
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
 * Shows a page of a listing, or that it is loading, empty or failed to load.
 */
export function ListingView<T>({ state, onRetry, getKey, renderItem }: ListingViewProps<T>) {
  const { t } = useTranslation()

  if (state.status === "loading") {
    return (
      <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader className="h-4 w-4 animate-spin" />
        {t("search.loading")}
      </div>
    )
  }
  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>{t("search.error.title")}</AlertTitle>
        <AlertDescription>
          {errorMessage(state.error, t)}
          <div className="mt-2">
            <Button variant="outline" size="xsm" onClick={onRetry}>
              {t("search.error.retry")}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }
  if (state.items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
        {t("search.empty")}
      </div>
    )
  }
  return (
    <div className="bg-card border border-border rounded-lg divide-y divide-border">
      {state.items.map((item) => (
        <div key={getKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  )
}
