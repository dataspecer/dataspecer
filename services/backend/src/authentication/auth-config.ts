import { ExpressAuthConfig } from "@auth/express";

import GitHub from "@auth/express/providers/github"
import GitLab from "@auth/express/providers/gitlab"
import Google from "@auth/express/providers/google"
import Keycloak from "@auth/express/providers/keycloak"
import { GitProviderEnum } from "@dataspecer/git";
import configuration from "../configuration.ts";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { GitHubScope, GitHubProvider, GitProviderFactory } from "@dataspecer/git/git-providers"
import { GenericScope, getScopesForScopeGroup, ScopeGroup } from "@dataspecer/auth";

// Possible inspiration for implementation of custom provider (if needed in future) - https://github.com/nextauthjs/next-auth/discussions/9480
// or take a look at some of the officially implemented ones - https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/providers/github.ts


/**
 * Creates {@link ExpressAuthConfig} for the given {@link genericScope}. The {@link dsBackendURL} and {@link callerURL} are used to create the URL used in the callbacks.
 * The returned ScopeGroup is not null if there is {@link ScopeGroup} which exactly matches provided scope (on permission level of course, not on string level).
 * @param genericScope is the scope as from the authJS user account - that is the scopes separated by comma (,) but converted to the generic scopes
 * @param dsBackendURL is the url of the ds backend
 * @param callerURL is the URL of the caller to which we can be possibly redirected after request is finished
 */
export function createAuthConfigBasedOnAccountScope(genericScope: GenericScope[] | null, dsBackendURL: string, callerURL?: string): [ExpressAuthConfig, ScopeGroup | null] {
  if (genericScope === null) {
    return [createAuthConfig(null, dsBackendURL, callerURL), null];
  }

  for (const scopeGroupKey of Object.values(ScopeGroup).filter(value => typeof value === "number") as number[]) {
    const scopeGroup = ScopeGroup[ScopeGroup[scopeGroupKey] as keyof typeof ScopeGroup];
    const scopesForConfig = getScopesForAuthConfig(scopeGroup);
    const coveredScopes: Record<string, true> = {};
    for (const scope of genericScope) {
      if (scopesForConfig.includes(scope as GenericScope)) {
        coveredScopes[scope] = true;
      }
      else {
        continue;
      }
    }

    const coveredScopesCount = Object.keys(coveredScopes).length;   // We covered all the scopes in the config
    if (coveredScopesCount === scopesForConfig.length && coveredScopesCount === genericScope.length) {
      return [createAuthConfig(scopeGroup, dsBackendURL, callerURL), scopeGroup];
    }
  }

  return [createAuthConfig(null, dsBackendURL, callerURL), null];
}

function getScopesForAuthConfig(scopeGroup: ScopeGroup | null): GenericScope[] {
  if (scopeGroup === null) {
    return ["userInfo", "email"];
  }

  const scope = getScopesForScopeGroup(scopeGroup);
  if (scope === undefined) {
    // It can be undefined only if the given scopeGroup is of different type (user did some typecasting)
    console.error("Passing in invalid scopeGroup which is not of type ScopeGroup - Incorrect casting", scopeGroup);
    return ["userInfo", "email"];
  }
  return scope;
}


/**
 * Creates {@link ExpressAuthConfig} for the given {@link scopeGroup}. The {@link dsBackendURL} and {@link callerURL} are used to create the URL used in the callbacks.
 * @param scopeGroup if null or the value is unknown, then default scope (permission) is used
 * @param callerURL is the URL of the caller to which we will be redirected after the auth request is finished
 * @returns
 */
