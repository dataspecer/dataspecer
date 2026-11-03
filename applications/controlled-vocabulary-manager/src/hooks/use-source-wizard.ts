import { useCallback, useEffect, useState } from "react"
import type { Screen } from "../App"
import type { Navigate } from "./use-hash-route"

/**
 * What the user has chosen so far in the "Add from source" flow.
 * - sourceId = the source the vocabulary is looked up in, null before it is chosen
 * - groupsPage = zero-based number of the shown page of the groups of the source
 */
export interface WizardState {
  sourceId: string | null
  groupsPage: number
}

const INITIAL_STATE: WizardState = { sourceId: null, groupsPage: 0 }

/**
 * Whether the screen can be shown with the state of the wizard. 
 * The screens after the choice of the source need the source.
 */
export function isWizardScreenAvailable(screen: Screen, state: WizardState): boolean {
  switch (screen) {
    case "search":
    case "distribution":
    case "form-prefilled":
      return state.sourceId !== null
    default:
      return true
  }
}

/**
 * Holds the state of the "Add from source" flow in memory. A screen of the
 * flow opened without its state, such as after reloading the page, is
 * replaced by the list of vocabularies.
 */
export function useSourceWizard(screen: Screen, navigate: Navigate) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)

  const selectSource = useCallback((sourceId: string) => {
    setState((current) => current.sourceId === sourceId ? current : { ...INITIAL_STATE, sourceId })
  }, [])

  const setGroupsPage = useCallback((groupsPage: number) => {
    setState((current) => ({ ...current, groupsPage }))
  }, [])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  const available = isWizardScreenAvailable(screen, state)
  useEffect(() => {
    if (!available) {
      navigate("list", { replace: true })
    }
  }, [available, navigate])

  return { state, available, selectSource, setGroupsPage, reset }
}
