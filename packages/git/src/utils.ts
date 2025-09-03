export function isGitUrlSet(gitUrl: string | undefined | null) {
  return !(gitUrl === "" || gitUrl === "{}");
}

export const defaultEmptyGitUrlForDatabase = "{}";