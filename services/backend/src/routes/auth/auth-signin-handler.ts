import { ExpressAuth, ExpressAuthConfig } from "@auth/express";
import { asyncHandler } from "../../utils/async-handler.ts";

import express, { NextFunction } from "express";
import { createAuthConfigWithCorrectPermissions, createBasicAuthConfig } from "../../authorization/auth-config.ts";
import { getRedirectLink } from "./auth-handler.ts";
import { z } from "zod";
import { ConfigType } from "@dataspecer/git";
import { getBaseUrl } from "../../utils/git-utils.ts";

/**
 * Handles the signin request by calling the {@link ExpressAuth} with correct configuration based on request.
 */
export const handleSignin = asyncHandler(async (request: express.Request, response: express.Response, next: NextFunction) => {
  let authConfig: ExpressAuthConfig | null = null;
  const { redirectLink } = getRedirectLink(request);

  const querySchema = z.object({
    authPermissions: z.string().optional(),
  });

  if (request.originalUrl === "/auth/signin" || request.originalUrl === "/auth/signin/" || request.originalUrl.startsWith("/auth/signin?")) {
    // This if represents the first part of signin process - after clicking the signin inside manager
    const query = querySchema.parse(request.query);
    const authPermissions = query.authPermissions;
    const dsBackendURL = getBaseUrl(request);

    if (authPermissions === undefined || authPermissions.length === 0) {
      authConfig = createBasicAuthConfig(dsBackendURL, redirectLink);
    }
    else {
      authConfig = createAuthConfigWithCorrectPermissions(authPermissions, dsBackendURL, redirectLink);
    }
  }
  else if (request.originalUrl.startsWith("/auth/signin/") && request.originalUrl.length > "/auth/signin/".length) {
    // Now we are in the second part of signin - we clicked the provider.
    // We have to check to link inside the body of the request, which has set callbackUrl by the authJS.
    // There is stored our redirect link from the previous call.

    // Get callback (redirect) url from the body
    const callbackUrlAsUrl = new URL(request.body.callbackUrl);
    const callerURL = callbackUrlAsUrl.searchParams.get("callerURL") ?? undefined;
    // Get the auth scope from the redirect, it is the link which we visited in the first step - so it has the permissions inside authPermissions
    const redirectLinkAsURL = new URL(redirectLink);
    const authPermissions = redirectLinkAsURL.searchParams.get("authPermissions") ?? ConfigType.LoginInfo.toString();
    // Get Auth config
    const dsBackendURL = getBaseUrl(request);
    authConfig = createAuthConfigWithCorrectPermissions(authPermissions, dsBackendURL, callerURL);
  }
  else {
    throw new Error("Processing signin, however the url is actually not a signin");        // TODO RadStr: Better error handling
  }


  const expressAuth = ExpressAuth(authConfig);
  return expressAuth(request, response, next);
});
