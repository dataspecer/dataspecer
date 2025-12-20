import path from "path";

export const ROOT_DIRECTORY_FOR_ANY_GIT: string = path.resolve("./database/git-repos");
export const ROOT_DIRECTORY_FOR_PUBLIC_GITS: string = path.resolve(ROOT_DIRECTORY_FOR_ANY_GIT + "/public");
export const ROOT_DIRECTORY_FOR_PRIVATE_GITS: string = path.resolve(ROOT_DIRECTORY_FOR_ANY_GIT + "/private");
export const MANUAL_CLONE_PATH_PREFIX = "manual-clone";

// Public gits (fetcheable from client)
const ROOT_DIRECTORY_FOR_MANUAL_CLONE: string = path.resolve(ROOT_DIRECTORY_FOR_PUBLIC_GITS + "/" + MANUAL_CLONE_PATH_PREFIX + "/");
export const WEBHOOK_PATH_PREFIX = "for-webhooks";
const ROOT_DIRECTORY_FOR_ANY_WEBHOOK: string = path.resolve(ROOT_DIRECTORY_FOR_PUBLIC_GITS + "/" + WEBHOOK_PATH_PREFIX + "/");
export const FETCH_GIT_HISTORY_PREFIX = "fetch-history";
const ROOT_DIRECTORY_FOR_FETCH_GIT_HISTORY: string = path.resolve(ROOT_DIRECTORY_FOR_PUBLIC_GITS + "/" + FETCH_GIT_HISTORY_PREFIX + "/");
export const MERGE_DS_CONFLICTS_PREFIX = "merge-conflicts";
const ROOT_DIRECTORY_FOR_MERGE_DS_CONFLICTS: string = path.resolve(ROOT_DIRECTORY_FOR_PUBLIC_GITS + "/" + MERGE_DS_CONFLICTS_PREFIX + "/");
export const PUSH_PREFIX = "push";
const ROOT_DIRECTORY_FOR_PUSHING: string = path.resolve(ROOT_DIRECTORY_FOR_PUBLIC_GITS + "/" + PUSH_PREFIX + "/");
// private gits (for internal computations)
export const INTERNAL_COMPUTATION_FOR_IMPORT = "import";
export const ROOT_DIRECTORY_FOR_INTERNAL_COMPUTATION_FOR_IMPORT: string = path.resolve(ROOT_DIRECTORY_FOR_PRIVATE_GITS + "/" + INTERNAL_COMPUTATION_FOR_IMPORT);
export const MERGE_CONFLICTS_PRIVATE = "merge-conflicts";
export const ROOT_DIRECTORY_FOR_MERGE_CONFLICTS_PRIVATE: string = path.resolve(ROOT_DIRECTORY_FOR_PRIVATE_GITS + "/" + MERGE_CONFLICTS_PRIVATE);



export type AllowedPublicPrefixes = typeof MANUAL_CLONE_PATH_PREFIX | typeof WEBHOOK_PATH_PREFIX | typeof FETCH_GIT_HISTORY_PREFIX | typeof MERGE_DS_CONFLICTS_PREFIX | typeof PUSH_PREFIX;
export type AllowedPrefixes = typeof MERGE_CONFLICTS_PRIVATE | typeof INTERNAL_COMPUTATION_FOR_IMPORT | AllowedPublicPrefixes;

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
  // The check is based on https://stackoverflow.com/questions/37521893/determine-if-a-path-is-subdirectory-of-another-in-node-js
  // We added .length > 0 to the boolean condition since otherwise it may result in "", which is fine in JavaScript I guess
  const relative = path.relative(ROOT_DIRECTORY_FOR_PUBLIC_GITS, normalizedGitPath);
  const isAccessible = relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
  return {
    isAccessible: isAccessible,
    normalizedGitPath,
  };
}

