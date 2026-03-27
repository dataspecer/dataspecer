const scopes = ["userInfo", "readOrg", "email", "publicRepo", "workflow", "deleteRepo"] as const;
export type GenericScope = typeof scopes[number];


/**
 * Should be sorted from the highest to lowest. But it does not actually matter in the implementation.
 */
export enum ScopeGroup {
  DeleteRepoControl,      // Note: This is just for debugging, normal user won't use this ever (he could, but I would not trust 3rd party software with removal access).
  /**
   * user info + email + push + readOrg + workflow
   */
  FullPublicRepoControl,
  LoginInfo,
}

// Note that we also need the workflow scope for full control related to commiting/pushing. Othwerwise we will get:
//  refusing to allow an OAuth App to create or update workflow `.github/workflows/learn-github-actions.yml` without `workflow` scope
// Using Record instead of switch because for Records compiler forces you to define any newly added enum value
const scopesForScopeGroup: Record<ScopeGroup, GenericScope[]> = {
  [ScopeGroup.LoginInfo]: ["userInfo", "email"],
  [ScopeGroup.FullPublicRepoControl]: ["userInfo", "readOrg", "email", "publicRepo", "workflow"],
  [ScopeGroup.DeleteRepoControl]: ["userInfo", "readOrg", "email", "publicRepo", "workflow", "deleteRepo"],
};

export function getScopesForScopeGroup(scopeGroup: ScopeGroup): GenericScope[] {
  return scopesForScopeGroup[scopeGroup];
}