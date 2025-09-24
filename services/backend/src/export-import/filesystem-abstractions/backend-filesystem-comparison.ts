import {
  AvailableFilesystems,
  compareFileTrees,
  convertMergeStateCauseToEditable,
  FilesystemNodeLocation,
  getMetadataDatastoreFile,
  GitProvider,
  MergeStateCause
} from "@dataspecer/git";
import { FilesystemFactory } from "./backend-filesystem-abstraction-factory.ts";
import { MergeEndpointForComparison } from "../../routes/create-merge-state.ts";

export async function compareGitAndDSFilesystems(
  gitProvider: GitProvider,
  rootIri: string,
  gitInitialDirectoryParent: string,
  mergeStateCause: Omit<MergeStateCause, "merge">,
) {
  let mergeFromFilesystemType: AvailableFilesystems;
  let mergeToFilesystemType: AvailableFilesystems;
  const editable = convertMergeStateCauseToEditable(mergeStateCause as MergeStateCause);
  if (editable == "mergeFrom") {
    mergeFromFilesystemType = AvailableFilesystems.DS_Filesystem;
    mergeToFilesystemType = AvailableFilesystems.ClassicFilesystem;
  }
  else {
    mergeFromFilesystemType = AvailableFilesystems.ClassicFilesystem;
    mergeToFilesystemType = AvailableFilesystems.DS_Filesystem;
  }

  const mergeFrom: MergeEndpointForComparison = {
    gitProvider,
    rootIri,
    filesystemType: mergeFromFilesystemType,
    fullPath: gitInitialDirectoryParent,
  };

  const mergeTo: MergeEndpointForComparison = {
    gitProvider,
    rootIri,
    filesystemType: mergeToFilesystemType,
    fullPath: gitInitialDirectoryParent,
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
    fullPath: mergeFrom.fullPath,
    fullTreePath: "",
  };
  const mergeToRootLocation: FilesystemNodeLocation = {
    iri: mergeTo.rootIri,
    fullPath: mergeTo.fullPath,
    fullTreePath: "",
  };

  const filesystemMergeFrom = await FilesystemFactory.createFileSystem([mergeFromRootLocation], mergeFrom.filesystemType, mergeFrom.gitProvider);
  const filesystemMergeTo = await FilesystemFactory.createFileSystem([mergeToRootLocation], mergeTo.filesystemType, mergeTo.gitProvider);

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
    filesystemMergeFrom, fakeRootMergeFrom, filesystemMergeFrom.getGlobalFilesystemMap(),
    filesystemMergeTo, fakeRootMergeTo, filesystemMergeTo.getGlobalFilesystemMap());

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
