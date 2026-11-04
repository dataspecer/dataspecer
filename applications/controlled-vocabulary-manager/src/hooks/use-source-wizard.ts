import { useCallback, useEffect, useState } from "react"
import type { Screen } from "../App"
import type { MetadataResult, SourceCandidate, SourceGroup } from "@/sources/types"
import type { Navigate } from "./use-hash-route"

/**
 * What the user has chosen so far in the "Add from source" flow.
 * - sourceId = the source the vocabulary is looked up in, null before it is chosen
 * - groupsPage = zero-based number of the shown page of the groups of the source
 * - group = the group whose vocabularies are listed
 * - query = the text the vocabularies are searched by, empty when not searching
 * - candidatesPage = zero-based number of the shown page of the vocabularies
 * - candidate = the vocabulary the user has chosen
 * - metadata = what was read about the chosen vocabulary from its chosen distribution
 */
export interface WizardState {
  sourceId: string | null
  groupsPage: number
  group: SourceGroup | null
  query: string
  candidatesPage: number
  candidate: SourceCandidate | null
  metadata: MetadataResult | null
}

const INITIAL_STATE: WizardState = {
  sourceId: null,
  groupsPage: 0,
  group: null,
  query: "",
  candidatesPage: 0,
  candidate: null,
  metadata: null,
}

/**
 * Whether the screen can be shown with the state of the wizard. 
 * Each screen after the choice of the source needs what the user chose before it.
 */
export function isWizardScreenAvailable(screen: Screen, state: WizardState): boolean {
  switch (screen) {
    case "search":
      return state.sourceId !== null
    case "distribution":
      return state.candidate !== null
    case "form-prefilled":
      return state.metadata !== null
    default:
      return true
  }
}

/**
 * What the Back button of the search does, one level at a time:
 * - clear-search = clears the searched text, which shows the vocabularies of the chosen group, or the groups
 * - all-groups = leaves the chosen group, which shows the groups
 * - source = returns to the choice of the source
 */
export type SearchBackStep = "clear-search" | "all-groups" | "source"

export function searchBackStep(state: WizardState): SearchBackStep {
  if (state.query !== "") {
    return "clear-search"
  }
  return state.group !== null ? "all-groups" : "source"
}

/**
 * Holds the state of the "Add from source" flow in memory. A screen of the
 * flow opened without its state, such as after reloading the page, is
 * replaced by the list of vocabularies.
 */
export function useSourceWizard(screen: Screen, navigate: Navigate) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)

  // Choosing a source starts the flow anew, also when it is the same source as before.
  const selectSource = useCallback((sourceId: string) => {
    setState({ ...INITIAL_STATE, sourceId })
  }, [])

  const setGroupsPage = useCallback((groupsPage: number) => {
    setState((current) => ({ ...current, groupsPage }))
  }, [])

  const selectGroup = useCallback((group: SourceGroup | null) => {
    setState((current) => ({ ...current, group, candidatesPage: 0 }))
  }, [])

  const search = useCallback((query: string) => {
    setState((current) => ({ ...current, query, candidatesPage: 0 }))
  }, [])

  const setCandidatesPage = useCallback((candidatesPage: number) => {
    setState((current) => ({ ...current, candidatesPage }))
  }, [])

  const selectCandidate = useCallback((candidate: SourceCandidate) => {
    setState((current) => ({ ...current, candidate, metadata: null }))
  }, [])

  const setMetadata = useCallback((metadata: MetadataResult) => {
    setState((current) => ({ ...current, metadata }))
  }, [])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  const available = isWizardScreenAvailable(screen, state)
  useEffect(() => {
    if (!available) {
      navigate("list", { replace: true })
    }
  }, [available, navigate])

  return { state, available, selectSource, setGroupsPage, selectGroup, search, setCandidatesPage, selectCandidate, setMetadata, reset }
}
