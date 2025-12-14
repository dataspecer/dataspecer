export type FinalizerVariantsForPullOnFailure = "remove-merge-state" | "pull-anyways";
export type FinalizerVariantsForPushOnFailure = "remove-merge-state";
export type FinalizerVariantsForMergeOnFailure = "remove-merge-state";

export type MergeCommitType = "merge-commit" | "rebase-commit";
export type CommitType = "classic-commit" | MergeCommitType;
export type SingleBranchCommitType = "classic-commit" | "rebase-commit";

export function isGitUrlSet(gitUrl: string | undefined | null): boolean {
  const length = gitUrl?.length;
  return length !== undefined && length > 0;
}

export const defaultEmptyGitUrlForDatabase = "";
export const defaultBranchForPackageInDatabase = "";


/**
 * Called for git related stuff - branch names, git user names, repository names
 * @returns the input {@link gitName} stripped by white space characters
 */
export function convertToValidGitName(gitName: string): string {
  // Based on ChatGPT
  const validGitName = gitName.trim().replace(/\s+/g, " ").replace(/ /g, "-");
  return validGitName;
}

export function createSetterWithGitValidation(setter: (value: string) => void) {
  return (newValueForSetter: string) => {
    const validValue = convertToValidGitName(newValueForSetter);
    setter(validValue);
  };
}