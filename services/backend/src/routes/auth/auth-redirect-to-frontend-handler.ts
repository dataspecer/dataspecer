import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { isFrontendAllowedForAuthentication } from "../../utils/cors-related.ts";


/**
 * The final handler of auth - We are redirected to this one after authJS is done. Only purpose of this method is to redirect back to correct URL based on query part.
 * We have to do this "hack", because authJS does not allow redirecting to different URL than that set inside the OAuth App.
 */
export const authJSRedirectCallback = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    callerURL: z.string(),
  });
  const query = querySchema.parse(request.query);

  // If we didn't come from classic flow (there is no callerURL or it was invalid), we just redirect to default
  if (isFrontendAllowedForAuthentication(query.callerURL)) {
    return response.redirect(query.callerURL);
  }
  return response.redirect("http://localhost:5175");    // TODO RadStr: Instead of localhost:5175 use the provided (when starting up the server) allowed frontends
});
