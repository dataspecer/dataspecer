import express, { NextFunction } from "express";
import { asyncHandler } from "../../utils/async-handler.ts";
import { authCallbackHandler } from "./auth-callback-handler.ts";
import { handleSignout } from "./auth-signout-handler.ts";
import { createBasicAuthConfig } from "../../authorization/auth-config.ts";
import { ExpressAuth } from "@auth/express";
import { handleSignin } from "./auth-signin-handler.ts";

/**
 * Handles all the authentication requests and calls relevant methods based on the handled url
 */
export const authHandler = asyncHandler(async (request: express.Request, response: express.Response, next: NextFunction) => {
  if (request.originalUrl.startsWith("/auth/callback/")) {
    return authCallbackHandler(request, response, next);
  }

  const isSignOut = request.originalUrl.startsWith("/auth/signout");
  const isSignIn = request.originalUrl.startsWith("/auth/signin");
  if (isSignOut) {
    return handleSignout(request, response, next);
  }
  else if (isSignIn) {
    return handleSignin(request, response, next);
  }
  else {
    // Else it is enough to work with the default read scope. We need the scope only of the signin to get the correct scope from request to GitHub.
    const authConfig = createBasicAuthConfig();
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
