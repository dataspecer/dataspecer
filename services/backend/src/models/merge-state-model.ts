import { Prisma, PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { ResourceModel } from "./resource-model.ts";
import { SimpleGit, simpleGit } from "simple-git";
import { AvailableFilesystems, DatastoreComparison, ComparisonFullResult, convertMergeStateCauseToEditable, DiffTree, EditableType, FilesystemNode, GitProvider, isEditableType, MergeCommitType, MergeState, MergeStateCause, GitIgnore } from "@dataspecer/git";
import { updateMergeStateToBeUpToDate } from "../routes/git/merge-states/create-merge-state.ts";
import { ALL_GIT_REPOSITORY_ROOTS, createSimpleGitUsingPredefinedGitRoot, getLastCommitHash, MERGE_DS_CONFLICTS_PREFIX, MergeEndpointForStateUpdate, removePathRecursively, ResourceChangeListener, ResourceChangeType } from "@dataspecer/git-node";
import { getCommonCommitInHistory } from "@dataspecer/git-node/simple-git-methods";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../configuration.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";
import { createFilesystemFactoryParams, createFilesystemFactoryParamsObjectForResourceModel } from "../utils/filesystem-helpers.ts";


type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

type InputForConvertMergeDataToStringMethod = Nullable<CreateDataToConvertToString & { unresolvedConflicts: DatastoreComparison[] }>;

type CreateDataToConvertToString = {
  changedInEditable: DatastoreComparison[],
  removedInEditable: DatastoreComparison[],
  createdInEditable: DatastoreComparison[],
  allConflicts: DatastoreComparison[],
  diffTree: DiffTree,
};

type CreateMergeStateInput = {
  commitMessage: string,
  lastCommonCommitHash: string,
  mergeStateCause: MergeStateCause,
  editable: EditableType,
  //
  mergeFromInfo: MergeEndInfoWithRootIri,
  mergeToInfo: MergeEndInfoWithRootIri,
  //
  diffTreeSize: number,
} & CreateDataToConvertToString;

type UpdateMergeStateInput = {
  unresolvedConflicts: DatastoreComparison[],
  lastCommonCommitHash: string | undefined,
} & Omit<CreateMergeStateInput, "lastCommonCommitHash">;

type MergeEndInfoInternal = {
  lastCommitHash: string;
  isBranch: boolean;
  branch: string;
  rootFullPathToMeta: string;
  filesystemType: AvailableFilesystems;
  gitUrl: string | null;
}

export type MergeEndInfoWithRootNode = {
  rootNode: FilesystemNode;
} & MergeEndInfoInternal;

type MergeEndInfoWithRootIri = {
  rootIri: string;
} & MergeEndInfoInternal;

function convertToMergeInfoWithIri(input: MergeEndInfoWithRootNode): MergeEndInfoWithRootIri {
  return {
    filesystemType: input.filesystemType,
    lastCommitHash: input.lastCommitHash,
    rootFullPathToMeta: input.rootFullPathToMeta,
    rootIri: input.rootNode.metadata.iri,
    isBranch: input.isBranch,
    branch: input.branch,
    gitUrl: input.gitUrl,
  };
}

export type PrismaMergeStateWithData = Prisma.MergeStateGetPayload<{
  include: { mergeStateData: true }
}>;

export type PrismaMergeStateWithoutData = Prisma.MergeStateGetPayload<{
  include: { mergeStateData: false }
}>;


/**
 * The class which should be used as an api point to work with merge states.
 * It handles storing and retrieving of merge states to the database.
 */
export class MergeStateModel implements ResourceChangeListener {
  private prismaClient: PrismaClient;
  private resourceModel: ResourceModel;

  constructor(prismaClient: PrismaClient, resourceModel: ResourceModel) {
    this.prismaClient = prismaClient;
    this.resourceModel = resourceModel;
    resourceModel.addResourceChangeListener(this);
  }

  static extractGitRootParent(pathToDirectoryRootMeta: string) {
    const gitRoot = MergeStateModel.extractGitRoot(pathToDirectoryRootMeta)
    return path.dirname(gitRoot);
  }

  static extractGitRoot(pathToDirectoryRootMeta: string) {
    return path.dirname(pathToDirectoryRootMeta);
  }

  /**
   * Updates modification time of a merge state identified by {@link uuid}.
   */
  async updateModificationTime(uuid: string) {
    await this.prismaClient.mergeState.update({
      where: {uuid},
      data: {
        modifiedDiffTreeAt: new Date(),
      }
    });
  }

  /**
   * This is the implementation of the {@link ResourceChangeListener} method for the observer pattern.
   */
  async updateBasedOnResourceChange(
    resourceIri: string,
    changedModel: string | null,
    changeType: ResourceChangeType,
    mergeStateUUIDsToIgnoreInUpdating: string[],
  ): Promise<void> {
    if (changedModel === null && changeType === ResourceChangeType.Removed) {
      // Remove all the merge states related to the iri since, we removed it. The resoruceIri has to be root for the merge state to be removed. Otherwise it is not reason for removal.
      const mergeStates = await this.getMergeStates(resourceIri, false);
      for (const mergeState of mergeStates) {
        if (mergeStateUUIDsToIgnoreInUpdating.includes(mergeState.uuid)) {
          continue;
        }
        this.removeMergeState(mergeState);
      }
      return;
    }

    const rootResource = await this.resourceModel.getRootResourceForIri(resourceIri);
    if (rootResource === null) {
      throw new Error(`Resource for iri ${resourceIri} actually does not exist`);
    }

    const mergeStates = await this.getMergeStates(rootResource.iri, false);
    for (const mergeState of mergeStates) {
      if (mergeStateUUIDsToIgnoreInUpdating.includes(mergeState.uuid)) {
        continue;
      }

      const shouldBeTargetedWithUpToDateChange = (
        mergeState.filesystemTypeMergeFrom === AvailableFilesystems.DS_Filesystem &&
        mergeState.rootIriMergeFrom === rootResource.iri
      ) ||
      (
        mergeState.filesystemTypeMergeTo === AvailableFilesystems.DS_Filesystem &&
        mergeState.rootIriMergeTo === rootResource.iri
      );
      if (shouldBeTargetedWithUpToDateChange) {
        await this.setMergeStateIsUpToDate(mergeState.uuid, false);
      }
    }
  }


  /**
   * Sets the upToDate value on the merge state to be true and updates the content of the database entry based on the given data.
   * @param commonCommitHash if undefined, then use the old one
   * @returns True if it was successfully updated
   */
  async updateMergeStateToBeUpToDate(
    uuid: string,
    commitMessage: string,
    mergeStateCause: MergeStateCause,
    diffTreeComparison: ComparisonFullResult,
    commonCommitHash: string | undefined,
    mergeFromInfo: MergeEndInfoWithRootNode,
    mergeToInfo: MergeEndInfoWithRootNode,
  ): Promise<boolean> {
    // Note that: If it has 0 conflicts we don't do anything with it, even though it could be finalized. User have to do it explicitly
    const {
      changed, conflicts, created, removed,
      diffTree, diffTreeSize
    } = diffTreeComparison;


    const editable: EditableType = convertMergeStateCauseToEditable(mergeStateCause);

    const mergeStateInput: UpdateMergeStateInput = {
      commitMessage,
      lastCommonCommitHash: commonCommitHash,
      mergeStateCause,
      editable,
      mergeFromInfo: convertToMergeInfoWithIri(mergeFromInfo),
      mergeToInfo: convertToMergeInfoWithIri(mergeToInfo),
      changedInEditable: changed,
      removedInEditable: removed,
      createdInEditable: created,
      allConflicts: conflicts,
      unresolvedConflicts: conflicts,     // TODO RadStr: I don't know, I should probably keep the existing ones
      diffTree,
      diffTreeSize,
    };

    await this.updateMergeState(uuid, mergeStateInput);
    return true;
  }


  /**
   * Creates a new merge state. In other words a new entry in the database table with the merege states.
   * @returns Id of the created merge state, if the state was created (there was more than one conflict). otherwise returns null.
   */
  async createMergeState(
    rootResourceIri: string,
    commitMessage: string,
    mergeStateCause: MergeStateCause,
    diffTreeComparison: ComparisonFullResult,
    commonCommitHash: string,
    mergeFromInfo: MergeEndInfoWithRootNode,
    mergeToInfo: MergeEndInfoWithRootNode,
  ): Promise<string> {
    // If there are no conflicts. Create it anyway. It is up to user if he really wants to finalize the merge operation.
    // TODO RadStr Idea: We could finalize right away and save creating database entry. But it is rare case and another place to prone to error.
    //                   So it can be done in future by somebody else

    const {
      changed, conflicts, created, removed,
      diffTree, diffTreeSize
    } = diffTreeComparison;

    const editable: EditableType = convertMergeStateCauseToEditable(mergeStateCause);
    const mergeStateInput = {
      commitMessage,
      lastCommonCommitHash: commonCommitHash,
      mergeStateCause,
      editable,
      mergeFromInfo: convertToMergeInfoWithIri(mergeFromInfo),
      mergeToInfo: convertToMergeInfoWithIri(mergeToInfo),
      changedInEditable: changed,
      removedInEditable: removed,
      createdInEditable: created,
      allConflicts: conflicts,
      diffTree,
      diffTreeSize,
    };

    const mergeStateId = await this.createMergeStateInternal(mergeStateInput);
    // TODO RadStr Debug: Just debug
    const mergeStateDebug = await this.getMergeStateFromUUID(mergeStateId, true, false, false);   // TODO RadStr Debug: debug
    console.info({mergeStateDebug})
    console.info("Current merge state with data:", await this.getMergeStateFromUUID(mergeStateId, true, false, false));
    console.info("Current merge state without:", await this.getMergeStateFromUUID(mergeStateId, false, false, false));

    return mergeStateId;
  }

  /**
   * @deprecated I am not sure what was the purpose of this, but since we do not use, we can probably just remove it.
   */
  async propagateResourceChange(packageIri: string, resourceIri: string): Promise<string[]> {
    throw new Error("TODO RadStr: Implement");
  }


  /**
   * The main finalizer method - it gets the {@link uuid} of the merge state and then it handles it correctly based on the merge state cause.
   * @returns Returns the finalized merge state
   */
  async mergeStateFinalizer(uuid: string, mergeCommitType?: MergeCommitType): Promise<MergeState | null> {
    const mergeState = await this.getMergeStateFromUUID(uuid, true, true, false);
    if (mergeState === null) {
      throw new Error(`Merge state for uuid (${uuid}) does not exist`);
    }
    const isFinalized = await this.mergeStateConflictFinalizerInternal(mergeState, mergeCommitType);
    if (isFinalized) {
      return mergeState;
    }

    return null;
  }

  /**
   * Handles the finalization of pull by checking pre-conditions and then updating the last commit hash, respectively calling the {@link forceHandlePullFinalizer}
   * @throws Error if the commit on which the DS resource already is within DS is actually after the commit to which we are updating.
   */
  async handlePullFinalizer(mergeState: MergeState) {
    // TODO: This can be "generalized" to allow updating git (classic filesystem)
    let filesystemToUpdate: AvailableFilesystems;
    let rootIriToUpdate: string;
    // Here we name it static - that is the one, which was not editable
    let filesystemOfTheStatic: AvailableFilesystems;
    let pathToGitToRootMetaOfTheStatic: string;
    if (mergeState.editable === "mergeFrom") {
      filesystemToUpdate = mergeState.filesystemTypeMergeFrom;
      rootIriToUpdate = mergeState.rootIriMergeFrom;
      filesystemOfTheStatic = mergeState.filesystemTypeMergeTo;
      pathToGitToRootMetaOfTheStatic = mergeState.rootFullPathToMetaMergeTo;
    }
    else {
      // TODO RadStr: Thinking about it, when I am pulling maybe I don't want to have mergeTo
      filesystemToUpdate = mergeState.filesystemTypeMergeTo;
      rootIriToUpdate = mergeState.rootIriMergeTo;
      filesystemOfTheStatic = mergeState.filesystemTypeMergeFrom;
      pathToGitToRootMetaOfTheStatic = mergeState.rootFullPathToMetaMergeFrom;
    }

    if (filesystemToUpdate !== AvailableFilesystems.DS_Filesystem) {
      throw new Error("It is not currently supported to have different filesystem to update than the DS fileystem.");
    }
    const resource = await this.resourceModel.getResource(rootIriToUpdate);
    if (resource === null) {
      throw new Error(`Resource no longer exists or it never existed. The merge state: ${mergeState}`);
    }
    if (filesystemOfTheStatic === AvailableFilesystems.ClassicFilesystem) {
      // We need path to any directory inside repo (path to file causes error)
      const directory = MergeStateModel.extractGitRoot(pathToGitToRootMetaOfTheStatic);
      const git = simpleGit(directory);
      const gitCommitHash = await getLastCommitHash(git);
      // If we throw error then it means that the commit on which the DS resource already is within DS is actually after the commit to which we are updating.
      const commonCommit = await getCommonCommitInHistory(git, gitCommitHash, resource.lastCommitHash);
      await this.forceHandlePullFinalizer(rootIriToUpdate, gitCommitHash);
    }

    return {
      filesystemToUpdate,
      rootIriToUpdate,
      filesystemOfTheStatic,
      pathToGitToRootMetaOfTheStatic,
    };
  }

  /**
   * Handles the finalization of merge state caused by pull. It is handled by updating the last commit hash.
   * It is force, because we just update it, unlike in {@link handlePullFinalizer}, where we check the pre-conditions first.
   */
  async forceHandlePullFinalizer(rootIriToUpdate: string, pulledCommitHash: string) {
    await this.resourceModel.updateLastCommitHash(rootIriToUpdate, pulledCommitHash, "pull");
  }

  /**
   * Handles the push finalization. Currently it is handled the same way as pull (we just check pre-conditions set the last commit hash).
   */
  async handlePushFinalizer(mergeState: MergeState) {
    // Same as pull, but we want the user to push, that is to insert the commit message back,
    //  but that is handled in the request handler, not here
    await this.handlePullFinalizer(mergeState);
    // TODO RadStr: Or just for now don't do anything about it ... make the user commit again
  }


  /**
   * Handles the finalization of the merge state caused by merge. The performed action depends on if it is rebase or merge commit.
   */
  async handleMergeFinalizer(mergeState: MergeState, mergeCommitType?: MergeCommitType) {
    if (mergeCommitType === undefined) {
      throw new Error("mergeCommitType is undefined, we can not finalize merge state caused by merge. This is most likely programmer error.");
    }
    if (mergeCommitType === "rebase-commit") {
      await this.finalizeMergeStateWithRebaseCommit(mergeState);
    }
    else if (mergeCommitType === "merge-commit") {
      await this.finalizeMergeStateWithMergeCommit(mergeState);
    }
    else {
      throw new Error(`Unknown merge commit type (${mergeCommitType}), can not finalize merge state caused by merge. This is most likely programmer error.`);
    }
  }


  /**
   * The finalization of the {@link mergeState}. It is finalization through rebase commit.
   * The finalization just moves the tracked last commit hash in the resource (the merge to resoruce) to the commit hash on the Git remote.
   */
  private async finalizeMergeStateWithRebaseCommit(mergeState: MergeState) {
    const createdSimpleGitData = createSimpleGitUsingPredefinedGitRoot(mergeState.rootIriMergeTo, MERGE_DS_CONFLICTS_PREFIX, false);
    try {
      const git = createdSimpleGitData.git;
      await git.clone(mergeState.gitUrlMergeTo, ".", ["--filter=tree:0"]);    // And we fetch only commits
      try {
        // This fails if the branch exists only inside DS. And if it fails we just checkout the merge from branch.
        await git.checkout(mergeState.branchMergeTo);
      }
      catch (_e) {
        await git.checkout(mergeState.branchMergeFrom);
      }
      const gitCommitHash = await getLastCommitHash(git);
      // If we throw error then it means that the commit on which the DS resource already is within DS is actually after the commit to which we are updating.
      const commonCommit = await getCommonCommitInHistory(git, gitCommitHash, mergeState.lastCommitHashMergeTo);
      await this.forceHandlePullFinalizer(mergeState.rootIriMergeTo, gitCommitHash);
    }
    catch (error) {
      throw error;
    }
    finally {
      removePathRecursively(createdSimpleGitData.gitInitialDirectoryParent);
    }

    await this.handlePushFinalizer(mergeState);
  }


  /**
   * Validates the {@link mergeState} to the linked Git remote. In other words, it checks if the hashes in the merge state and in the remote are equal.
   * Both the merge from and merge to.
   * This is used for the merge commit, for the rebase commit we use the {@link finalizeMergeStateWithRebaseCommit}
   */
  private async finalizeMergeStateWithMergeCommit(mergeState: MergeState) {
    const mergeFromGitData = createSimpleGitUsingPredefinedGitRoot(mergeState.rootIriMergeFrom, MERGE_DS_CONFLICTS_PREFIX, false);
    try {
      const git = mergeFromGitData.git;
      await git.clone(mergeState.gitUrlMergeFrom, ".", ["--filter=tree:0"]);    // And we fetch only commits

      // Unlike in merge with rebase, the branch has to exist on remote. It does not make sense to create merge commit from branch, which does not exist on the remote.
      await git.checkout(mergeState.branchMergeFrom);
      const gitCommitHash = await getLastCommitHash(git);
      // If we throw error then it means that the commit on which the DS resource already is within DS is actually after the commit to which we are updating.
      const commonCommit = await getCommonCommitInHistory(git, gitCommitHash, mergeState.lastCommitHashMergeFrom);
      if (gitCommitHash !== mergeState.lastCommitHashMergeFrom) {
        throw new Error("The remote commit of the merge from branch does not match the local one");
      }

      {
        // TODO: Refactor if needed. We do hack with overriding values using new scope.
        await git.checkout(mergeState.branchMergeTo);
        const gitCommitHash = await getLastCommitHash(git);
        // If we throw error then it means that the commit on which the DS resource already is within DS is actually after the commit to which we are updating.
        const commonCommit = await getCommonCommitInHistory(git, gitCommitHash, mergeState.lastCommitHashMergeTo);
        if (gitCommitHash !== mergeState.lastCommitHashMergeTo) {
          throw new Error("The remote commit of the merge to branch does not match the local one");
        }
      }
    }
    catch (error) {
      throw error;
    }
    finally {
      removePathRecursively(mergeFromGitData.gitInitialDirectoryParent);
    }
  }


  /**
   * This method checks if the list of unresolved conflicts is empty and if so performs the finalizing based on cause (for certain causes also removes the merge state).
   *  For example the last commit hash in case of Dataspecer resource
   * @returns true, when it successfully finalized merge state
   */
  private async mergeStateConflictFinalizerInternal(mergeState: MergeState, mergeCommitType?: MergeCommitType): Promise<boolean> {
    if (mergeState.unresolvedConflicts?.length !== 0) {
      return false;
    }

    if (mergeState.mergeStateCause === "pull") {
      await this.handlePullFinalizer(mergeState);
    }
    else if (mergeState.mergeStateCause === "push") {
      await this.handlePushFinalizer(mergeState);
    }
    else if (mergeState.mergeStateCause === "merge") {
      // In case of merge it is removed on successful merge commit by user
      // TODO RadStr: But when to finalize?
      await this.handleMergeFinalizer(mergeState, mergeCommitType);
      return true;
    }
    await this.removeMergeState(mergeState);

    return true;
  }


  /**
   * If the given {@link filesystem} is ClassicFilesystem, then this method removes the directory with the Git repository from the filesystem.
   * The directory is given by the path {@link pathToRootMetaFile}. It will remove the whole project, not just the directory containg meta.
   *  In other words, it will remove its unique parent root directory.
   * @returns Returns false on failure or if the filesystem is not "classic". True otherwise.
   */
  private removeRepository(filesystem: AvailableFilesystems, pathToRootMetaFile: string, shouldPrintErrorToConsole: boolean): boolean {
    if (filesystem !== AvailableFilesystems.ClassicFilesystem) {
      return false;
    }

    try {
      const resolvedPathToRootMetaFile = path.resolve(pathToRootMetaFile);
      const rootGitDirectory = ALL_GIT_REPOSITORY_ROOTS.find(root => resolvedPathToRootMetaFile.startsWith(root));
      if (rootGitDirectory === undefined) {
        throw new Error("Could not remove git directory since it is not in the list of existing git roots");
      }
      let relative = path.relative(rootGitDirectory, resolvedPathToRootMetaFile);

      const parts = relative.split(path.sep);
      const firstUniquePartOfPath = parts[0];
      const startIndexInPath = resolvedPathToRootMetaFile.indexOf(firstUniquePartOfPath, rootGitDirectory.length);
      const dirNameToRemove = resolvedPathToRootMetaFile.substring(0, startIndexInPath + firstUniquePartOfPath.length);

      removePathRecursively(dirNameToRemove);
      return true;
    }
    catch(error) {
      // Actually since I am using force, the rmSync probably should not throw error
      if (shouldPrintErrorToConsole) {
        console.error("The repository could not be removed:", pathToRootMetaFile);
        console.error("The error:", error);
      }

      return false;
    }
  }

  /**
   * @todo Debug method used in development. It clears the database table containing the merge states.
   */
  async clearTable() {
    // It is important to also remove the repository together with the mergeState
    const mergeStates = await this.prismaClient.mergeState.findMany({include: {mergeStateData: false}});
    for (const mergeState of mergeStates) {
      await this.removeMergeState(mergeState);
    }
  }


  /**
   * Notice that it checks for the iri and not for the path. This should be used just to get all the merge states related to a DS package.
   * @returns Returns the merge states, where either the merge from or merge to iri is equal to the given {@link iri}.
   */
  async getMergeStates(iri: string, shouldIncludeMergeStateData: boolean): Promise<MergeState[]> {
    const mergeStates = await this.prismaClient.mergeState.findMany({
      where: {
        OR: [
          { rootIriMergeFrom: iri },
          { rootIriMergeTo: iri },
        ]
      },
      include: {
        mergeStateData: shouldIncludeMergeStateData,
      },
    });

    return await Promise.all(mergeStates.map(mergeState => this.prismaMergeStateToMergeState(mergeState, false, false)));
  }

  /**
   *
   * @param uuid is the identifier of the merge state.
   * @param shouldIncludeMergeStateData if true, then the returned merge states contains also the merge state data part.
   * @param shouldUpdateIfNotUpToDate if the diff tree is not up to date it will be updated and set up to date.
   * @param shouldForceDiffTreeReload It forces reloading of the diff tree (even if it is up to date).
   * @returns The merge state identified by {@link uuid}, the content and possible updated are based on the given arguments.
   */
  async getMergeStateFromUUID(
    uuid: string,
    shouldIncludeMergeStateData: boolean,
    shouldUpdateIfNotUpToDate: boolean,
    shouldForceDiffTreeReload: boolean,
  ): Promise<MergeState | null> {
    const mergeState = await this.prismaClient.mergeState.findFirst({
      where: {
        uuid: uuid,
      },
      include: {
        mergeStateData: shouldIncludeMergeStateData,
      },
    });

    if (mergeState === null) {
      return null;
    }

    return this.prismaMergeStateToMergeState(mergeState, shouldUpdateIfNotUpToDate, shouldForceDiffTreeReload);
  }


  /**
   * @returns Returns merge state which has the rootFullPathToMetaMergeFrom equal to {@link rootPathMergeFrom} and
   *  the rootFullPathToMetaMergeTo equal to {@link rootPathMergeTo}.
   */
  async getMergeState(
    rootPathMergeFrom: string,
    rootPathMergeTo: string,
    shouldIncludeMergeStateData: boolean,
    shouldForceDiffTreeReload: boolean,
  ): Promise<MergeState | null> {
    const mergeState = await this.prismaClient.mergeState.findFirst({
      where: {
        rootFullPathToMetaMergeFrom: rootPathMergeFrom,
        rootFullPathToMetaMergeTo: rootPathMergeTo,
      },
      include: {
        mergeStateData: shouldIncludeMergeStateData,
      },
    });

    if (mergeState === null) {
      return null;
    }

    return await this.prismaMergeStateToMergeState(mergeState, true, shouldForceDiffTreeReload);
  }

  /**
   * @returns Returns the merge states where the rootIriMergeTo is equal to the given {@link rootIriMergeTo}.
   */
  async getMergeStatesForMergeTo(
    rootIriMergeTo: string,
    shouldIncludeMergeStateData: boolean
  ): Promise<PrismaMergeStateWithoutData[] | PrismaMergeStateWithData[]> {
    const mergeStates = await this.prismaClient.mergeState.findMany({
      where: {
        rootIriMergeTo: rootIriMergeTo,
      },
      include: {
        mergeStateData: shouldIncludeMergeStateData,
      },
    });

    return mergeStates;
  }

  /**
   * @returns The inputs as string. Or undefined if null is provided (that is skip the update of parameter).
   *  The output of this method can be directly used to set the data in prisma database.
   */
  private convertMergeStateDataToString(inputToConvert: InputForConvertMergeDataToStringMethod) {
    const changedInEditable = inputToConvert === null ? undefined : JSON.stringify(inputToConvert.changedInEditable);
    const removedInEditable = inputToConvert === null ? undefined : JSON.stringify(inputToConvert.removedInEditable);
    const createdInEditable = inputToConvert === null ? undefined : JSON.stringify(inputToConvert.createdInEditable);
    const conflicts = inputToConvert === null ? undefined : JSON.stringify(inputToConvert.allConflicts);
    const unresolvedConflicts = inputToConvert === null ? undefined : JSON.stringify(inputToConvert.unresolvedConflicts);
    const diffTree = inputToConvert === null ? undefined : JSON.stringify(inputToConvert.diffTree);

    return {
      changedInEditable,
      removedInEditable,
      createdInEditable,
      conflicts,
      unresolvedConflicts,
      diffTree,
    };
  }

  /**
   * Sets the {@link isUpToDate} value of the merge state identified by {@link mergeStateUuId}.
   */
  private async setMergeStateIsUpToDate(mergeStateUuId: string, isUpToDate: boolean) {
    await this.prismaClient.mergeState.update({
      where: {
        uuid: mergeStateUuId,
      },
      data: {
        isUpToDate
      }
    });
  }


  /**
   * Updated merge state identified by {@link uuid} with the given {@link inputData}.
   */
  async updateMergeState(uuid: string, inputData: UpdateMergeStateInput) {
    const convertedMergeStateData = this.convertMergeStateDataToString(inputData);

    await this.prismaClient.mergeState.update({
      where: {
        uuid
      },
      data: {
        modifiedDiffTreeAt: new Date(),

        commitMessage: inputData.commitMessage,

        isUpToDate: true,
        mergeStateCause: inputData.mergeStateCause,
        editable: inputData.editable,
        lastCommonCommitHash: inputData.lastCommonCommitHash,
        isMergeFromBranch: inputData.mergeFromInfo.isBranch,
        rootIriMergeFrom: inputData.mergeFromInfo.rootIri,
        rootFullPathToMetaMergeFrom: inputData.mergeFromInfo.rootFullPathToMeta,
        lastCommitHashMergeFrom: inputData.mergeFromInfo.lastCommitHash,
        branchMergeFrom: inputData.mergeFromInfo.branch,
        filesystemTypeMergeFrom: inputData.mergeFromInfo.filesystemType,
        isMergeToBranch: inputData.mergeToInfo.isBranch,
        rootIriMergeTo: inputData.mergeToInfo.rootIri,
        rootFullPathToMetaMergeTo: inputData.mergeToInfo.rootFullPathToMeta,
        lastCommitHashMergeTo: inputData.mergeToInfo.lastCommitHash,
        branchMergeTo: inputData.mergeToInfo.branch,
        filesystemTypeMergeTo: inputData.mergeToInfo.filesystemType,
        conflictCount: inputData.allConflicts.length,
        mergeStateData: {
          update: {
            ...convertedMergeStateData,
            diffTreeSize: inputData.diffTreeSize,
          }
        }
      }
    });
  }

  /**
   * Inserts new merge state into the database. It will contain the given {@link inputData}. The uuid is randomly generated.
   * @returns The uuid of the newly created merge state in database
   */
  private async createMergeStateInternal(inputData: CreateMergeStateInput) {
    const uuid = uuidv4();
    const convertedMergeStateData = this.convertMergeStateDataToString({...inputData, unresolvedConflicts: inputData.allConflicts});

    // Create the state
    await this.prismaClient.mergeState.create({
      data: {
        uuid,
        commitMessage: inputData.commitMessage,
        isUpToDate: true,
        mergeStateCause: inputData.mergeStateCause,
        editable: inputData.editable,
        lastCommonCommitHash: inputData.lastCommonCommitHash,

        isMergeFromBranch: inputData.mergeFromInfo.isBranch,
        rootIriMergeFrom: inputData.mergeFromInfo.rootIri,
        rootFullPathToMetaMergeFrom: inputData.mergeFromInfo.rootFullPathToMeta,
        gitUrlMergeFrom: inputData.mergeFromInfo.gitUrl ?? "",
        lastCommitHashMergeFrom: inputData.mergeFromInfo.lastCommitHash,
        branchMergeFrom: inputData.mergeFromInfo.branch,
        filesystemTypeMergeFrom: inputData.mergeFromInfo.filesystemType,

        isMergeToBranch: inputData.mergeToInfo.isBranch,
        rootIriMergeTo: inputData.mergeToInfo.rootIri,
        rootFullPathToMetaMergeTo: inputData.mergeToInfo.rootFullPathToMeta,
        gitUrlMergeTo: inputData.mergeToInfo.gitUrl ?? "",
        lastCommitHashMergeTo: inputData.mergeToInfo.lastCommitHash,
        branchMergeTo: inputData.mergeToInfo.branch,
        filesystemTypeMergeTo: inputData.mergeToInfo.filesystemType,
        conflictCount: inputData.allConflicts.length,
        mergeStateData: {
          create: {
            ...convertedMergeStateData,
            diffTreeSize: inputData.diffTreeSize,
          }
        }
      }
    });

    if (inputData.mergeStateCause === "merge" || inputData.mergeStateCause === "pull") {
      await this.resourceModel.increaseActiveMergeStateCount(inputData.mergeToInfo.rootIri);
    }
    if (inputData.mergeStateCause === "merge" || inputData.mergeStateCause === "push") {
      await this.resourceModel.increaseActiveMergeStateCount(inputData.mergeFromInfo.rootIri);
    }

    return uuid;
  }

  /**
   * TODO RadStr: Still creating the API, just remove the invalid methods after finish
   */
  async updateMergeStateConflictList(uuid: string, currentlyUnresolvedConflicts: string[]) {
    const mergeState = await this.prismaClient.mergeState.findFirst({
      where: {uuid},
      include: {
        mergeStateData: true,
      },
    });
    if (mergeState === null) {
      throw new Error(`There is no such MergeState with uuid: ${uuid}`);
    }

    const allConflicts = mergeState.mergeStateData?.conflicts;
    if (allConflicts === undefined) {
      throw new Error(`For some reasons the unresolved conflicts are undefined in the MergeState with uuid: ${uuid}. It has to be array`);
    }
    const newUnresolvedConflicts: DatastoreComparison[] = JSON.parse(allConflicts)
      .filter((conflict: DatastoreComparison) => currentlyUnresolvedConflicts.includes(conflict.affectedDataStore.fullPath));

    await this.prismaClient.mergeState.update({
        where: { uuid: uuid },
        data: {
          mergeStateData: {
            update: {
              unresolvedConflicts: JSON.stringify(newUnresolvedConflicts),
            }
          }
        },
    });
  }


  /**
   * @todo TODO RadStr: Probably remove, I am not using it from anywhere
   * @deprecated Again no longer used. it is similar to the {@link updateMergeStateWithStrings} but gets the data as objects array rather than strings.
   */
  async updateMergeStateWithObjects(
    uuid: string,
    diffTree: DiffTree,
    changedInEditable: DatastoreComparison[],
    removedInEditable: DatastoreComparison[],
    createdInEditable: DatastoreComparison[],
    unresolvedConflicts: DatastoreComparison[],
  ) {
    const mergeState = await this.prismaClient.mergeState.findFirst({where: {uuid}});
    if (mergeState === null) {
      throw new Error(`There is no such MergeState with uuid: ${uuid}`);
    }

    const inputToConvert: InputForConvertMergeDataToStringMethod = {
      allConflicts: null,
      changedInEditable,
      removedInEditable,
      diffTree,
      unresolvedConflicts,
      createdInEditable
    }
    const convertedMergeStateData = this.convertMergeStateDataToString(inputToConvert);

    await this.prismaClient.mergeState.update({
        where: { uuid: uuid },
        data: {
          mergeStateData: {
            update: {
              ...convertedMergeStateData,
            }
          }
        },
    });
  }

  /**
   * Updates merge state identified by {@link uuid} with other data given in parameter.
   * @deprecated No longer used
   */
  async updateMergeStateWithStrings(
    uuid: string,
    diffTree: string,
    changedInEditable: string,
    removedInEditable: string,
    createdInEditable: string,
    unresolvedConflicts: string,
  ) {
    const mergeState = await this.prismaClient.mergeState.findFirst({where: {uuid}});
    if (mergeState === null) {
      throw new Error(`There is no such MergeState with uuid: ${uuid}`);
    }

    await this.prismaClient.mergeState.update({
        where: { uuid: uuid },
        data: {
          mergeStateData: {
            update: {
              changedInEditable,
              removedInEditable,
              createdInEditable,
              unresolvedConflicts,
              diffTree,
            }
          }
        },
    });
  }

  /**
   * Removes merge state from the database. The state is identified by {@link mergeStateUuid}.
   */
  async removeMergeStateByUuid(mergeStateUuid: string) {
    const mergeState = await this.getMergeStateFromUUID(mergeStateUuid, false, false, false);
    if (mergeState === null) {
      throw new Error(`Merge state with given uuid (${mergeStateUuid}) is not present in database`);
    }
    await this.removeMergeState(mergeState);
  }

  /**
   * Removes given {@link mergeState} from the database.
   */
  async removeMergeState(mergeState: PrismaMergeStateWithoutData | MergeState) {
    await this.prismaClient.mergeState.delete({where: {uuid: mergeState.uuid}});
    if (mergeState.mergeStateCause === "merge" || mergeState.mergeStateCause === "pull") {
      await this.resourceModel.decreaseActiveMergeStateCount(mergeState.rootIriMergeTo);
    }
    if (mergeState.mergeStateCause === "merge" || mergeState.mergeStateCause === "push") {
      await this.resourceModel.decreaseActiveMergeStateCount(mergeState.rootIriMergeFrom);
    }
    this.removeRepository(mergeState.filesystemTypeMergeFrom as AvailableFilesystems, mergeState.rootFullPathToMetaMergeFrom, true);
    this.removeRepository(mergeState.filesystemTypeMergeTo as AvailableFilesystems, mergeState.rootFullPathToMetaMergeTo, true);
  }

  /**
   * Helper method that creates instance of {@link SimpleGit} and {@link GitProvider} from the provided data.
   */
  private async createMergeEndPointGitData(
    rootIri: string,
    filesystemType: string,
    rootFullPathToMeta: string,
    gitUrl: string,
  ): Promise<{
    git: SimpleGit | null,
    gitProvider: GitProvider | null,
  }> {
    let git: SimpleGit | null = null;
    if (filesystemType as AvailableFilesystems === AvailableFilesystems.ClassicFilesystem) {
      const pathToGitRepository = MergeStateModel.extractGitRoot(rootFullPathToMeta);
      git = simpleGit(pathToGitRepository);
    }
    const gitProvider = gitUrl === "" ? null : GitProviderNodeFactory.createGitProviderFromRepositoryURL(gitUrl, httpFetch, configuration);

    return {
      git,
      gitProvider,
    };
  }

  /**
   * Converts prisma merge (that is database entry) state to {@link MergeState}.
   */
  async prismaMergeStateToMergeState(prismaMergeState: PrismaMergeStateWithData, shouldUpdateIfNotUpToDate: boolean, shouldForceDiffTreeReload: boolean): Promise<MergeState> {
    if (shouldForceDiffTreeReload || (shouldUpdateIfNotUpToDate && !prismaMergeState.isUpToDate)) {
      const { git: gitForMergeFrom, gitProvider: gitProviderForMergeFrom } = await this.createMergeEndPointGitData(
        prismaMergeState.rootIriMergeFrom, prismaMergeState.filesystemTypeMergeFrom,
        prismaMergeState.rootFullPathToMetaMergeFrom, prismaMergeState.gitUrlMergeFrom);
      const mergeFrom: MergeEndpointForStateUpdate = {
        rootIri: prismaMergeState.rootIriMergeFrom,
        filesystemType: prismaMergeState.filesystemTypeMergeFrom as AvailableFilesystems,
        fullPathToRootParent: MergeStateModel.extractGitRootParent(prismaMergeState.rootFullPathToMetaMergeFrom),
        git: gitForMergeFrom,
        gitProvider: gitProviderForMergeFrom,
        lastCommitHash: prismaMergeState.lastCommitHashMergeFrom,
        isBranch: prismaMergeState.isMergeFromBranch,
        branch: prismaMergeState.branchMergeFrom,
        filesystemFactoryParams: gitForMergeFrom === null ?       // If Git === null then it is DS filesystem
          createFilesystemFactoryParamsObjectForResourceModel(this.resourceModel) :
          createFilesystemFactoryParams(false),
      };


      const { git: gitForMergeTo, gitProvider: gitProviderForMergeTo } = await this.createMergeEndPointGitData(
        prismaMergeState.rootIriMergeTo, prismaMergeState.filesystemTypeMergeTo,
        prismaMergeState.rootFullPathToMetaMergeTo, prismaMergeState.gitUrlMergeTo);
      const mergeTo: MergeEndpointForStateUpdate = {
        rootIri: prismaMergeState.rootIriMergeTo,
        filesystemType: prismaMergeState.filesystemTypeMergeTo as AvailableFilesystems,
        fullPathToRootParent: MergeStateModel.extractGitRootParent(prismaMergeState.rootFullPathToMetaMergeTo),
        git: gitForMergeTo,
        gitProvider: gitProviderForMergeTo,
        lastCommitHash: prismaMergeState.lastCommitHashMergeTo,
        isBranch: prismaMergeState.isMergeToBranch,
        branch: prismaMergeState.branchMergeTo,
        filesystemFactoryParams: createFilesystemFactoryParams(gitForMergeTo === null) ?      // If Git === null then it is DS filesystem
          createFilesystemFactoryParamsObjectForResourceModel(this.resourceModel) :
          createFilesystemFactoryParams(false),
      };

      const previousMergeState = await this.getMergeStateFromUUID(prismaMergeState.uuid, true, false, false);
      const updatedMergeStateResult = await updateMergeStateToBeUpToDate(prismaMergeState.uuid, prismaMergeState.commitMessage, mergeFrom, mergeTo, prismaMergeState.mergeStateCause as MergeStateCause, previousMergeState);
      if (!updatedMergeStateResult) {
        throw new Error("Could not update merge state to be up to date, when trying to get it from database");
      }
      const createdMergeState = await this.getMergeStateFromUUID(prismaMergeState.uuid, prismaMergeState.mergeStateData !== null, true, false);
      if (createdMergeState === null) {
        // I don't think that this could ever happen
        throw new Error(`The merge state exists, it was no longer up to date, new one was created, however for some unknown reason it is not present in database after update: ${{rootIriMergeFrom: prismaMergeState.rootIriMergeFrom, rootIriMergeTo: prismaMergeState.rootIriMergeTo}}`);
      }

      return createdMergeState;
    }

    const includesMergeStateData = !(prismaMergeState.mergeStateData === null || prismaMergeState.mergeStateData === undefined);

    const changedInEditable = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.changedInEditable) : undefined;
    const removedInEditable = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.removedInEditable) : undefined;
    const createdInEditable = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.createdInEditable) : undefined;
    const conflicts = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.conflicts) : undefined;
    const unresolvedConflicts = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.unresolvedConflicts) : undefined;
    const diffTree = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.diffTree): undefined;

    const editable = prismaMergeState.editable;
    if (!isEditableType(editable)) {
      throw new Error(`Database is in corrupted state, editable has following value ${editable}, which is not valid`);
    }


    const result: MergeState = {
      uuid: prismaMergeState.uuid,

      commitMessage: prismaMergeState.commitMessage,

      createdAt: prismaMergeState.createdAt,
      modifiedDiffTreeAt: prismaMergeState.modifiedDiffTreeAt,

      isMergeToBranch: prismaMergeState.isMergeToBranch,
      branchMergeTo: prismaMergeState.branchMergeTo,
      gitUrlMergeTo: prismaMergeState.gitUrlMergeTo,
      lastCommitHashMergeTo: prismaMergeState.lastCommitHashMergeTo,
      rootFullPathToMetaMergeTo: prismaMergeState.rootFullPathToMetaMergeTo,
      rootIriMergeTo: prismaMergeState.rootIriMergeTo,
      filesystemTypeMergeTo: prismaMergeState.filesystemTypeMergeTo as AvailableFilesystems,

      isMergeFromBranch: prismaMergeState.isMergeFromBranch,
      branchMergeFrom: prismaMergeState.branchMergeFrom,
      gitUrlMergeFrom: prismaMergeState.gitUrlMergeFrom,
      lastCommitHashMergeFrom: prismaMergeState.lastCommitHashMergeFrom,
      rootFullPathToMetaMergeFrom: prismaMergeState.rootFullPathToMetaMergeFrom,
      rootIriMergeFrom: prismaMergeState.rootIriMergeFrom,
      filesystemTypeMergeFrom: prismaMergeState.filesystemTypeMergeFrom as AvailableFilesystems,

      editable,
      mergeStateCause: prismaMergeState.mergeStateCause as MergeStateCause,
      lastCommonCommitHash: prismaMergeState.lastCommonCommitHash,
      changedInEditable,
      removedInEditable,
      createdInEditable,
      conflicts,
      unresolvedConflicts,
      conflictCount: prismaMergeState.conflictCount,
      diffTreeData: includesMergeStateData ? {
        diffTree,
        diffTreeSize: prismaMergeState.mergeStateData!.diffTreeSize,
      } : undefined,
      isUpToDate: prismaMergeState.isUpToDate,
    };

    return result;
  }

}
