import { useCallback, useEffect, useState } from "react"
import type { Catalogue } from "@/sources/catalogue"
import type { VocabularySource } from "@/sources/types"

/**
 * State of the loading of the catalogue of a source.
 */
export type CatalogueState =
  | { status: "loading" }
  | { status: "ready", catalogue: Catalogue }
  | { status: "error", error: unknown }

/**
 * Loads the catalogue of the source, again when the source changes. 
 * The source keeps the catalogue it has loaded, so loading it again is instant.
 *
 * `retry` loads the catalogue again after an error.
 */
export function useCatalogue(source: VocabularySource | undefined) {
  const [state, setState] = useState<CatalogueState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (source === undefined) {
      return
    }
    let wanted = true
    setState({ status: "loading" })
    source.loadCatalogue().then(
      (catalogue) => wanted && setState({ status: "ready", catalogue }),
      (error) => wanted && setState({ status: "error", error }),
    )
    return () => {
      wanted = false
    }
  }, [source, attempt])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  return { state, retry }
}
