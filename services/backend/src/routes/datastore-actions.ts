import express from "express";
import fs from "fs";
import { DSFilesystem } from "../export-import/filesystem-abstractions/implementations/ds-filesystem.ts";
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import { stringToBoolean } from "../utils/git-utils.ts";
import { z } from "zod";
import { isAccessibleGitRepository } from "../models/git-store-info.ts";
import { AvailableFilesystems, CreateDatastoreFilesystemNodesInfo, convertDatastoreContentBasedOnFormat } from "@dataspecer/git";
import path from "path";
import { updateBlob } from "./resource.ts";


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
    // This is very very important, if we didn't do this, we would allow user to esentially query any file stored on server
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

  response.send(datastoreContent);
});


export async function updateDatastoreContent(
  pathToDatastore: string,
  filesystem: AvailableFilesystems,
  type: string,
  newContent: string,
  format?: string
): Promise<{ success: boolean, accessDenied: boolean}> {
  // TODO RadStr: Run conversion on client?
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    const { isAccessible, normalizedGitPath } = isAccessibleGitRepository(pathToDatastore);
    // This is very very important, if we didn't do this, we would user allow to esentially query any file stored on server
    if (!isAccessible) {
      return { success: false, accessDenied: true };
    }
    const newContentConverted = convertDatastoreContentBasedOnFormat(newContent, format ?? null, true);
    fs.writeFileSync(normalizedGitPath, newContentConverted, "utf-8");
  }
  else {
    DSFilesystem.setDatastoreContentForPath(resourceModel, pathToDatastore, format ?? null, type, newContent);
  }
  return { success: true, accessDenied: false };
}

export async function removeDatastoreContent(
  parentFilesystemNodeIri: string,
  pathToDatastore: string,
  filesystem: AvailableFilesystems,
  type: string,
  shouldRemoveFileWhenNoDatastores: boolean,
): Promise<{ success: boolean, accessDenied: boolean}> {
  // TODO RadStr: Run conversion on client?
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    const { isAccessible, normalizedGitPath } = isAccessibleGitRepository(pathToDatastore);
    // This is very very important, if we didn't do this, we would user allow to esentially query any file stored on server
    if (!isAccessible) {
      return { success: false, accessDenied: true };
    }
    fs.unlinkSync(normalizedGitPath);
    if (shouldRemoveFileWhenNoDatastores) {
      const parentDirectory = path.dirname(normalizedGitPath);
      const stats = fs.statSync(parentDirectory);
      if (stats.isDirectory()) {
        if (fs.readdirSync(parentDirectory).length === 0) {
          fs.rmdirSync(parentDirectory);
        }
      }
    }
  }
  else {
    DSFilesystem.removeDatastoreContentForPath(resourceModel, parentFilesystemNodeIri, type);
  }

  return { success: true, accessDenied: false };
}

export async function createDatastoreContent(
  filesystemNodesInTreePath: CreateDatastoreFilesystemNodesInfo[],
  filesystem: AvailableFilesystems,
  type: string,
  content: string,
  format?: string,
): Promise<{ success: boolean, accessDenied: boolean}> {
  // TODO RadStr: Run conversion on client?
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    throw new Error("Not implemented, we would have to pass it filesystem path, which we do not need for DS");
    // const { isAccessible, normalizedGitPath } = isAccessibleGitRepository(pathToDatastore);
    // // This is very very important, if we didn't do this, we would user allow to esentially query any file stored on server
    // if (!isAccessible) {
    //   return { success: false, accessDenied: true };
    // }
    // const newContentConverted = convertDatastoreContentBasedOnFormat(newContent, format ?? null, true);
    // // Note that here do not create the metafiles .... however we don't actually really need to modify the git directory in the current implementation.
    // // So that is future work if someones decides to create files in git path
    // fs.mkdirSync(path.dirname(normalizedGitPath), { recursive: true });
    // fs.writeFileSync(normalizedGitPath, newContentConverted, {encoding: "utf-8"});
  }
  else {
    let lastFilesystemNode = filesystemNodesInTreePath[0];
    for (const filesystemNodeInTreePath of filesystemNodesInTreePath) {
      const userMetadata = filesystemNodeInTreePath.userMetadata;
      resourceModel.createResource(filesystemNodeInTreePath.parentIri, filesystemNodeInTreePath.iri, userMetadata.types[0], userMetadata.userMetadata);
      lastFilesystemNode = filesystemNodeInTreePath;
    }
    const newContentConverted = convertDatastoreContentBasedOnFormat(content, format ?? null, true);
    const contentAsJSON = JSON.parse(newContentConverted);
    await updateBlob(lastFilesystemNode.iri, type, contentAsJSON);
  }
  return { success: true, accessDenied: false };
}


export const updateDatastoreContentDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.values(AvailableFilesystems);

  const bodySchema = z.object({
    pathToDatastore: z.string().min(1),
    format: z.string().min(1).optional(),
    type: z.string(),
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    newContent: z.string(),
  });
  const body = bodySchema.parse(request.body);

  const filesystem: AvailableFilesystems = body.filesystem as AvailableFilesystems;
  const datastoreContent = await updateDatastoreContent(body.pathToDatastore, filesystem, body.type, body.newContent, body.format);
  if (datastoreContent.accessDenied) {
    response.status(403);
    response.json(`Trying to access ${body.pathToDatastore}`);
    return;
  }

  response.sendStatus(200);
  return;
});


export const createDatastoreContentDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.values(AvailableFilesystems);

  const bodySchema = z.object({
    createdFilesystemNodesInTreePath: z.array(
      z.object({
        parentIri: z.string().min(1),
        iri: z.string().min(1),
        treePath: z.string().min(1),
        userMetadata: z.record(z.string()),
      })
    ),
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    type: z.string(),
    content: z.string(),
    format: z.string().optional(),
  });
  const body = bodySchema.parse(request.body);

  const filesystem: AvailableFilesystems = body.filesystem as AvailableFilesystems;

  const datastoreContent = await createDatastoreContent(body.createdFilesystemNodesInTreePath, filesystem, body.type, body.content, body.format);
  if (datastoreContent.accessDenied) {
    response.status(403);
    response.json(`Trying to access ${body.type}`);
    return;
  }

  response.sendStatus(200);
  return;
});


export const removeDatastoreContentDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.values(AvailableFilesystems);

  const querySchema = z.object({
    filesystemNodeIri: z.string().min(1),
    pathToDatastore: z.string().min(1),
    type: z.string(),
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    shouldRemoveFileWhenNoDatastores: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const decodedPathToDatastore = decodeURIComponent(query.pathToDatastore);
  const filesystem: AvailableFilesystems = query.filesystem as AvailableFilesystems;
  const shouldRemoveFileWhenNoDatastores = stringToBoolean(query.shouldRemoveFileWhenNoDatastores);

  const datastoreContent = await removeDatastoreContent(query.filesystemNodeIri, decodedPathToDatastore, filesystem, query.type, shouldRemoveFileWhenNoDatastores);
  if (datastoreContent.accessDenied) {
    response.status(403);
    response.json(`Trying to access ${query.pathToDatastore}`);
    return;
  }

  response.sendStatus(200);
  return;
});
