import express, { NextFunction } from "express";
import { asyncHandler } from "../../utils/async-handler.ts";
import { authCallbackHandler } from "./auth-callback-handler.ts";
import { handleSignout } from "./auth-signout-handler.ts";
import { createBasicAuthConfig } from "../../authentication/auth-config.ts";
import { ExpressAuth } from "@auth/express";
import { handleSignin } from "./auth-signin-handler.ts";
import { stripApiPrefixFromUrl } from "@dataspecer/git-node";
import { getBaseBackendUrl } from "../../utils/express-url-utils.ts";

/**
 * Handles all the authentication requests and calls relevant methods based on the handled url
 */
export const authHandler = asyncHandler(async (request: express.Request, response: express.Response, next: NextFunction) => {
  // We do this if because of express v5, the v4 has the "0" filled with the path that the * matched
  // and also in v5 it is array instead of just string
  // This fix may not be completely correct though, possible TODO PR:.
  // The code itself that causes the issue in the auth library is this: getBasePath(req) {return req.baseUrl.split(req.params[0])[0].replace(/\/$/, "");}
  if (request.params.splat && request.params[0] === undefined) {
    request.params[0] = Array.isArray(request.params.splat)
      ? request.params.splat.join("/")
      : request.params.splat;
  }

  const strippedOriginalUrl = stripApiPrefixFromUrl(request.originalUrl);
  if (strippedOriginalUrl.startsWith("/auth/callback/")) {
    return authCallbackHandler(request, response, next);
  }

  const isSignOut = strippedOriginalUrl.startsWith("/auth/signout");
  const isSignIn = strippedOriginalUrl.startsWith("/auth/signin");
  if (isSignOut) {
    return handleSignout(request, response, next);
  }
  else if (isSignIn) {
    return handleSignin(request, response, next);
  }
  else {
    // Else it is enough to work with the default read scope. We need the scope only of the signin to get the correct scope from request to GitHub.
    const dsBackendURL = getBaseBackendUrl(request);
    const authConfig = createBasicAuthConfig(dsBackendURL);
    const expressAuth = ExpressAuth(authConfig);
    return expressAuth(request, response, next);
  }
});

export function getRedirectLink(request: express.Request): {redirectLink: string} {
  const redirectLink = request.get("Referer") ?? "";        // The URL from which we were possibly redirected, For Example:
                                                            // When at auth/signin and then clicking the GitHub, redirects us to auth/signin/github but without the query part
  return {
    redirectLink,
  };
}
