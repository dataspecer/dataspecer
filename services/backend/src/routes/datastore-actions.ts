import express from "express";
import fs from "fs";
import { AvailableFilesystems } from "../export-import/filesystem-abstractions/filesystem-abstraction.ts";
import { DSFilesystem } from "../export-import/filesystem-abstractions/implementations/ds-filesystem.ts";
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import { convertDatastoreBasedOnFormat } from "../utils/git-utils.ts";
import { z } from "zod";


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

export async function getDatastoreContent(pathToDatastore: string, filesystem: AvailableFilesystems, type: string, shouldConvertToDatastoreFormat: boolean, format?: string) {
  // TODO RadStr: Run conversion on client?
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    const content = fs.readFileSync(pathToDatastore, "utf-8");
    return convertDatastoreBasedOnFormat(content, format ?? null, shouldConvertToDatastoreFormat);
  }
  else {
    return await DSFilesystem.getDatastoreContentForPath(resourceModel, pathToDatastore, type, format ?? null, shouldConvertToDatastoreFormat);
  }
}

export const getDatastoreContentDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.keys(AvailableFilesystems) as Array<keyof typeof AvailableFilesystems>;
  console.info({ availableFilesystems }); // TODO RadStr: Debug print

  const querySchema = z.object({
    pathToDatastore: z.string().min(1),
    format: z.string().min(1).optional(),
    type: z.string(),
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    shouldConvertToDatastoreFormat: z.boolean(),
  });
  const query = querySchema.parse(request.query);

  const filesystem = AvailableFilesystems[query.filesystem as keyof typeof AvailableFilesystems];
  console.info({ filesystem }); // TODO RadStr: Debug print
  const datastoreContent = await getDatastoreContent(query.pathToDatastore, filesystem, query.type, query.shouldConvertToDatastoreFormat, query.format);
  if (query.format === "json") {
    response.json(datastoreContent);
  }
  else {
    response.send(datastoreContent);
  }
});

function findPathToGitRepository(packageIri: string): string {
  throw new Error("TODO RadStr: Not implemented yet");
}

// export const modifyDatastoreContentDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
//   const availableFilesystems = Object.keys(AvailableFilesystems) as Array<keyof typeof AvailableFilesystems>;
//   console.info({ availableFilesystems }); // TODO RadStr: Debug print

//   const querySchema = z.object({
//     pathToDatastore: z.string().min(1),
//     format: z.string().min(1).optional(),
//     type: z.string(),
//     filesystem: z.enum(availableFilesystems as [string, ...string[]]),
//   });
//   const query = querySchema.parse(request.query);

//   const newContent = request.body;

//   const filesystem = AvailableFilesystems[query.filesystem as keyof typeof AvailableFilesystems];
//   console.info({ filesystem }); // TODO RadStr: Debug print
//   const datastoreContent = await setDatastoreContent(query.pathToDatastore, filesystem, query.type, query.shouldConvertToDatastoreFormat, query.format);
//   if (query.format === "json") {
//     response.json(datastoreContent);
//   }
//   else {
//     response.send(datastoreContent);
//   }
// });
