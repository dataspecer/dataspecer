import { useCallback, useEffect, useRef, useState } from "react"
import { PAGE_SIZE } from "@/lib/paging"
import type { Page, PageRequest, RequestOptions } from "@/sources/types"

/**
 * Loads one page of a listing of a source.
 */
export type PageLoader<T> = (request: PageRequest, options: RequestOptions) => Promise<Page<T>>

/**
 * State of the shown page of a listing. While a page is loading,
 * `total` is the size of the listing known from an earlier page, null if there is none.
 */
export type ListingState<T> =
  | { status: "loading", total: number | null }
  | { status: "ready", items: T[], total: number }
  | { status: "error", error: unknown }

/**
 * Loads the page of a listing whenever the loader or the page changes.
 * A request that is no longer wanted is cancelled, so an old answer never replaces a newer one.
 * The size of the whole listing is learned with its first page and handed to the loader with the following ones, so that the
 * source does not count it again.
 *
 * `retry` loads the page again after an error, counting the listing again.
 */
export function usePagedListing<T>(load: PageLoader<T>, page: number) {
  const [state, setState] = useState<ListingState<T>>({ status: "loading", total: null })
  const [attempt, setAttempt] = useState(0)
  const knownTotal = useRef<{ load: PageLoader<T>, total: number } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const total = knownTotal.current?.load === load ? knownTotal.current.total : null
    setState({ status: "loading", total })
    load({ offset: page * PAGE_SIZE, limit: PAGE_SIZE, total: total ?? undefined }, { signal: controller.signal })
      .then((result) => {
        knownTotal.current = { load, total: result.total }
        setState({ status: "ready", items: result.items, total: result.total })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ status: "error", error })
        }
      })
    return () => controller.abort()
  }, [load, page, attempt])

  const retry = useCallback(() => {
    knownTotal.current = null
    setAttempt((current) => current + 1)
  }, [])

  return { state, retry }
}
