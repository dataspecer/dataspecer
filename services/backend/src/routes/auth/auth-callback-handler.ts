import { ExpressAuth } from "@auth/express";
import { asyncHandler } from "../../utils/async-handler.ts";

import express, { NextFunction } from "express";
import { createBasicAuthConfig } from "../../authorization/auth-config.ts";
import { z } from "zod";

/**
 * Handles the callbacks from the Auth Provider - that is the auth/callback/* for example (auth/callback/github), similarly for keycloak it will auth/callback/keycloak
 * These values can be found on the authJS page, for example here https://authjs.dev/reference/core/providers/keycloak#callback-url
 */
export const authCallbackHandler = asyncHandler(async (request: express.Request, response: express.Response, next: NextFunction) => {
  const querySchema = z.object({
    internalCallbackUrl: z.string(),
  });
  const query = querySchema.parse(request.query);

  // If the query is empty, then the callerURL is also empty, which results into redirecting to default URL instead of the one we came from.
  // This happens if the redirect flow was not as usual - User for some reason opened the login url without visiting the main page of dataspecer first.
  const authConfig = createBasicAuthConfig(query.internalCallbackUrl);
  const expressAuth = ExpressAuth(authConfig);
  return expressAuth(request, response, next);
});