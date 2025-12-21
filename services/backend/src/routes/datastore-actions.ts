import express from "express";
import fs from "fs";
import { DSFilesystem } from "../export-import/filesystem-abstractions/implementations/ds-filesystem.ts";
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import { z } from "zod";
import { AvailableFilesystems, ExportShareableMetadataType, convertDatastoreContentBasedOnFormat, stringToBoolean } from "@dataspecer/git";
import path from "path";
import { updateBlob } from "./resource.ts";
import { v4 as uuidv4 } from "uuid";
import { isAccessibleGitRepository } from "../utils/git-store-info.ts";


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
    return convertDatastoreContentBasedOnFormat(content, format ?? null, shouldConvertToDatastoreFormat, null);
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
  const datastoreContent = await getDatastoreContent(
    decodeURIComponent(query.pathToDatastore), filesystem, query.type,
    stringToBoolean(query.shouldConvertToDatastoreFormat), query.format);
  if (datastoreContent?.accessDenied === true && Object.keys(datastoreContent).length === 1) {
    response.status(403);
    response.json(`Trying to access ${query.pathToDatastore}`);
    return;
  }

  response.send(datastoreContent);
});


export async function updateDatastoreContent(
  datastoreParentIri: string,
  pathToDatastore: string,
  filesystem: AvailableFilesystems,
  type: string,
  newContent: string,
  mergeStateUuid: string,
  format?: string,
): Promise<{ success: boolean, accessDenied: boolean}> {
  // TODO RadStr: Run conversion on client?
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    const { isAccessible, normalizedGitPath } = isAccessibleGitRepository(pathToDatastore);
    // This is very very important, if we didn't do this, we would user allow to esentially query any file stored on server
    if (!isAccessible) {
      return { success: false, accessDenied: true };
    }
    const newContentConverted = convertDatastoreContentBasedOnFormat(newContent, format ?? null, true, null);
    fs.writeFileSync(normalizedGitPath, newContentConverted, "utf-8");
  }
  else {
    DSFilesystem.setDatastoreContentForPath(datastoreParentIri, resourceModel, pathToDatastore, format ?? null, type, newContent, [mergeStateUuid]);
  }
  return { success: true, accessDenied: false };
}

export async function removeDatastoreContent(
  parentFilesystemNodeIri: string,
  pathToDatastore: string,
  filesystem: AvailableFilesystems,
  type: string,
  shouldRemoveFileWhenNoDatastores: boolean,
  mergeStateUuid: string,
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
    DSFilesystem.removeDatastoreContentForPath(resourceModel, parentFilesystemNodeIri, type, [mergeStateUuid]);
  }

  return { success: true, accessDenied: false };
}

/**
 * @param parentIri This is the actual iri of the first parent (not project iri), under which we will connect the chain of new
 */
export async function createDatastoreContent(
  filesystemNodesInTreePath: ExportShareableMetadataType[],
  parentIri: string,
  filesystem: AvailableFilesystems,
  type: string,
  content: string,
  mergeStateUuid: string,
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
    let currentNewIri: string;
    let currentParentIri: string = parentIri;
    for (const filesystemNodeInTreePath of filesystemNodesInTreePath) {
      currentNewIri = uuidv4();
      const userMetadata = filesystemNodeInTreePath ?? {};
      await resourceModel.createResource(currentParentIri, currentNewIri, userMetadata.types[0], userMetadata.userMetadata, userMetadata.projectIri, [mergeStateUuid]);
      currentParentIri = currentNewIri;
    }
    const newContentAsJSON = convertDatastoreContentBasedOnFormat(content, format ?? null, true, null);
    await updateBlob(currentParentIri, type, newContentAsJSON, [mergeStateUuid]);
  }
  return { success: true, accessDenied: false };
}


/**
 * @param parentIri This is the actual iri of the first parent (not project iri), under which we will connect the chain of new filesystemNodes
 */
export async function createFilesystemNodes(
  filesystemNodesInTreePath: ExportShareableMetadataType[],
  parentIri: string,
  filesystem: AvailableFilesystems,
  mergeStateUuid: string,
): Promise<{ success: boolean, accessDenied: boolean, createdIris: string[]}> {
  // TODO RadStr: Run conversion on client?

  const createdIris: string[] = [];
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    // TODO RadStr: Also note that here you would have to use the format inside the CreateDatastoreFilesystemNodesData, to convert since we pass the data as JSON object
    throw new Error("Not implemented, we would have to pass it filesystem path, which we do not need for DS");
  }
  else {
    let currentNewIri: string;
    let currentParentIri: string = parentIri;
    for (const filesystemNodeInTreePath of filesystemNodesInTreePath) {
      currentNewIri = uuidv4();
      createdIris.push(currentNewIri);
      const userMetadata = filesystemNodeInTreePath ?? {};
      await resourceModel.createResource(currentParentIri, currentNewIri, userMetadata.types[0], userMetadata.userMetadata, userMetadata.projectIri, [mergeStateUuid]);
      currentParentIri = currentNewIri;
    }
  }

  return { success: true, accessDenied: false, createdIris };
}

