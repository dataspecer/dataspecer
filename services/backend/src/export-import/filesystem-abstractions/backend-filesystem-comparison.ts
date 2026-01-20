import {
  AvailableFilesystems,
  compareFileTrees,
  convertMergeStateCauseToEditable,
  FilesystemNodeLocation,
  getMetadataDatastoreFile,
  GitIgnore,
  GitIgnoreBase,
  MergeStateCause
} from "@dataspecer/git";
import { FilesystemFactory } from "./backend-filesystem-abstraction-factory.ts";
import { ResourceModelForFilesystemRepresentation } from "../export.ts";
import { MergeEndpointForComparison, MergeEndpointForStateUpdate } from "../../models/merge-state-model.ts";

export async function compareGitAndDSFilesystems(
  gitIgnore: GitIgnore,
  rootIri: string,
  gitInitialDirectoryParent: string,
  mergeStateCause: Omit<MergeStateCause, "merge">,
  resourceModelForDSFilesystem: ResourceModelForFilesystemRepresentation,
) {
  let mergeFromFilesystemType: AvailableFilesystems;
  let mergeToFilesystemType: AvailableFilesystems;
  let mergeFromResourceModel: ResourceModelForFilesystemRepresentation | null;
  let mergeToResourceModel: ResourceModelForFilesystemRepresentation | null;

  const editable = convertMergeStateCauseToEditable(mergeStateCause as MergeStateCause);
  if (editable == "mergeFrom") {
    mergeFromFilesystemType = AvailableFilesystems.DS_Filesystem;
    mergeFromResourceModel = resourceModelForDSFilesystem;

    mergeToFilesystemType = AvailableFilesystems.ClassicFilesystem;
    mergeToResourceModel = null;
  }
  else {
    mergeFromFilesystemType = AvailableFilesystems.ClassicFilesystem;
    mergeFromResourceModel = null;

    mergeToFilesystemType = AvailableFilesystems.DS_Filesystem;
    mergeToResourceModel = resourceModelForDSFilesystem;
  }

  const mergeFrom: MergeEndpointForComparison = {
    gitIgnore,
    rootIri,
    filesystemType: mergeFromFilesystemType,
    fullPathToRootParent: gitInitialDirectoryParent,
    resourceModel: mergeFromResourceModel,
  };

  const mergeTo: MergeEndpointForComparison = {
    gitIgnore,
    rootIri,
    filesystemType: mergeToFilesystemType,
    fullPathToRootParent: gitInitialDirectoryParent,
    resourceModel: mergeToResourceModel,
  };

  const generalResult = await compareBackendFilesystems(mergeFrom, mergeTo);
  return generalResult;
}

export async function compareBackendFilesystems(
  mergeFrom: MergeEndpointForComparison | MergeEndpointForStateUpdate,
  mergeTo: MergeEndpointForComparison | MergeEndpointForStateUpdate,
) {
  const mergeFromRootLocation: FilesystemNodeLocation = {
    iri: mergeFrom.rootIri,
    fullPath: mergeFrom.fullPathToRootParent,
    irisTreePath: "",
    projectIrisTreePath: "",
  };
  const mergeToRootLocation: FilesystemNodeLocation = {
    iri: mergeTo.rootIri,
    fullPath: mergeTo.fullPathToRootParent,
    irisTreePath: "",
    projectIrisTreePath: "",
  };

  let mergeFromGitIgnore: GitIgnore | null = getGitIgnoreFromMergeEndpoint(mergeFrom);
  let mergeToGitIgnore: GitIgnore | null = getGitIgnoreFromMergeEndpoint(mergeTo);
  const filesystemMergeFrom = await FilesystemFactory.createFileSystem([mergeFromRootLocation], mergeFrom.filesystemType, mergeFromGitIgnore, mergeFrom.resourceModel);
  const filesystemMergeTo = await FilesystemFactory.createFileSystem([mergeToRootLocation], mergeTo.filesystemType, mergeToGitIgnore, mergeTo.resourceModel);

  const fakeRootMergeFrom = filesystemMergeFrom.getRoot();
  const fakeRootMergeTo = filesystemMergeTo.getRoot();
  const rootMergeFrom = Object.values(fakeRootMergeFrom.content)[0];
  const rootMergeTo = Object.values(fakeRootMergeTo.content)[0];
  const pathToRootMetaMergeFrom = getMetadataDatastoreFile(rootMergeFrom.datastores)?.fullPath;
  const pathToRootMetaMergeTo = getMetadataDatastoreFile(rootMergeTo.datastores)?.fullPath;
  if (pathToRootMetaMergeFrom === undefined) {
    throw new Error("The meta file for merge from root is not present");
  }
  else if (pathToRootMetaMergeTo === undefined) {
    throw new Error("The meta file for merge to root is not present");
  }

  const diffTreeComparisonResult = await compareFileTrees(
    filesystemMergeFrom, fakeRootMergeFrom,
    filesystemMergeTo, fakeRootMergeTo);

  return {
    diffTreeComparisonResult,
    filesystemMergeFrom,
    fakeRootMergeFrom,
    rootMergeFrom,
    pathToRootMetaMergeFrom,
    filesystemMergeTo,
    fakeRootMergeTo,
    rootMergeTo,
    pathToRootMetaMergeTo,
  };
}

function getGitIgnoreFromMergeEndpoint(mergeEndpoint: MergeEndpointForComparison | MergeEndpointForStateUpdate): GitIgnore | null {
  const isComparisonType = (mergeEndpoint as MergeEndpointForComparison)?.gitIgnore !== undefined;
  let gitIgnore: GitIgnore | null;
  if (isComparisonType) {
    gitIgnore = (mergeEndpoint as MergeEndpointForComparison).gitIgnore;
  }
  else {
    const convertedMergeFrom = mergeEndpoint as MergeEndpointForStateUpdate;
    gitIgnore = convertedMergeFrom.gitProvider === null ? null : new GitIgnoreBase(convertedMergeFrom.gitProvider);
  }

  return gitIgnore;
}