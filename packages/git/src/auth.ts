const scopes = ["userInfo", "readOrg", "email", "publicRepo", "workflow", "deleteRepo"] as const;
export type Scope = typeof scopes[number];

// TODO RadStr: Rename the ConfigType and probably also the Scope
/**
 * Should be sorted from the highest to lowest. But it does not actually matter in the implementation.
 */
export enum ConfigType {
  DeleteRepoControl,      // Note: This is just for debugging, normal user won't use this ever (he could, but I would not trust 3rd party software with removal access).
  /**
   * user info + push + readOrg + workflow
   */
  FullPublicRepoControl,      // TODO RadStr: maybe it is not only public but also private
  LoginInfo,
}