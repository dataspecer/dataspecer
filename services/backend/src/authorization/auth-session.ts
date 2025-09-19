import { getSession, Session } from "@auth/express"
import express, { NextFunction } from "express"
import { createBasicAuthConfig, createAuthConfigBasedOnAccountScope } from "./auth-config.ts"
import { asyncHandler } from "../utils/async-handler.ts";
import { AccessToken, AccessTokenType, ConfigType, GitProvider, GitCredentials } from "@dataspecer/git";
import { getToken } from "@auth/core/jwt"
import { AUTH_SECRET } from "../git-never-commit.ts";
import { convertExpressRequestToNormalRequest, getBaseUrl } from "../utils/git-utils.ts";
import { createUserSSHIdentifier } from "../routes/store-private-ssh-key.ts";


export async function currentSession(
  request: express.Request,
  response: express.Response,
  next: NextFunction,
) {
  const dsBackendURL = getBaseUrl(request);
  const callerURL = request.get("Referer") ?? "";

  const basicAuthConfigInstance = createBasicAuthConfig(dsBackendURL)
  let session = (await getSession(request, basicAuthConfigInstance)) ?? undefined;

  // TODO RadStr: .... Do I even need the following if??? Only the scope is different and it seems that isn't the important part when it comes to the getSession method !
  // TODO RadStr: Not ideal - I am basically repairing to use it with correct config based on the scope I have stored in session
  // TODO RadStr: I should probably have it stored in cookie (or in database?)
  if (session !== undefined) {
    const [authConfig] = createAuthConfigBasedOnAccountScope((session?.user as any).genericScope ?? null, dsBackendURL);
    session = (await getSession(request, authConfig)) ?? undefined;
  }


  response.locals.session = session;

  if (session !== undefined) {
    // Add the access token to the locals
    const convertedRequest = convertExpressRequestToNormalRequest(callerURL, request);
    const jwtToken = await getToken({ req: convertedRequest, secret: AUTH_SECRET });
    response.locals.session.user.accessToken = (jwtToken as any)?.accessToken;
  }

  next();
}

export function getStoredSession(response: express.Response): Session | null {
  if (response?.locals?.session === undefined) {
    return null;
  }

  return response.locals.session;
}

/**
 * Returns in response basic user info (in json), which at minimum contains: name, email and image. Any of them can be null.
 * @deprecated I didn't know that session is exposed on the http://localhost:3100/auth/session endpoint
 */
export const getBasicUserInfo = asyncHandler(async (request: express.Request, response: express.Response) => {
  const dsBackendURL = getBaseUrl(request);

  // TODO RadStr: Here it should not matter that I am using the basicAuthConfig instead of the correct one

  const session = (await getSession(request, createBasicAuthConfig(dsBackendURL))) ?? undefined;
  const basicUserInfo = {
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  };
  response.json(basicUserInfo);
});

/**
 * Tries to get name, email and access token from current session.
 *  For missing values returns null instead.
 * @param wantedAccessTokenLevels - If the user has "weak" scope for access token (it does not matches any of the provided ones),
 *  then null is returned instead for the committerAccessToken.
 *  ... Just be careful that if we extend ConfigType by new value, we have to extend all the places where we want certain level of accessToken permissions
 *  ... Can't think of anything though - maybe just provide the string value describing permission (but that does not work for different Git providers)
 *  ... so possible future TODO RadStr Idea:
 */
export const getGitCredentialsFromSession = (request: express.Request, response: express.Response, wantedAccessTokenLevels: ConfigType[]) => {
  let committerName: string | null = null;
  let committerEmail: string | null = null;
  let committerAccessToken: string | null = null;
  let committerSSH: string | null = null;
  const dsBackendURL = getBaseUrl(request);

  const currentSession = getStoredSession(response);
  if (currentSession !== null) {
    committerName = currentSession.user?.name ?? null;
    committerEmail = currentSession.user?.email ?? null;
    const [, configType] = createAuthConfigBasedOnAccountScope((currentSession.user as any)?.genericScope ?? null, dsBackendURL);      // The express request won't be used so just set it to null
    // TODO RadStr Idea: In future if there will be better granulization in permissions then the check should be more complex + should check if we have access to the repo
    if (configType !== null && wantedAccessTokenLevels.includes(configType)) {
      committerAccessToken = (currentSession.user as any)?.accessToken ?? null;
    }

    committerSSH = createUserSSHIdentifier(currentSession.user);
  }

  return {
    committerName,
    committerEmail,
    committerAccessToken,
    committerSSH,
  };
};

/**
 * Calls {@link getGitCredentialsFromSession}, but sets defaults for missing values based on set bot for given {@link gitProvider}
 * @param wantedAccessTokenLevels - If the user has "weak" scope for access token (it does not matches any of the provided ones),
 *  the bot one is returned for the accessToken instead of the session one.
 */
export const getGitCredentialsFromSessionWithDefaults = (
  gitProvider: GitProvider,
  request: express.Request,
  response: express.Response,
  wantedAccessTokenLevels: ConfigType[]
): GitCredentials => {
  const {
    committerName,
    committerEmail,
    committerAccessToken,
    committerSSH
  } = getGitCredentialsFromSession(request, response, wantedAccessTokenLevels);
  const botCredentials = gitProvider.getBotCredentials();

  const isBotName = committerName === null;
  const isBotEmail = committerEmail === null;

  const accessTokens: AccessToken[] = [];

  if (committerSSH !== null) {
    accessTokens.push({
      isBotAccessToken: false,
      type: AccessTokenType.SSH,
      value: committerSSH,
    });
  }


  if (committerAccessToken !== null) {
    accessTokens.push({
      isBotAccessToken: false,
      type: AccessTokenType.PAT,
      value: committerAccessToken,
    });
  }

  if (botCredentials !== null) {
    accessTokens.push(...botCredentials.accessTokens);
  }

  return {
    name: committerName ?? botCredentials?.name ?? "uknown-name",
    isBotName,
    email: committerEmail ?? botCredentials?.email ?? "unknown-email",
    isBotEmail,
    accessTokens,
  };
};