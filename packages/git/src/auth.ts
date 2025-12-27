const scopes = ["userInfo", "email", "publicRepo", "workflow", "deleteRepo"] as const;
export type Scope = typeof scopes[number];

/**
 * Should be sorted from the highest to lowest. But it does not actually matter in the implementation.
 */
export enum ConfigType {
  DeleteRepoControl,      // TODO RadStr: This is just for debugging, normal user won't use this ever (he could, but I would not trust 3rd party software with removal access).
  FullPublicRepoControl,
  LoginInfo,
}