function createAuthConfig(scopeGroup: ScopeGroup | null, dsBackendURL: string, callerURL?: string): ExpressAuthConfig {
  // NOTE: ! Don't forget to set the scopes everywhere not only for the GitHub.
  let scope = getScopesForAuthConfig(scopeGroup);

  // This URI stuff needs explaining - so first - the issue - when we get back from github we can redirect only back on the server. ("localhost:3100" if ran locally)
  //                                                          so we need some workaround to get back on the url we came from
  // So we store the callerURL to the uri to which we are redirected from github and later retrieve the query part to redirect to the URL to which we came from
  const githubRedirectUri = `${dsBackendURL}/auth/callback/github${callerURL === undefined ? "" : `?internalCallbackUrl=${encodeURIComponent(callerURL)}`}`;

  const createdAuthConfig: ExpressAuthConfig = {
    secret: configuration.authConfiguration?.authSecret,
    trustHost: true,      // In local build it is not needed, when deployed through Cloudflare it seems to be needed
    providers: [
      GitHub({
        issuer: "https://github.com/login/oauth",     // Based on https://github.com/nextauthjs/next-auth/issues/13409
        clientId: configuration.authConfiguration?.gitHubAuthClientId,
        clientSecret: configuration.authConfiguration?.gitHubAuthClientSecret,
        authorization: { params: { scope: scope.map(genericScopeValue => GitHubProvider.convertGenericScopeToProviderScopeStatic(genericScopeValue)).flat().join(" "), redirect_uri: githubRedirectUri } },
      }),
      // TODO RadStr Idea: Implementing GitLab authentication, but
      //                    1) I dont have access to create oauths in mff instance;
      //                    2) Not sure if the issuer/wellKnown works, the wellKnown probably does not
      // GitLab({
      //   clientId: GITLAB_AUTH_CLIENT_ID,
      //   clientSecret: GITLAB_AUTH_CLIENT_SECRET,
      //   name: "MFF GitLab",
      //   issuer: "https://gitlab.mff.cuni.cz",
      //   wellKnown: "https://gitlab.mff.cuni.cz/oauth/.well-known/openid-configuration",
      // }),
      // GitLab({
      //   clientId: GITLAB_AUTH_CLIENT_ID,
      //   clientSecret: GITLAB_AUTH_CLIENT_SECRET,
      // }),
    ],
    session: {
      // Note that if we refresh the page, the token shows new expiration date, however that one is not used, the first one is (the one from sign-in)
      // maxAge: 30,    // Seconds
      strategy: "jwt",
    },
    events: {
      async signOut(message) {
        // Revoke the PAT since the AuthJS does not do it automatically

        // TODO RadStr Future: Has to be changed for database one. Just hover on the method to see what I mean
        if ((message as any)?.token === undefined) {
          return;
        }
        const token = (message as any)?.token;

        if (token?.accessToken !== undefined) {
          if (token?.accountProvider === "github") {
            const gitProvider = GitProviderFactory.createGitProvider(GitProviderEnum.GitHub, httpFetch, configuration);
            const response = await gitProvider.revokePAT(token.accessToken);
            if (response.status !== 204) {
              console.error("Could not revoke PAT for some reason");
            }
          }
        }
      },
    },
    callbacks: {
      // Ok the way I understand the JWT and session relation:
      // JWT in usual sense is just simple token, which is encoded string, so the client can read it
      //  However in authJS it is also encrypted.
      //  So passing the access token is authJS is relatively safe, since the communcation is encrypted through https and the cookie encrypted using the authJS secret
      //  The cookie is also passed in http-only, so it can not be used in javascript.
      //  However the access token probably lasts for longer than the maxAge given in session. So unless user explicitly signs out or the session expires, it can be used.
      //  ... So while it is relatively safe to pass access token in JWT, it is not ideal. So in future it would be probably better to use in database, or explicitly encrypt again.
      // Session - The data in session is the data I want the client to have (that is why it is accessible on the auth/session route), so putting access token in the session is not a got idea.

      jwt({ token, user, account }) {
        if (user) { // User is available during sign-in
          token.id = user.id;
        }
        if (account?.access_token) {
          token.accessToken = account.access_token;
        }
        if (account) {
          if (account.provider === "github") {
            token.providerAccountId = account.providerAccountId;
            token.scope = account.scope;
            token.genericScope = account?.scope
              ?.split(",")
              ?.map(providerSpecificScopeValue => GitHubProvider.convertProviderScopeToGenericScopeStatic(providerSpecificScopeValue as GitHubScope)) ?? null;
          }

          token.accountProvider = account.provider;
        }

        return token;
      },
      // !!!! SESSION IS EXPOSED THROUGH AUTHJS API - DON'T EVER EXPOSE ANYTHING IMPORTANT (LIKE OAUTH tokens with full repository access)
      session({ session, token }) {
        // Based on https://authjs.dev/guides/extending-the-session
        // TODO RadStr Idea: Isn't there a better way with the typing?
        const user: any = session.user;
        user.id = token.id;
        // Get the scope from the JWT
        user.scope = token.scope;
        user.genericScope = token.genericScope;
        user.accountProvider = token.accountProvider;
        user.providerAccountId = token.providerAccountId;

        return session;
      },
      async redirect(params) {
        // We have implement redirect, because the /auth/callback/github is used by AuthJS - it calls all the callbacks defined here
        // and after that it calls this method, which handles final redirect.
        // So we set the callbacks here to store the authentication state.
        // After redirect we can use the authorization through session/database.
        // For example we can store it the res.locals as we do through currentSession
        return dsBackendURL + "/auth-handler/personal-callback/github?callerURL=" + callerURL;
      },
    },
  };

  return createdAuthConfig;
}


/**
 * Creates {@link ExpressAuthConfig} matching the given {@link authPermissions}.
 * The {@link dsBackendURL} and {@link callerURL} are used to create the URL used in the callbacks.
 * @param authPermissions are the request authPermissions which should be in the created instance.
 * @param dsBackendURL the URL of the ds backend
 * @param callerURL is the URL of the caller to which we can be possibly redirected after request is finished
 */
export function createAuthConfigWithCorrectPermissions(authPermissions: string, dsBackendURL: string, callerURL?: string): ExpressAuthConfig {
  const scopeGroup = ScopeGroup[authPermissions as keyof typeof ScopeGroup];
  return createAuthConfig(scopeGroup, dsBackendURL, callerURL);
}

// TODO RadStr Idea: For performance reasons try later create one basic auth config, which will be used everywhere where we don't need redirect or scope.

/**
 * Creates {@link ExpressAuthConfig} with auth permissions containing only the login info (name and email).
 * The {@link dsBackendURL} and {@link callerURL} are used to create the URL used in the callbacks.
 * Contains just the info needed for login. The user info and e-mail.
 * @param dsBackendURL is the url of the ds backend
 * @param callerURL is the URL of the caller to which we can be possibly redirected after request is finished
 */
export const createBasicAuthConfig = (dsBackendURL: string, callerURL?: string) => createAuthConfig(ScopeGroup.LoginInfo, dsBackendURL, callerURL);

/**
 * Creates {@link ExpressAuthConfig} that contains full repo control -
 *  Used to create repo or give access to bot to commit to repository (that is add it as a collaborator).
 * The {@link dsBackendURL} and {@link callerURL} are used to create the URL used in the callbacks.
 * @param callerURL is the URL of the caller to which we can be possibly redirected after request is finished
 * @param dsBackendURL is the url of the ds backend
 * @deprecated The {@link createBasicAuthConfig} is enough to use
 */
export const createFullRepoControlAuthConfig = (dsBackendURL: string, callerURL?: string) => createAuthConfig(ScopeGroup.FullPublicRepoControl, dsBackendURL, callerURL);
