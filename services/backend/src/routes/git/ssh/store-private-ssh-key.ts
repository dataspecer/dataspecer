import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import express from "express";
import { isGitProviderName } from "@dataspecer/git";
import { createUserSSHIdentifier, storeNewPrivateSSHKeyToBackend } from "@dataspecer/git-node";
import { pathToSSHConfigForDS, pathToSSHForDS } from "../../../utils/create-ssh-path-constants.ts";

export const storePrivateSSHKeyHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
  const bodySchema = z.object({
    privateSSHKey: z.string().min(1),
    gitProviderLowercase: z.string().min(1),
  });

  const authenticatedUser = response.locals.session?.user;
  if (authenticatedUser === undefined) {
    response.sendStatus(401);
    return;
  }
  const userSSHIdentifer = createUserSSHIdentifier(authenticatedUser);

  const { privateSSHKey, gitProviderLowercase } = bodySchema.parse(request.body);

  if (!isGitProviderName(gitProviderLowercase)) {
    response.status(400).json("Not a valid git provider");
    return;
  }
  storeNewPrivateSSHKeyToBackend(privateSSHKey, userSSHIdentifer, gitProviderLowercase, pathToSSHForDS, pathToSSHConfigForDS);

  response.sendStatus(200);
  return;
});
