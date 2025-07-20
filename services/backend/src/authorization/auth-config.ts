import { ExpressAuthConfig } from "@auth/express";
import { AUTH_SECRET, GITHUB_AUTH_CLIENT_ID, GITHUB_AUTH_CLIENT_SECRET } from "../git-never-commit.ts";

import GitHub from "@auth/express/providers/github"
import GitLab from "@auth/express/providers/gitlab"
import Google from "@auth/express/providers/google"
import Keycloak from "@auth/express/providers/keycloak"


// Possible inspiration for implementation of custom provider (if needed in future) - https://github.com/nextauthjs/next-auth/discussions/9480
// or take a look at some of the officially implemented ones - https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/providers/github.ts


// TODO RadStr: Put into /packages - we need this from both manager and services/backend
export enum ConfigType {
  LoginInfo,
  FullPublicRepoControl,
  DeleteRepoControl,      // TODO RadStr: This is just for debugging, normal user won't use this ever (he could, but I would not trust 3rd party software with removal access).
}

/**
 * @param scope is the scope as from the authJS user account - that is the scopes separated by comma (,)
 * @param callerURL is the URL of the caller to which we can be possibly redirected after request is finished
 */
export function createAuthConfigBasedOnAccountScope(scope: string | null, callerURL?: string): [ExpressAuthConfig, ConfigType | null] {
  if (scope === null) {
    return [createAuthConfig(null, callerURL), null];
  }

  const parsedScopes = scope.split(",");
  for (const configTypeKey of Object.values(ConfigType).filter(value => typeof value === "number") as number[]) {
    const configType = ConfigType[ConfigType[configTypeKey] as keyof typeof ConfigType];
    const scopesForConfig = getScopesForAuthConfig(configType);
    const coveredScopes: Record<string, true> = {};
    for (const scope of parsedScopes) {
      if (scopesForConfig.includes(scope)) {
        coveredScopes[scope] = true;
      }
      else {
        continue;
      }
    }

    const coveredScopesCount = Object.keys(coveredScopes).length;
    if (coveredScopesCount === scopesForConfig.length && coveredScopesCount === parsedScopes.length) {
      return [createAuthConfig(configType, callerURL), configType];
    }
  }

  return [createAuthConfig(null, callerURL), null];
}

// TODO RadStr: ... well the scopes are once again Git Provider specific, so it should be part of the concrete git Provider.
function getScopesForAuthConfig(configType: ConfigType | null): string[] {
  if (configType === null) {
    return ["read:user", "user:email"];
  }

  // Note that we also need the workflow scope for full control related to commiting/pushing. Othwerwise we will get:
  //  refusing to allow an OAuth App to create or update workflow `.github/workflows/learn-github-actions.yml` without `workflow` scope
  // Using Record instead of switch because for Records compiler forces you to define any newly added enum value
  const scopes: Record<ConfigType, string[]> = {
    [ConfigType.LoginInfo]: ["read:user", "user:email"],
    [ConfigType.FullPublicRepoControl]: ["read:user", "user:email", "public_repo", "workflow"],
    [ConfigType.DeleteRepoControl]: ["read:user", "user:email", "public_repo", "workflow", "delete_repo"],
  };

  const scope = scopes[configType];
  if (scope === undefined) {
    // It can be undefined only if the given configType is of different type (user did some typecasting)
    console.error("Passing in invalid configType which is not of type ConfigType - Incorrect casting", configType);
    return ["read:user", "user:email"];
  }
  return scope;
}


/**
 *
 * @param configType if null or the value is unknown, then default scope (permission) is used
 * @param callerURL is the URL of the caller to which we will be redirected after the auth request is finished
 * @returns
 */
