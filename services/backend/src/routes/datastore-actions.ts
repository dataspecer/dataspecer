import express from "express";
import fs from "fs";
import { DSFilesystem } from "../export-import/filesystem-abstractions/implementations/ds-filesystem.ts";
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import { convertDatastoreContentBasedOnFormat, stringToBoolean } from "../utils/git-utils.ts";
import { z } from "zod";
import { isAccessibleGitRepository } from "../models/git-store-info.ts";
import { AvailableFilesystems } from "@dataspecer/git";


// export async function setDatastoreContent(pathToDatastore: string, filesystem: AvailableFilesystems, type: string, newContent: string, format?: string) {
//   throw new Error("TODO:");

//   // TODO RadStr: Run conversion on client?
//   if (filesystem === AvailableFilesystems.ClassicFilesystem) {
//     const content = fs.readFileSync(pathToDatastore, "utf-8");
//     return convertDatastoreBasedOnFormat(content, format ?? null, shouldConvertToDatastoreFormat);
//   }
//   else {
//     return await DSFilesystem.getDatastoreContentForPath(resourceModel, pathToDatastore, type, format ?? null, shouldConvertToDatastoreFormat);
//   }
// }

export async function getDatastoreContent(
  pathToDatastore: string,
  filesystem: AvailableFilesystems,
  type: string,
  shouldConvertToDatastoreFormat: boolean,
  format?: string
): Promise<any | {accessDenied: true}> {
  // TODO RadStr: Run conversion on client?
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    const { isAccessible, normalizedGitPath } = isAccessibleGitRepository(pathToDatastore);
    // This is very very important, if we didn't do this, we would user allow to esentially query any file stored on server
    if (!isAccessible) {
      return { accessDenied: true };
    }
    const content = fs.readFileSync(normalizedGitPath, "utf-8");
    return convertDatastoreContentBasedOnFormat(content, format ?? null, shouldConvertToDatastoreFormat);
  }
  else {
    return await DSFilesystem.getDatastoreContentForPath(resourceModel, pathToDatastore, type, format ?? null, shouldConvertToDatastoreFormat);
  }
}

export const getDatastoreContentDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.values(AvailableFilesystems);

  const querySchema = z.object({
    pathToDatastore: z.string().min(1),
    format: z.string().min(1).optional(),
    type: z.string(),
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    shouldConvertToDatastoreFormat: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const filesystem: AvailableFilesystems = query.filesystem as AvailableFilesystems;
  const datastoreContent = await getDatastoreContent(decodeURIComponent(query.pathToDatastore), filesystem, query.type, stringToBoolean(query.shouldConvertToDatastoreFormat), query.format);
  if (datastoreContent?.accessDenied === true && Object.keys(datastoreContent).length === 1) {
    response.status(403);
    response.json(`Trying to access ${query.pathToDatastore}`);
    return;
  }

  if (query.format === "json") {
    response.json(datastoreContent);
  }
  else {
    response.send(datastoreContent);
  }
});


export async function setDatastoreContent(
  pathToDatastore: string,
  filesystem: AvailableFilesystems,
  type: string,
  newContent: string,
  format?: string
): Promise<boolean | {accessDenied: true}> {
  // TODO RadStr: Run conversion on client?
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    const { isAccessible, normalizedGitPath } = isAccessibleGitRepository(pathToDatastore);
    // This is very very important, if we didn't do this, we would user allow to esentially query any file stored on server
    if (!isAccessible) {
      return { accessDenied: true };
    }
    const newContentConverted = convertDatastoreContentBasedOnFormat(newContent, format ?? null, true);
    fs.writeFileSync(normalizedGitPath, newContentConverted, "utf-8");
  }
  else {
    fix set and correctly return boolean
    return await DSFilesystem.getDatastoreContentForPath(resourceModel, pathToDatastore, type, format ?? null, shouldConvertToDatastoreFormat);
  }
}


export const updateDatastoreContentDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.values(AvailableFilesystems);

  const bodySchema = z.object({
    pathToDatastore: z.string().min(1),
    format: z.string().min(1).optional(),
    type: z.string(),
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    newContent: z.string().min(1),        // TODO RadStr: Or object?
  });
  const body = bodySchema.parse(request.body);

  const filesystem: AvailableFilesystems = body.filesystem as AvailableFilesystems;
  const datastoreContent = await setDatastoreContent(body.pathToDatastore, filesystem, body.type, body.newContent, body.format);
  if (datastoreContent?.accessDenied === true && Object.keys(datastoreContent).length === 1) {
    response.status(403);
    response.json(`Trying to access ${body.pathToDatastore}`);
    return;
  }
});
