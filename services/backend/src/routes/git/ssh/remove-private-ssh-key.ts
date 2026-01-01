import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import express from "express";
import fs from "fs";
import { isGitProviderName } from "@dataspecer/git";
import path from "path";
import { convertToPosixPath, createUserSSHIdentifier, splitIntoLinesAndCheckForMatchingLine } from "@dataspecer/git-node";
import { pathToSSHConfigForDS, pathToSSHForDS } from "../../../utils/create-ssh-path-constants.ts";

export const deletePrivateSshKeyHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
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
  const successfullyRemoved = removePrivateSshKeyFromConfigFile(userSSHIdentifer, gitProviderLowercase);

  if (successfullyRemoved) {
    response.sendStatus(200);
  }
  else {
    response.sendStatus(404);
  }
  return;
});

function removePrivateSshKeyFromConfigFile(userSSHIdentifer: string, gitProviderLowercase: string,): boolean {
  if (gitProviderLowercase !== "github") {
    throw new Error("TODO: Currently only implementation for github");
  }
  const configIdentifier = `Host ${userSSHIdentifer}`;
  const { index, lines } = splitIntoLinesAndCheckForMatchingLine(pathToSSHConfigForDS, configIdentifier);
  if (index >= 0) {
    // Remove the entry (4 lines + 1 empty new line)
    lines.splice(index, 5);

    // Write back to file
    fs.writeFileSync(pathToSSHConfigForDS, lines.join("\n"), "utf-8");
    const privateSSHKeyFilePath = convertToPosixPath(path.normalize(`${pathToSSHForDS}/private-ssh-key-${userSSHIdentifer}`));
    fs.rmSync(privateSSHKeyFilePath);
    return true;
  }
  else {
    return false;
  }
}
