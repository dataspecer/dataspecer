import { asyncHandler } from "../../../utils/async-handler.ts";
import express from "express";
import { z } from "zod";
import { GitProviderNamesAsType, isGitProviderName } from "@dataspecer/git";
import { createUserSSHIdentifier, splitIntoLinesAndCheckForMatchingLine } from "@dataspecer/git-node";
import { pathToSSHConfigForDS } from "../../../utils/create-ssh-path-constants.ts";

export const checkExistenceOfSshKeyForUserHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    gitProviderLowercase: z.string().min(1),
  });

  const authenticatedUser = response.locals.session?.user;
  if (authenticatedUser === undefined) {
    response.sendStatus(401);
    return;
  }
  const userSSHIdentifer = createUserSSHIdentifier(authenticatedUser);
  if (userSSHIdentifer === null) {
    response.sendStatus(401);
    return;
  }

  const { gitProviderLowercase } = querySchema.parse(request.query);

  if (!isGitProviderName(gitProviderLowercase)) {
    response.status(400).json("Not a valid git provider");
    return;
  }

  const hasSetSsh = checkExistenceOfSshKeyForUser(userSSHIdentifer, gitProviderLowercase);

  if (hasSetSsh) {
    response.sendStatus(200);
  }
  else {
    response.sendStatus(404);
  }
  return;
});


function checkExistenceOfSshKeyForUser(userSSHIdentifer: string, gitProviderLowercase: GitProviderNamesAsType): boolean {
  if (gitProviderLowercase !== "github") {
    throw new Error("TODO: Currently only implementation for github");
  }
  const configIdentifier = `Host ${userSSHIdentifer}`;
  return splitIntoLinesAndCheckForMatchingLine(pathToSSHConfigForDS, configIdentifier).index >= 0;
}