const removeFilesystemNode = async (
  filesystemNodeTreePath: string,
  filesystem: AvailableFilesystems,
  mergeStateUuid: string,
): Promise<{accessDenied: boolean}> => {
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    // TODO RadStr: Removal implementation only for DS. We do not need the git one anyways. The DS is enough
    throw new Error("Not implemented, we would have to pass it filesystem path, which we do not need for DS");
  }
  else {
    const lastPathPartStartIndex = filesystemNodeTreePath.lastIndexOf("/");
    const iri = lastPathPartStartIndex === -1 ? filesystemNodeTreePath : filesystemNodeTreePath.substring(lastPathPartStartIndex + 1);
    await resourceModel.deleteResource(iri, [mergeStateUuid]);
  }

  return {accessDenied: false};
}

export const removeFilesystemNodeDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.values(AvailableFilesystems);
  const querySchema = z.object({
    filesystemNodeTreePath: z.string().min(1),     // This is the actual iri of the first parent (not project iri), under which we will connect the chain of new
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    mergeStateUuid: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const filesystem: AvailableFilesystems = query.filesystem as AvailableFilesystems;

  const createdFilesystemNodesResult = await removeFilesystemNode(query.filesystemNodeTreePath, filesystem, query.mergeStateUuid);
  if (createdFilesystemNodesResult.accessDenied) {
    response.status(403);
    response.json(`Trying to access some filesystem node under the ${query.filesystemNodeTreePath}, but we are not allowed to modify anything there`);
    return;
  }

  response.sendStatus(200);
  return;
});


export const createFilesystemNodesDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.values(AvailableFilesystems);
  const bodySchema = z.object({
    createdFilesystemNodesInTreePath: z.array(
      z.object({
        projectIri: z.string(),
        types: z.array(z.string()),
        userMetadata: z.object({}).catchall(z.any()),
      }).catchall(z.any())  // allows arbitrary extra keys of any type,
    ),
    parentIri: z.string().min(1),     // This is the actual iri of the first parent (not project iri), under which we will connect the chain of new
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    mergeStateUuid: z.string().min(1),
  });
  const body = bodySchema.parse(request.body);

  const filesystem: AvailableFilesystems = body.filesystem as AvailableFilesystems;

  const createdFilesystemNodesResult = await createFilesystemNodes(body.createdFilesystemNodesInTreePath, body.parentIri, filesystem, body.mergeStateUuid);
  if (createdFilesystemNodesResult.accessDenied) {
    response.status(403);
    response.json(`Trying to access some filesystem node under the ${body.parentIri}, but we are not allowed to modify anything there`);
    return;
  }

  response.status(200).json(createdFilesystemNodesResult.createdIris);
  return;
});


export const updateDatastoreContentDirectly = asyncHandler(async (request: express.Request, response: express.Response) => {
  const availableFilesystems = Object.values(AvailableFilesystems);

  const bodySchema = z.object({
    datastoreParentIri: z.string().min(1),
    pathToDatastore: z.string().min(1),
    format: z.string().min(1).optional(),
    type: z.string(),
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    newContent: z.string(),
    mergeStateUuid: z.string().min(1),
  });
  const body = bodySchema.parse(request.body);

  const filesystem: AvailableFilesystems = body.filesystem as AvailableFilesystems;
  const datastoreContent = await updateDatastoreContent(body.datastoreParentIri, body.pathToDatastore, filesystem, body.type, body.newContent, body.mergeStateUuid, body.format);
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
        projectIri: z.string(),
        types: z.array(z.string()),
        userMetadata: z.object({}).catchall(z.any()),
      }).catchall(z.any())   // allows arbitrary extra keys of any type,
    ),
    parentIri: z.string().min(1),     // This is the actual iri of the first parent (not project iri), under which we will connect the chain of new
    filesystem: z.enum(availableFilesystems as [string, ...string[]]),
    type: z.string(),
    content: z.string(),
    format: z.string().optional(),
    mergeStateUuid: z.string().min(1),
  });
  const body = bodySchema.parse(request.body);

  const filesystem: AvailableFilesystems = body.filesystem as AvailableFilesystems;

  const datastoreContent = await createDatastoreContent(body.createdFilesystemNodesInTreePath, body.parentIri, filesystem, body.type, body.content, body.mergeStateUuid, body.format);
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
    mergeStateUuid: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const decodedPathToDatastore = decodeURIComponent(query.pathToDatastore);
  const filesystem: AvailableFilesystems = query.filesystem as AvailableFilesystems;
  const shouldRemoveFileWhenNoDatastores = stringToBoolean(query.shouldRemoveFileWhenNoDatastores);

  const datastoreContent = await removeDatastoreContent(query.filesystemNodeIri, decodedPathToDatastore, filesystem, query.type, shouldRemoveFileWhenNoDatastores, query.mergeStateUuid);
  if (datastoreContent.accessDenied) {
    response.status(403);
    response.json(`Trying to access ${query.pathToDatastore}`);
    return;
  }

  response.sendStatus(200);
  return;
});
