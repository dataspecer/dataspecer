import {
  AvailableFilesystems,
  compareFileTrees,
  convertMergeStateCauseToEditable,
  createRootFilesystemNodeLocation,
  CreateRootFilesystemNodeParams,
  getEditableAndNonEditableValue,
  getMetadataDatastoreFile,
  GitIgnore,
  GitIgnoreBase,
  GitProvider,
  MergeStateCause
} from "@dataspecer/git";
import { DsFsConstructorParams, FilesystemFactoryMethodParams, FilesystemFactory } from "./backend-filesystem-abstraction-factory.ts";
import { SimpleGit } from "simple-git";



/**
 * Base type containing data about merge end point. It is extended by other types, which add additional fields.
 * For example, {@link MergeEndpointForComparison} and {@link MergeEndpointForStateUpdate}.
 */
type MergeEndpointBase = {
  rootIri: string;
  filesystemType: AvailableFilesystems;
  fullPathToRootParent: string;
  filesystemFactoryParams: DsFsConstructorParams;
}

export type MergeEndpointForComparison = {
  gitIgnore: GitIgnore | null;
} & MergeEndpointBase;

export type MergeEndpointForStateUpdate = {
  gitProvider: GitProvider | null;
  git: SimpleGit | null;
  lastCommitHash: string;
  isBranch: boolean;
  branch: string;
} & MergeEndpointBase


export async function compareGitAndDSFilesystems(
  gitIgnore: GitIgnore,
  rootIri: string,
  rootProjectIri: string,
  gitInitialDirectoryParent: string,
  mergeStateCause: Omit<MergeStateCause, "merge">,
  dataspecerFilesystemFactoryMethodParams: DsFsConstructorParams,
) {
  let mergeFromFilesystemType: AvailableFilesystems;
  let mergeToFilesystemType: AvailableFilesystems;

  let mergeFromFactoryMethodParams: DsFsConstructorParams;
  let mergeToFactoryMethodParams: DsFsConstructorParams;

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
    rootIri: rootIri,
    filesystemType: mergeFromFilesystemType,
    fullPathToRootParent: gitInitialDirectoryParent,
    filesystemFactoryParams: mergeFromFactoryMethodParams,
  };

  const mergeTo: MergeEndpointForComparison = {
    gitIgnore,
    rootIri: rootIri,
    filesystemType: mergeToFilesystemType,
    fullPathToRootParent: gitInitialDirectoryParent,
    filesystemFactoryParams: mergeToFactoryMethodParams,
  };

  const comparisonResult = await compareBackendFilesystems(mergeFrom, mergeTo, rootProjectIri, mergeStateCause as MergeStateCause);
  return comparisonResult;
}

/**
 * @todo TODO RadStr PR projectIRI ... now the rootProjectIri comes explictly like this, but maybe it should be in mergeFrom and mergeTo
 *           and other issues is that it does not come from the merge state database entry
 * @param rootProjectIri can be null if neither the merge from and merge to are classic filesystems
 * @returns
 */
export async function compareBackendFilesystems(
  mergeFrom: MergeEndpointForComparison | MergeEndpointForStateUpdate,
  mergeTo: MergeEndpointForComparison | MergeEndpointForStateUpdate,
  rootProjectIri: string | null,
  mergeStateCause: MergeStateCause,
) {

  let mergeFromRoot;
  if (mergeFrom.filesystemType === AvailableFilesystems.ClassicFilesystem) {
    if (rootProjectIri === null) {
      throw new Error("Expected the root project iri to be provided, since one of the given filesystems is the classic filesyste - the merge from");
    }
    const rootParams: CreateRootFilesystemNodeParams = {
      projectIri: rootProjectIri,
      fullPathToParent: mergeFrom.fullPathToRootParent,
    }
    mergeFromRoot = createRootFilesystemNodeLocation(AvailableFilesystems.ClassicFilesystem, rootParams);
  }
  else {
    mergeFromRoot = createRootFilesystemNodeLocation(AvailableFilesystems.DS_Filesystem, {iri: mergeFrom.rootIri});
  }

  // ... Copy paste of the above ... can be refactored
  let mergeToRoot;
  if (mergeTo.filesystemType === AvailableFilesystems.ClassicFilesystem) {
    if (rootProjectIri === null) {
      throw new Error("Expected the root project iri to be provided, since one of the given filesystems is the classic filesyste - the merge to");
    }
    const rootParams: CreateRootFilesystemNodeParams = {
      projectIri: rootProjectIri,
      fullPathToParent: mergeTo.fullPathToRootParent,
    }
    mergeToRoot = createRootFilesystemNodeLocation(AvailableFilesystems.ClassicFilesystem, rootParams);
  }
  else {
    mergeToRoot = createRootFilesystemNodeLocation(AvailableFilesystems.DS_Filesystem, {iri: mergeTo.rootIri});
  }


  const mergeFromFactoryParams: FilesystemFactoryMethodParams = {
    ...mergeFrom.filesystemFactoryParams,
    gitIgnore: getGitIgnoreFromMergeEndpoint(mergeFrom),
    roots: [mergeFromRoot],
  };
  const mergeToFactoryParams: FilesystemFactoryMethodParams = {
    ...mergeTo.filesystemFactoryParams,
    gitIgnore: getGitIgnoreFromMergeEndpoint(mergeTo),
    roots: [mergeToRoot],
  };

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
