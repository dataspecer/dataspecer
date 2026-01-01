import {
  AvailableFilesystems,
  compareFileTrees,
  convertMergeStateCauseToEditable,
  FilesystemNodeLocation,
  getMetadataDatastoreFile,
  GitIgnoreBase,
  GitProvider,
  MergeStateCause
} from "@dataspecer/git";
import { FilesystemFactory } from "./backend-filesystem-abstraction-factory.ts";
import { MergeEndpointForComparison } from "../../routes/git/merge-states/create-merge-state.ts";
import { ResourceModelForFilesystemRepresentation } from "../export.ts";

export async function compareGitAndDSFilesystems(
  gitProvider: GitProvider,
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
    gitProvider,
    rootIri,
    filesystemType: mergeFromFilesystemType,
    fullPathToRootParent: gitInitialDirectoryParent,
    resourceModel: mergeFromResourceModel,
  };

  const mergeTo: MergeEndpointForComparison = {
    gitProvider,
    rootIri,
    filesystemType: mergeToFilesystemType,
    fullPathToRootParent: gitInitialDirectoryParent,
    resourceModel: mergeToResourceModel,
  };

  const generalResult = await compareBackendFilesystems(mergeFrom, mergeTo);


  // TODO RadStr: Maybe return like ds and git filesystem - but I think that it is better to just return the general result
  return generalResult;
}

export async function compareBackendFilesystems(
  mergeFrom: MergeEndpointForComparison,
  mergeTo: MergeEndpointForComparison,
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

  const mergeFromGitIgnore = mergeFrom.gitProvider === null ? null : new GitIgnoreBase(mergeFrom.gitProvider);
  const filesystemMergeFrom = await FilesystemFactory.createFileSystem([mergeFromRootLocation], mergeFrom.filesystemType, mergeFromGitIgnore, mergeFrom.resourceModel);
  const mergeToGitIgnore = mergeTo.gitProvider === null ? null : new GitIgnoreBase(mergeTo.gitProvider);
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
