import express, { NextFunction } from "express";
import { asyncHandler } from "../../utils/async-handler.ts";
import { createBasicAuthConfig } from "../../authentication/auth-config.ts";
import { ExpressAuth, ExpressAuthConfig } from "@auth/express";
import { getRedirectLink } from "./auth-handler.ts";
import { getBaseBackendUrl } from "../../utils/express-url-utils.ts";
import configuration from "../../configuration.ts";

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
      authConfig = createAuthConfigForSignout(request, request.originalUrl);
    }
    else {
      // The user clicked the signout button, we still have to check if it was not modified to something invalid or even dangerous.
      // But we do that later just before the redirect itself.
      authConfig = createAuthConfigForSignout(request, linkContainingRedirect);
    }
  }
  catch (e) {
    const dsBackendURL = getBaseBackendUrl(request);
    const fallbackRedirectUrl = configuration.baseName ?? "https://example.com/the-signout-does-not-have-set-redirect-url";
    authConfig = createBasicAuthConfig(dsBackendURL, fallbackRedirectUrl);
  }

  const expressAuth = ExpressAuth(authConfig);
  return expressAuth(request, response, next);
});

/**
 * Extracts the redirectURL from the given {@link linkContainingRedirect} and puts it into {@link ExpressAuthConfig}.
 * If these is none, sets default redirect URL.
 * @returns The {@link ExpressAuthConfig}
 */
function createAuthConfigForSignout(request: express.Request, linkContainingRedirect: string): ExpressAuthConfig {
  let authConfig: ExpressAuthConfig;

  const linkContainingRedirectAsURL = new URL(linkContainingRedirect);
  const redirectURL = linkContainingRedirectAsURL.searchParams.get("redirectURL");
  const dsBackendURL = getBaseBackendUrl(request);
  if (redirectURL !== null) {
    authConfig = createBasicAuthConfig(dsBackendURL, redirectURL);
  }
  else {
    const fallbackRedirectUrl = configuration.baseName ?? "https://example.com/the-signout-does-not-have-set-redirect-url";
    authConfig = createBasicAuthConfig(dsBackendURL, fallbackRedirectUrl);
  }

  return authConfig;
}
