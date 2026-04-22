import { ExportFormatType, ExportVersionType } from "./git-configuration/git-remote-configuration-interface.ts";
import { CommitType } from "./git-utils.ts";
import { MergeState } from "./merge/merge-state.ts";

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
  exportFormat: ExportFormatType;
  exportVersion: ExportVersionType;
  mergeStateCausedByMerge: MergeState | null;
  mergeFromData: MergeFromDataType | null;
}

export type CommitRedirectExtendedResponseJson = {
  shouldAlwaysCreateMergeState: boolean;
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null;
  commitType: CommitType;
  onSuccessCallback: (() => void) | null;
} & CommitRedirectResponseJson;
