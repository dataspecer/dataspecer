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

  const generalResult = await compareBackendFilesystems(
    gitProvider,
    gitProvider,
    rootIri, gitInitialDirectoryParent, mergeFromFilesystemType,
    rootIri, gitInitialDirectoryParent, mergeToFilesystemType,
  );


  // TODO RadStr: Maybe return like ds and git filesystem - but I think that it is better to just return the general result
  return generalResult;
}

export async function compareBackendFilesystems(
  mergeFromGitProvider: GitProvider | null,
  mergeToGitProvider: GitProvider | null,
  mergeFromRootIri: string, mergeFromFullPath: string, mergeFromFilesystemType: AvailableFilesystems,
  mergeToRootIri: string, mergeToFullPath: string, mergeToFilesystemType: AvailableFilesystems,
) {
  const mergeFromRootLocation: FilesystemNodeLocation = {
    iri: mergeFromRootIri,
    fullPath: mergeFromFullPath,
    fullTreePath: "",
  };
  const mergeToRootLocation: FilesystemNodeLocation = {
    iri: mergeToRootIri,
    fullPath: mergeToFullPath,
    fullTreePath: "",
  };

  const filesystemMergeFrom = await FilesystemFactory.createFileSystem([mergeFromRootLocation], mergeFromFilesystemType, mergeFromGitProvider);
  const filesystemMergeTo = await FilesystemFactory.createFileSystem([mergeToRootLocation], mergeToFilesystemType, mergeToGitProvider);

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
