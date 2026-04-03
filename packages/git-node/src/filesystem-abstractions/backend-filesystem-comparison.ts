import {
  AvailableFilesystems,
  compareFileTrees,
  convertMergeStateCauseToEditable,
  createRootFilesystemNodeLocation,
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
  // TODO RadStr PR: Future work ... If we rewrite the update to only update the things which are usually changing on update, then we do not need to pass in the isBranch, since it does not change.
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

  // let mergeFromRootIri: string;     // TODO RadStr Critical: ... maybe we will rewrite, but for now it is fine, we just pass in the projectIri to all
  // let mergeToRootIri: string;

  const editable = convertMergeStateCauseToEditable(mergeStateCause as MergeStateCause);
  if (editable == "mergeFrom") {
    mergeFromFilesystemType = AvailableFilesystems.DS_Filesystem;
    mergeFromFactoryMethodParams = dataspecerFilesystemFactoryMethodParams;
    // mergeFromRootIri = rootIri;

    mergeToFilesystemType = AvailableFilesystems.ClassicFilesystem;
    mergeToFactoryMethodParams = {
      databaseMigrationVersion: -1,
      deleteBlob: null,
      deleteResource: null,
      exportedBy: "unknown",
      resourceModel: null,
    };
    // mergeToRootIri = rootProjectIri;
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
    // mergeFromRootIri = rootProjectIri;

    mergeToFilesystemType = AvailableFilesystems.DS_Filesystem;
    mergeToFactoryMethodParams = dataspecerFilesystemFactoryMethodParams;
    // mergeToRootIri = rootIri;
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
 * @param rootProjectIri can be null if neither the merge from and merge to are classic filesystems
 * @returns
 */
export async function compareBackendFilesystems(
  mergeFrom: MergeEndpointForComparison | MergeEndpointForStateUpdate,
  mergeTo: MergeEndpointForComparison | MergeEndpointForStateUpdate,
  rootProjectIri: string | null,
  mergeStateCause: MergeStateCause,
) {
  // TODO RadStr PR: Once again the unfortunate hack related to the createFilesystemMapping method
  //                 ... if one of the actors is Git, we expect the second one to not be Git (it push/pull), therefore we can borrow its iri.
  //                 ... if both are not Git then we are performing classic merge.


  // TODO RadStr Critical: !!!! Now I am not taking the iri from the other one however my solution should work??? - But not really true anymore, now I just have the createRootFilesystem as I had it before.

  const isMergeFromClassicFS = mergeFrom.filesystemType === AvailableFilesystems.ClassicFilesystem;
  const rootProjectIriForMergeFrom = isMergeFromClassicFS ? rootProjectIri : undefined;
  const isMergeToClassicFS = mergeTo.filesystemType === AvailableFilesystems.ClassicFilesystem;
  const rootProjectIriForMergeTo = isMergeToClassicFS ? rootProjectIri : undefined;
  if (rootProjectIri === null && (isMergeToClassicFS || isMergeToClassicFS)) {
    throw new Error("Expected the root project iri to be provided, since one of the given filesystems is the classic filesystem");
  }


  const mergeFromFactoryParams: FilesystemFactoryMethodParams = {
    ...mergeFrom.filesystemFactoryParams,
    gitIgnore: getGitIgnoreFromMergeEndpoint(mergeFrom),
    roots: [createRootFilesystemNodeLocation(rootProjectIriForMergeFrom ?? mergeFrom.rootIri, mergeFrom.fullPathToRootParent, rootProjectIriForMergeFrom)],
  };
  const mergeToFactoryParams: FilesystemFactoryMethodParams = {
    ...mergeTo.filesystemFactoryParams,
    gitIgnore: getGitIgnoreFromMergeEndpoint(mergeTo),
    roots: [createRootFilesystemNodeLocation(rootProjectIriForMergeTo ?? mergeTo.rootIri, mergeTo.fullPathToRootParent, rootProjectIriForMergeTo)],
  };

  // TODO RadStr Critical TOP: Ok here - once again - it does not work because we are expecting the path to be projectIri and not an IRI !!!
  //   It needs the projectIri so it knows what ID the root has, but at the same time it needs the rootIri so it can find the path to the root.
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
