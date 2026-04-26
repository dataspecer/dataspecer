import express from "express";
import fs from "fs";
import { resourceModel } from "../../main.ts";
import { asyncHandler } from "../../utils/async-handler.ts";
import { z } from "zod";
import { AvailableFilesystems, ExportShareableMetadataType, convertDatastoreContentBasedOnFormat, stringToBoolean } from "@dataspecer/git";
import path from "path";
import { updateBlob } from "../resource.ts";
import { v4 as uuidv4 } from "uuid";
import { DSFilesystem, isAccessibleGitRepository } from "@dataspecer/git-node";
import { currentVersion } from "../../tools/migrations/index.ts";
import configuration from "../../configuration.ts";

// All of the methods here can return accessDenied set to true if the user tries to access a filesystem path outside of the allowed ones.
// .... Otherwise, some bad actor could send in nice request that they want to access a path in Git project, but instead it will be some file completely outside.
//      For example, configuration with SSH keys.

/**
 *
 * @param pathToDatastore the path to the datastore. For Classic filesystem it is filesystem path, for DS it is the location on the Local model store.
 * @param filesystem the filesystem where we should look for the datastore
 * @param type the type of the datastore ("meta", "model", "svg" and so on).
 * @param shouldConvertToDatastoreFormat if true then converts the format to JSON and sends back JSON. Otherwise, sends back the data unchanged.
 * @param exportedBy used only for DS filesystem (and even that not really useful)
 * @param databaseMigrationVersion used only for DS filesystem and also not really useful it is jsut inserted to the metadata in case of "meta" datastore
 * @param format is the format in which is the datastore.
 * @returns Either the datastore or accessDenied if user tries to access something out of the directory that contains Git projects.
 * @todo TODO RadStr: We technically do not need the format, the conversion could be done on frontend (which is actually what we do currently) -
 *       this would be equivalent to having {@link shouldConvertToDatastoreFormat} set to true
 *
 */
export async function getDatastoreContent(
  pathToDatastore: string,
  filesystem: AvailableFilesystems,
  type: string,
  shouldConvertToDatastoreFormat: boolean,
  exportedBy: string,
  databaseMigrationVersion: number,
  format?: string
): Promise<any | {accessDenied: true}> {
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    const { isAccessible, normalizedGitPath } = isAccessibleGitRepository(pathToDatastore);
    // This is very very important, if we didn't do this, we would allow user to esentially query any file stored on server
    if (!isAccessible) {
      return { accessDenied: true };
    }
    const content = fs.readFileSync(normalizedGitPath, "utf-8");
    const convertedDatastoreContent = convertDatastoreContentBasedOnFormat(content, format ?? null, shouldConvertToDatastoreFormat, null);
    if (!convertedDatastoreContent.ok) {
      throw new Error(convertedDatastoreContent.error);
    }
    return convertedDatastoreContent.value;
  }
  else {
    return await DSFilesystem.getDatastoreContentForPath(
      resourceModel, pathToDatastore, type, format ?? null,
      shouldConvertToDatastoreFormat, exportedBy, databaseMigrationVersion
    );
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
    stringToBoolean(query.shouldConvertToDatastoreFormat), configuration.host ?? "unknown",
    currentVersion, query.format);
  if (datastoreContent?.accessDenied === true && Object.keys(datastoreContent).length === 1) {
    response.status(403);
    response.json(`Trying to access ${query.pathToDatastore}`);
    return;
  }

  response.send(datastoreContent);
});

/**
 * @param datastoreParentIri is the IRI of the parent filesystem node of the given datastore located
 *  on {@link pathToDatastore}, in given {@link filesystem} and of given {@link type}
 * @param format is the format in which is the given {@link newContent}.
 * @todo It works for DS, because there the output format is always JSON. But for classic filesystem it would not work.
 *  We would also have to provide the output format to which we should convert the data before storing.
 */
export async function updateDatastoreContent(
  datastoreParentIri: string,
  pathToDatastore: string,
  filesystem: AvailableFilesystems,
  type: string,
  newContent: string,
  mergeStateUuid: string,
  format?: string,
): Promise<{ success: boolean, accessDenied: boolean}> {
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    // TODO RadStr: Do not do anything for classic filesystem - it is not tested properly, so if somebody decides to implement the updating
    //               of the Git project, handle it all properly. It is probably not correct, since there is missing the output format
    //               the given, see the TODO of the method
    // ................... also do we ever want to even update the Git project?

    // const { isAccessible, normalizedGitPath } = isAccessibleGitRepository(pathToDatastore);
    // // This is very very important, if we didn't do this, we would user allow to esentially query any file stored on server
    // if (!isAccessible) {
    //   return { success: false, accessDenied: true };
    // }
    // const newContentConverted = convertDatastoreContentBasedOnFormat(newContent, format ?? null, true, null);
    // if (!newContentConverted.ok) {
    //   return { success: false, accessDenied: false };
    // }
    // fs.writeFileSync(normalizedGitPath, newContentConverted.value, "utf-8");
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
 * @param filesystemNodesInTreePath are all the filesystem nodes on the path to the datastore to create.
 *  Note that all of the filesysetm nodes on that path are created in the corresponding {@link filesystem}.
 *   They have new IRI. And only after that the datastore is created with given {@link content} that was in given {@link format} and put
 *   under the "last" filesystem node as a datastore.
 *
 * @param parentIri This is the actual iri of the first parent (not project iri), under which we will connect the chain of new
 * * @todo Similarly to {@link updateDatastoreContent} It works for DS, because there the output format is always JSON. But for classic filesystem it would not work.
 *  We would also have to provide the output format to which we should convert the data before storing.
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
    if (!newContentAsJSON.ok) {
      return { success: false, accessDenied: false };
    }
    await updateBlob(currentParentIri, type, newContentAsJSON.value, [mergeStateUuid]);
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
  const createdIris: string[] = [];
  if (filesystem === AvailableFilesystems.ClassicFilesystem) {
    // TODO RadStr: Also note that here you would have to use the output format, and similarly inside the CreateDatastoreFilesystemNodesData.
    //               Otherwise it would not know what format should have the files in the system.
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
    // TODO RadStr: It is unnecessary now to have implementation for Git, but maybe in future? NOw implementation for DS only
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
  else if (!datastoreContent.success) {
    response.sendStatus(400);
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
  else if (!datastoreContent.success) {
    response.sendStatus(400);
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
