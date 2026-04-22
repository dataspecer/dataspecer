import { TFunction } from "i18next";

// This file contains wait times for the loading dialog. (Mainly used for Git actions to show expected time and how much time passed)

export type GitWaitTime = {
  lowerBound: number;
  upperBound: number;
}

export const CREATE_REPOSITORY_WAIT_TIME: Readonly<GitWaitTime> = {
  lowerBound: 6,
  upperBound: 15
};

export const CREATE_NEW_BRANCH_WAIT_TIME: Readonly<GitWaitTime> = {
  lowerBound: 1,
  upperBound: 10
};

export const GIT_COMMIT_WAIT_TIME: Readonly<GitWaitTime> = {
  lowerBound: 2,
  upperBound: 15
};

export const MERGE_COMMIT_WAIT_TIME: Readonly<GitWaitTime> = {
  lowerBound: 3,
  upperBound: 15
};

export const GIT_IMPORT_WAIT_TIME: Readonly<GitWaitTime> = {
  lowerBound: 5,
  upperBound: 20
};

export const GIT_MERGE_VALIDATION_WAIT_TIME: Readonly<GitWaitTime> = {
  lowerBound: 3,
  upperBound: 15
};

export const CREATE_MERGE_STATE_WAIT_TIME: Readonly<GitWaitTime> = {
  lowerBound: 3,
  upperBound: 10
};

export const SAVING_DIFF_EDITOR_STATE_TO_BACKEND: Readonly<GitWaitTime> = {
  lowerBound: 1,
  upperBound: 15
};

export function createTranslationForWaitTime(t: TFunction<"translation", undefined>, waitTime: GitWaitTime) {
  const waitText = `${t("git.wait-prefix-text")} ${waitTime.lowerBound}-${waitTime.upperBound} ${t("git.wait-seconds")}`;
  return waitText;
}
