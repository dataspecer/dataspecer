export function isGitUrlSet(gitUrl: string | undefined | null) {
  return !(gitUrl === "" || gitUrl === "{}");
}

export const defaultEmptyGitUrlForDatabase = "{}";


/**
 * Called for git related stuff - branch names, git user names, repository names
 * @returns the input {@link gitName} stripped by white space characters
 */
export function convertToValidGitName(gitName: string): string {
  // Based on ChatGPT
  const validGitName = gitName.trim().replace(/\s+/g, " ").replace(/ /g, "-");
  return validGitName;
}