function createAuthConfig(configType: ConfigType | null, callerURL?: string): ExpressAuthConfig {

  // TODO RadStr: Don't forget to put it everywhere not only the GitHub.
  let scope = getScopesForAuthConfig(configType).join(" ");
  console.info("TODO RadStr: createAuthConfig", { scope, callerURL, configType });

  // This URI stuff needs explaining - so first - the issue - when we get back from github we can redirect only back on the server. ("localhost:3100" if ran locally)
  //                                                          so we need some workaround to get back on the url we came from
  // So we store the callerURL to the uri to which we are redirected from github and later retrieve the query part to redirect to the URL to which we came from
  const githubRedirectUri = `http://localhost:3100/auth/callback/github${callerURL === undefined ? "" : `?internalCallbackUrl=${encodeURIComponent(callerURL)}`}`;

  const createdAuthConfig: ExpressAuthConfig = {
    secret: AUTH_SECRET,
    providers:
    [
      GitHub({
        clientId: GITHUB_AUTH_CLIENT_ID,
        clientSecret: GITHUB_AUTH_CLIENT_SECRET,
        authorization: { params: { scope, redirect_uri: githubRedirectUri } },
        // redirectProxyUrl: "http://localhost:3100/auth/callback/github",
      }),
      // TODO RadStr: 1) I dont have access to create oauths in mff instance; 2) Not sure if the issuer/wellKnown works, the wellKnown probably does not
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
          token.scope = account.scope;
        }

        return token;
      },
      // TODO RadStr: !!!! SESSION IS EXPOSED THROUGH AUTHJS API - DON'T EVER EXPOSE ANYTHING IMPORTANT (LIKE OAUTH tokens with full repository access)
      session({ session, token }) {
        // Based on https://authjs.dev/guides/extending-the-session
        // TODO RadStr: Isn't there a better way with the typing?
        const user: any = session.user;
        user.id = token.id;
        user.authPermissions = configType;
        // Get the scope from the JWT
        user.scope = token.scope;

        return session;
      },
      async redirect(params) {
        // TODO RadStr: After commit remove everything not commented

        // // TODO RadStr: Hard-coded, just debug
        // //              We have to set this, because the /auth/callback/github is used by AuthJS - it calls all the callbacks defined here
        // //              and after that it calls redirect to this. So the correct usage is to set the callbacks here to store the authentication state.
        // //              And use it after the redirect through session/database. For example we can store it the res.locals, or stuff like that

        console.info("redirect", { params, callerURL });

        // if (request !== undefined && expressRequest !== null) {
        //   console.info({request, expressRequest});
        //   // await getSession(expressRequest, createdAuthConfig);
        //   const jwtToken = await getToken({ req: request, secret: AUTH_SECRET });
        //   console.info("jwtToken", jwtToken);
        //   const callerURLInToken: string | null = (jwtToken as any)?.callerURL ?? null;
        //   return callerURLInToken ?? callerURL ?? params.baseUrl;
        // }

        return params.baseUrl + "/auth-handler/personal-callback/github?callerURL=" + callerURL;
      },
    },
  };

  return createdAuthConfig;
}


/**
 *
 * @param authPermissions are the request authPermissions which should be in the created instance.
 * @param callerURL is the URL of the caller to which we can be possibly redirected after request is finished
 */
export function createAuthConfigWithCorrectPermissions(authPermissions: string, callerURL?: string) {
  const configType = ConfigType[authPermissions as keyof typeof ConfigType];
  return createAuthConfig(configType, callerURL);
}

// TODO RadStr: For perfomance reasons try later create one basic auth config, which will be used everywhere where we don't need redirect or scope.

/**
 * Contains just the info needed for login. The user info and e-mail.
 * @param callerURL is the URL of the caller to which we can be possibly redirected after request is finished
 */
export const createBasicAuthConfig = (callerURL?: string) => createAuthConfig(ConfigType.LoginInfo, callerURL);

/**
 * Contains full repo control - Used to create repo or give access to bot to commit to repository (that is add it as a collaborator).
 * @param callerURL is the URL of the caller to which we can be possibly redirected after request is finished
 * @deprecated The {@link createBasicAuthConfig} is enough to use
 */
export const createFullRepoControlAuthConfig = (callerURL?: string) => createAuthConfig(ConfigType.FullPublicRepoControl, callerURL);
