import {
  AvailableFilesystems,
  compareFileTrees,
  convertMergeStateCauseToEditable,
  createRootFilesystemNodeLocation,
  FilesystemNodeLocation,
  getEditableAndNonEditableValue,
  getMetadataDatastoreFile,
  GitIgnore,
  GitIgnoreBase,
  GitProvider,
  MergeStateCause
} from "@dataspecer/git";
import { DataspecerFilesystemConstructorParams, FilesystemAbstractionFactoryMethodParams, FilesystemFactory } from "./backend-filesystem-abstraction-factory.ts";
import { SimpleGit } from "simple-git";



/**
 * Base type containing data about merge end point. It is extended by other types, which add additional fields.
 * For example, {@link MergeEndpointForComparison} and {@link MergeEndpointForStateUpdate}.
 */
type MergeEndpointBase = {
  rootIri: string;
  filesystemType: AvailableFilesystems;
  fullPathToRootParent: string;
  filesystemFactoryParams: DataspecerFilesystemConstructorParams;
}

export type MergeEndpointForComparison = {
  gitIgnore: GitIgnore | null;
} & MergeEndpointBase;

export type MergeEndpointForStateUpdate = {
  gitProvider: GitProvider | null;
  git: SimpleGit | null;
  lastCommitHash: string;
  // TODO RadStr: If we rewrite the update to only update the things which are usually changing on update, then we do not need to pass in the isBranch, since it does not change.
  isBranch: boolean;
  branch: string;
} & MergeEndpointBase


export async function compareGitAndDSFilesystems(
  gitIgnore: GitIgnore,
  rootIri: string,
  gitInitialDirectoryParent: string,
  mergeStateCause: Omit<MergeStateCause, "merge">,
  dataspecerFilesystemFactoryMethodParams: DataspecerFilesystemConstructorParams,
) {
  let mergeFromFilesystemType: AvailableFilesystems;
  let mergeToFilesystemType: AvailableFilesystems;
  let mergeFromFactoryMethodParams: DataspecerFilesystemConstructorParams;
  let mergeToFactoryMethodParams: DataspecerFilesystemConstructorParams;

  const editable = convertMergeStateCauseToEditable(mergeStateCause as MergeStateCause);
  if (editable == "mergeFrom") {
    mergeFromFilesystemType = AvailableFilesystems.DS_Filesystem;
    mergeFromFactoryMethodParams = dataspecerFilesystemFactoryMethodParams;

    mergeToFilesystemType = AvailableFilesystems.ClassicFilesystem;
    mergeToFactoryMethodParams = {
      databaseMigrationVersion: -1,
      deleteBlob: null,
      deleteResource: null,
      exportedBy: "unknown",
      resourceModel: null,
    };
  }
  else {
    mergeFromFilesystemType = AvailableFilesystems.ClassicFilesystem;
    mergeFromFactoryMethodParams = {
      databaseMigrationVersion: -1,
      deleteBlob: null,
      deleteResource: null,
      exportedBy: "unknown",
      resourceModel: null,
    };

    mergeToFilesystemType = AvailableFilesystems.DS_Filesystem;
    mergeToFactoryMethodParams = dataspecerFilesystemFactoryMethodParams;
  }

  const mergeFrom: MergeEndpointForComparison = {
    gitIgnore,
    rootIri,
    filesystemType: mergeFromFilesystemType,
    fullPathToRootParent: gitInitialDirectoryParent,
    filesystemFactoryParams: mergeFromFactoryMethodParams,
  };

  const mergeTo: MergeEndpointForComparison = {
    gitIgnore,
    rootIri,
    filesystemType: mergeToFilesystemType,
    fullPathToRootParent: gitInitialDirectoryParent,
    filesystemFactoryParams: mergeToFactoryMethodParams,
  };

  const comparisonResult = await compareBackendFilesystems(mergeFrom, mergeTo, mergeStateCause as MergeStateCause);
  return comparisonResult;
}

export async function compareBackendFilesystems(
  mergeFrom: MergeEndpointForComparison | MergeEndpointForStateUpdate,
  mergeTo: MergeEndpointForComparison | MergeEndpointForStateUpdate,
  mergeStateCause: MergeStateCause,
) {
  const mergeFromFactoryParams: FilesystemAbstractionFactoryMethodParams = {
    ...mergeFrom.filesystemFactoryParams,
    gitIgnore: getGitIgnoreFromMergeEndpoint(mergeFrom),
    roots: [createRootFilesystemNodeLocation(mergeFrom.rootIri, mergeFrom.fullPathToRootParent)],
  };
  const mergeToFactoryParams: FilesystemAbstractionFactoryMethodParams = {
    ...mergeTo.filesystemFactoryParams,
    gitIgnore: getGitIgnoreFromMergeEndpoint(mergeTo),
    roots: [createRootFilesystemNodeLocation(mergeTo.rootIri, mergeTo.fullPathToRootParent)],
  };

  // TODO RadStr: Ok here - once again - it does not work because we are expecting the path to be projectIri and not an IRI
  const filesystemMergeFrom = await FilesystemFactory.createFileSystem(mergeFrom.filesystemType, mergeFromFactoryParams);
  const filesystemMergeTo = await FilesystemFactory.createFileSystem(mergeTo.filesystemType, mergeToFactoryParams);

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

  const resultForMergeFrom = {
    fakeRoot: fakeRootMergeFrom,
    root: rootMergeFrom,
    pathToRootMeta: pathToRootMetaMergeFrom,
    filesystem: filesystemMergeFrom,
  };
  const resultForMergeTo = {
    fakeRoot: fakeRootMergeTo,
    root: rootMergeTo,
    pathToRootMeta: pathToRootMetaMergeTo,
    filesystem: filesystemMergeTo,
  };

  const editableType = convertMergeStateCauseToEditable(mergeStateCause);
  const { editable: editableFilesystem, nonEditable: nonEditableFilesystem } = getEditableAndNonEditableValue(editableType, resultForMergeFrom, resultForMergeTo);
  const diffTreeComparison = await compareFileTrees(
    nonEditableFilesystem.filesystem, nonEditableFilesystem.fakeRoot, editableFilesystem.filesystem, editableFilesystem.fakeRoot);


  return {
    diffTreeComparison,
    mergeFromFilesystemInformation: resultForMergeFrom,
    mergeToFilesystemInformation: resultForMergeTo,
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
