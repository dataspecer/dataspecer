// TODO RadStr: ChatGPT

// // auth.js
import GitHub from "@auth/core/providers/github";
import { Auth } from "@auth/core";
import { asyncHandler } from "../utils/async-handler.ts";

import express from "express";
import { AUTH_SECRET, GITHUB_AUTH_CLIENT_ID, GITHUB_AUTH_CLIENT_SECRET } from "../git-never-commit.ts";

/**
 * @deprecated Was just testing using Auth instead of ExpressAuth
 */
export const authHandler = asyncHandler(async (req: express.Request, res: express.Response) => {
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    // body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
  });

  await Auth(request, {
    secret: AUTH_SECRET,
    providers: [
      GitHub({
        clientId: GITHUB_AUTH_CLIENT_ID,
        clientSecret: GITHUB_AUTH_CLIENT_SECRET,
      }),
    ],
    trustHost: true,
  })
});
