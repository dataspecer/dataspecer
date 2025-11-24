import { MergeState } from "./merge/merge-state.ts";
import { CommitType } from "./utils.ts";

export enum CommitHttpRedirectionCause {
  HasAtLeastOneMergeStateActive,
  HasExactlyOneMergeStateAndItIsResolvedAndCausedByMerge,
}

export type MergeFromDataType = {
  branch: string;
  commitHash: string;
  iri: string;
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
  mergeFromData: MergeFromDataType | null;
}

export type CommitRedirectExtendedResponseJson = {
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null;
  commitType: CommitType;
} & CommitRedirectResponseJson;
