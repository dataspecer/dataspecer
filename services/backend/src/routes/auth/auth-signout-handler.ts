import express, { NextFunction } from "express";
import { asyncHandler } from "../../utils/async-handler.ts";
import { createBasicAuthConfig } from "../../authorization/auth-config.ts";
import { ExpressAuth, ExpressAuthConfig } from "@auth/express";
import { getRedirectLink } from "./auth-handler.ts";

/**
 * Handles the signout request. What this method does extra unlike classic auth signout is to set the correct redirect link to go to after the signout is done.
 */
export const handleSignout = asyncHandler(async (request: express.Request, response: express.Response, next: NextFunction) => {
  // Either we were redirected (the user actually clicked the signout button), therefore the redirect URL is present in the Referer's query part
  // Or the user entered the URL manually - in such case we have to check the visited URL for query part
  let authConfig: ExpressAuthConfig | null = null;
  const { redirectLink: linkContainingRedirect } = getRedirectLink(request);  // The redirectLink in this case is the link contaning the link inside query part

  try {
    if (linkContainingRedirect === "") {
      // The case when user probably went straight to the signout URL
      // We look at the URL and check if it contains the redirectURL
      authConfig = createAuthConfigForSignout(request.originalUrl);
    }
    else {
      // The user clicked the signout button, we still have to check if it was not modified to something invalid or even dangerous.
      // But we do that later just before the redirect itself.
      authConfig = createAuthConfigForSignout(linkContainingRedirect);
    }
  }
  catch (e) {
    authConfig = createBasicAuthConfig("http://localhost:5175");      // TODO RadStr: Instead of localhost:5175 use the provided (when starting up the server) allowed frontends
  }

  const expressAuth = ExpressAuth(authConfig);
  return expressAuth(request, response, next);
});

/**
 * Extracts the redirectURL from the given {@link linkContainingRedirect} and puts it into {@link ExpressAuthConfig}.
 * If these is none, sets default redirect URL.
 * @returns The {@link ExpressAuthConfig}
 */
function createAuthConfigForSignout(linkContainingRedirect: string): ExpressAuthConfig {
  let authConfig: ExpressAuthConfig;

  const linkContainingRedirectAsURL = new URL(linkContainingRedirect);
  const redirectURL = linkContainingRedirectAsURL.searchParams.get("redirectURL");
  if (redirectURL !== null) {
    authConfig = createBasicAuthConfig(redirectURL);
  }
  else {
    authConfig = createBasicAuthConfig("http://localhost:5175");      // TODO RadStr: Instead of localhost:5175 use the provided (when starting up the server) allowed frontends
  }

  return authConfig;
}