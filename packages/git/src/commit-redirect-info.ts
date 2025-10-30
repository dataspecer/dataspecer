import { MergeState } from "./merge/merge-state.ts";

export enum CommitHttpRedirectionCause {
  HasAtLeastOneMergeStateActive,
  HasExactlyOneMergeStateAndItIsResolvedAndCausedByMerge,
}

export type CommitRedirectResponseJson = {
  iri: string,
  redirectMessage: string;
  openedMergeStatesCount: number;
  commitHttpRedirectionCause: CommitHttpRedirectionCause;
  mergeStateUuids: string[];
  commitMessage: string;
  exportFormat: string;
  mergeStateCausedByMerge: MergeState | null;
}
