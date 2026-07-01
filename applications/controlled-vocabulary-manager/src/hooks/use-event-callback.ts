import { useCallback, useRef, useLayoutEffect } from 'react'

/**
 * Returns a stable callback reference that always calls the latest version of the function.
 * Prevents stale closures while maintaining referential stability.
 *
 * Based on pattern from /applications/manager/src/hooks/use-event-callback.ts
 */
export function useEventCallback<Args extends unknown[], R>(
  fn: (...args: Args) => R,
): (...args: Args) => R {
  const ref = useRef<typeof fn>(fn)

  useLayoutEffect(() => {
    ref.current = fn
  }, [fn])

  return useCallback((...args: Args) => ref.current(...args), [])
}
