import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";
import { FilesystemFactory } from "../export-import/filesystem-abstractions/backend-filesystem-abstraction-factory.ts";
import { AvailableFilesystems, compareFileTrees, EditableType, FilesystemNodeLocation, getMetadataDatastoreFile, MergeStateCause } from "@dataspecer/git";


export const createMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    mergeFromIri: z.string().min(1),
    mergeToIri: z.string().min(1),
  });

  console.info("TODO RadStr: createMergeState");    // TODO RadStr: Debug print

  const { mergeFromIri, mergeToIri } = querySchema.parse(request.query);

  const uuid = await computeMergeStateForIris(mergeFromIri, mergeToIri);

  const mergeState = await mergeStateModel.getMergeStateFromUUID(uuid, false);

  if (mergeState === null) {
    response.status(400).send({error: `Can not create new merge state for merge from iri ${mergeFromIri} and merge to iri ${mergeToIri}.
      It might have been server error, but most-likely you just provided bad iris.`});
    return;
  }


  response.status(200);
  response.json(mergeState);
  return;
});



export async function computeMergeStateForIris(
  mergeFromIri: string,
  mergeToIri: string,
): Promise<string> {
  const mergeFromRootLocation: FilesystemNodeLocation = {
    iri: mergeFromIri,
    fullPath: "",
    fullTreePath: "",
  };
  const mergeToRootLocation: FilesystemNodeLocation = {
    iri: mergeToIri,
    fullPath: "",
    fullTreePath: "",
  };

  const mergeFromDSFilesystem = await FilesystemFactory.createFileSystem([mergeFromRootLocation], AvailableFilesystems.DS_Filesystem, null);
  const mergeToDSFilesystem = await FilesystemFactory.createFileSystem([mergeToRootLocation], AvailableFilesystems.DS_Filesystem, null);

  const mergeFromFakeRoot = mergeFromDSFilesystem.getRoot();
  const mergeToFakeRoot = mergeToDSFilesystem.getRoot();
  const mergeFromRoot = Object.values(mergeFromFakeRoot.content)[0];
  const mergeToRoot = Object.values(mergeToFakeRoot.content)[0];
  const mergefromPathToRootMeta = getMetadataDatastoreFile(mergeFromRoot.datastores)?.fullPath;
  const mergeToPathToRootMeta = getMetadataDatastoreFile(mergeToRoot.datastores)?.fullPath;
  if (mergefromPathToRootMeta === undefined) {
    throw new Error("The meta file for merge from root is not present");
  }
  else if (mergeToPathToRootMeta === undefined) {
    throw new Error("The meta file for merge to root is not present");
  }

  const {
    diffTree,
    diffTreeSize,
    changed,
    conflicts,
    created,
    removed
  } = await compareFileTrees(
    mergeFromDSFilesystem, mergeFromFakeRoot, mergeFromDSFilesystem.getGlobalFilesystemMap(),
    mergeToDSFilesystem, mergeToFakeRoot, mergeToDSFilesystem.getGlobalFilesystemMap());

  await mergeStateModel.clearTable();     // TODO RadStr: Debug

  const editable: EditableType = "mergeTo";
  const mergeStateCause: MergeStateCause = "merge";

  const mergeStateInput = {
    lastCommonCommitHash: "",        // TODO RadStr: I don't know, we probably should set the hashes
    mergeStateCause,
    editable,
    rootIriMergeFrom: mergeFromIri,
    rootFullPathToMetaMergeFrom: mergefromPathToRootMeta,
    lastCommitHashMergeFrom: "",        // TODO RadStr: I don't know, we probably should set the hashes
    filesystemTypeMergeFrom: AvailableFilesystems.DS_Filesystem,
    //
    rootIriMergeTo: mergeToIri,
    rootFullPathToMetaMergeTo: mergeToPathToRootMeta,
    lastCommitHashMergeTo: "",        // TODO RadStr: I don't know, we probably should set the hashes
    filesystemTypeMergeTo: AvailableFilesystems.DS_Filesystem,
    changedInEditable: changed,
    removedInEditable: removed,
    createdInEditable: created,
    conflicts: conflicts,
    diffTree,
    diffTreeSize,
  };

  // TODO RadStr: Just debug
  const mergeStateId = await mergeStateModel.createMergeState(mergeStateInput);

  return mergeStateId;
}