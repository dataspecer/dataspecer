import path from "path";

export const ROOT_DIRECTORY_FOR_ANY_GIT: string = path.resolve("./public-git");
export const MANUAL_CLONE_PATH_PREFIX = "manual-clone";
export const ROOT_DIRECTORY_FOR_MANUAL_CLONE: string = path.resolve(ROOT_DIRECTORY_FOR_ANY_GIT + "/" + MANUAL_CLONE_PATH_PREFIX);
export const WEBHOOK_PATH_PREFIX = "for-webhooks";
export const ROOT_DIRECTORY_FOR_ANY_WEBHOOK: string = path.resolve(ROOT_DIRECTORY_FOR_ANY_GIT + "/" + WEBHOOK_PATH_PREFIX);
export const FETCH_GIT_HISTORY_PREFIX = "fetch-history";
export const ROOT_DIRECTORY_FOR_FETCH_GIT_HISTORY: string = path.resolve(ROOT_DIRECTORY_FOR_ANY_GIT + "/" + FETCH_GIT_HISTORY_PREFIX);
export const MERGE_DS_CONFLICTS_PREFIX = "merge-conflicts";
export const ROOT_DIRECTORY_FOR_MERGE_DS_CONFLICTS: string = path.resolve(ROOT_DIRECTORY_FOR_ANY_GIT + "/" + MERGE_DS_CONFLICTS_PREFIX);
export const PUSH_PREFIX = "push";
export const ROOT_DIRECTORY_FOR_PUSHING: string = path.resolve(ROOT_DIRECTORY_FOR_ANY_GIT + "/" + PUSH_PREFIX);

export type AllowedPublicPrefixes = typeof MANUAL_CLONE_PATH_PREFIX | typeof WEBHOOK_PATH_PREFIX | typeof FETCH_GIT_HISTORY_PREFIX | typeof MERGE_DS_CONFLICTS_PREFIX | typeof PUSH_PREFIX;

export const PUBLICLY_ACCESSIBLE_GIT_REPOSITORY_ROOTS: string[] = [
  ROOT_DIRECTORY_FOR_ANY_WEBHOOK,
  ROOT_DIRECTORY_FOR_MANUAL_CLONE,
  ROOT_DIRECTORY_FOR_FETCH_GIT_HISTORY,
  ROOT_DIRECTORY_FOR_MERGE_DS_CONFLICTS,
  ROOT_DIRECTORY_FOR_PUSHING,
];

/**
 * We assume that any git repository ever fetched, which can be part of MergeState resides in on of roots listed here.
 * Note that root direcctory under which are listed repositories - that is on the next leven there are n directories = n repositories
 */
export const ALL_GIT_REPOSITORY_ROOTS: string[] = [
  ...PUBLICLY_ACCESSIBLE_GIT_REPOSITORY_ROOTS,
];

/**
 * @param gitPath is path anywhere inside git repository
 * @returns the given {@link gitPath}, but normalized and if it can be accessible from client.
 */
export function isAccessibleGitRepository(gitPath: string): { isAccessible: boolean, normalizedGitPath: string } {
  const normalizedGitPath = path.resolve(gitPath);
  return {
    isAccessible: PUBLICLY_ACCESSIBLE_GIT_REPOSITORY_ROOTS.some(allowedRoot => {
      return normalizedGitPath.startsWith(allowedRoot);
    }),
    normalizedGitPath,
  };
}

