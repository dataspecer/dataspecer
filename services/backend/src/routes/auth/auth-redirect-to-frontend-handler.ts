import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { isFrontendAllowedForAuthentication } from "../../utils/cors-related.ts";
import configuration from "../../configuration.ts";


/**
 * The final handler of auth - We are redirected to this one after authJS is done. Only purpose of this method is to redirect back to correct URL based on query part.
 * We have to do this "hack", because authJS does not allow redirecting to different URL than that set inside the OAuth App.
 */
export const authJSRedirectCallback = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    callerURL: z.string(),
  });
  const query = querySchema.parse(request.query);

  if (isFrontendAllowedForAuthentication(query.callerURL)) {
    return response.redirect(query.callerURL);
  }
  // If we didn't come from classic flow (there is no callerURL or it was invalid), we just redirect to default
  // For example if the user does signout he is put on this URL (in local build): http://localhost:3100/auth/signout?redirectURL=http://localhost:5174/
  //   By removing the query part - that is everything after ?, we get to this fallback
  const fallbackRedirectUrl = configuration.baseName ?? "https://example.com/does-not-have-set-redirect-url";
  return response.redirect(fallbackRedirectUrl);
});
