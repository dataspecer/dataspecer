// TODO RadStr: Maybe move into package?
export function convertToValidRepositoryName(repoName: string): string {
  // Based on ChatGPT
  console.info("Repo name before:", repoName);
  const validRepoName = repoName.trim().replace(/\s+/g, " ").replace(/ /g, "-");
  console.info("Repo name after:", validRepoName);
  return validRepoName;
}

// TODO RadStr: Put into /packages - we need this from both manager and services/backend
export enum ConfigType {
  LoginInfo,
  FullPublicRepoControl,
  DeleteRepoControl,      // TODO RadStr: This is just for debugging, normal user won't use this ever (he could, but I would not trust 3rd party software with removal access).
}
