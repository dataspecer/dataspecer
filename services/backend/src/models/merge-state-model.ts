import { Prisma, PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { ALL_GIT_REPOSITORY_ROOTS } from "./git-store-info.ts";
import { ResourceModel } from "./resource-model.ts";
import { SimpleGit, simpleGit } from "simple-git";
import { AvailableFilesystems, ComparisonData, ComparisonFullResult, convertMergeStateCauseToEditable, DiffTree, EditableType, FilesystemNode, GitProvider, isEditableType, isGitUrlSet, MergeState, MergeStateCause } from "@dataspecer/git";
import { getLastCommitHash, removePathRecursively } from "../utils/git-utils.ts";
import { ResourceChangeListener, ResourceChangeType } from "./resource-change-observer.ts";
import { updateMergeStateToBeUpToDate, MergeEndpointForStateUpdate } from "../routes/create-merge-state.ts";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";

type Nullable<T> = {
    [P in keyof T]: T[P] | null;
};

type InputForConvertMergeDataToStringMethod = Nullable<CreateDataToConvertToString & { unresolvedConflicts: ComparisonData[] }>;

type CreateDataToConvertToString = {
  changedInEditable: ComparisonData[],
  removedInEditable: ComparisonData[],
  createdInEditable: ComparisonData[],
  allConflicts: ComparisonData[],
  diffTree: DiffTree,
};

type CreateMergeStateInput = {
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
  unresolvedConflicts: ComparisonData[],
  lastCommonCommitHash: string | undefined,
} & Omit<CreateMergeStateInput, "lastCommonCommitHash">;

type MergeEndInfoInternal = {
  lastCommitHash: string;
  branch: string;
  rootFullPathToMeta: string;
  filesystemType: AvailableFilesystems;
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
    branch: input.branch,
  };
}

type MergeStateWithData = Prisma.MergeStateGetPayload<{
  include: { mergeStateData: true }
}>;

type MergeStateWithoutData = Prisma.MergeStateGetPayload<{
  include: { mergeStateData: false }
}>;



export class MergeStateModel implements ResourceChangeListener {
  private prismaClient: PrismaClient;
  private resourceModel: ResourceModel;

  constructor(prismaClient: PrismaClient, resourceModel: ResourceModel) {
    this.prismaClient = prismaClient;
    this.resourceModel = resourceModel;
    resourceModel.addResourceChangeListener(this);
  }

  async updateBasedOnResourceChange(
    resourceIri: string,
    changedModel: string | null,
    changeType: ResourceChangeType,
  ): Promise<void> {
    if (changedModel === null && changeType === ResourceChangeType.Removed) {
      // Remove all the merge states related to the iri since, we removed it
      const mergeStates = await this.getMergeStates(resourceIri, false);
      for (const mergeState of mergeStates) {
        this.removeMergeState(mergeState);
      }
      return;
    }

    const resource = await this.resourceModel.getRootResourceForIri(resourceIri);
    if (resource === null) {
      throw new Error(`Resource for iri ${resourceIri} actually does not exist`);
    }

    const mergeStates = await this.getMergeStates(resource.iri, false);
    for (const mergeState of mergeStates) {
      const shouldBeTargetedWithUpToDateChange = (
        mergeState.filesystemTypeMergeFrom === AvailableFilesystems.DS_Filesystem &&
        mergeState.rootIriMergeFrom === resource.iri
      ) ||
      (
        mergeState.filesystemTypeMergeTo === AvailableFilesystems.DS_Filesystem &&
        mergeState.rootIriMergeTo === resource.iri
      );
      if (shouldBeTargetedWithUpToDateChange) {
          await this.setMergeStateIsUpToDate(mergeState.uuid, false);
      }

    }
  }


  /**
   * @param commonCommitHash if undefined, then use the old one
   * @returns True if it was successfully updated
   */
  async updateMergeStateToBeUpToDate(
    uuid: string,
    mergeStateCause: MergeStateCause,
    diffTreeComparisonResult: ComparisonFullResult,
    commonCommitHash: string | undefined,
    mergeFromInfo: MergeEndInfoWithRootNode,
    mergeToInfo: MergeEndInfoWithRootNode,
  ): Promise<boolean> {
    // Note that: If it has 0 conflicts we don't do anything with it, even though it could be finalized. User have to do it explicitly
    const {
      changed, conflicts, created, removed,
      diffTree, diffTreeSize
    } = diffTreeComparisonResult;


    // await this.clearTable();     // TODO RadStr: Debug - Remove

    const editable: EditableType = convertMergeStateCauseToEditable(mergeStateCause);

    const mergeStateInput: UpdateMergeStateInput = {
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
   * @returns Id of the created merge state, if the state was created (there was more than one conflict). otherwise returns null.
   */
  async createMergeStateIfNecessary(
    rootResourceIri: string,
    mergeStateCause: MergeStateCause,
    diffTreeComparisonResult: ComparisonFullResult,
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
    } = diffTreeComparisonResult;

    // await this.clearTable();     // TODO RadStr: Debug - Remove

    const editable: EditableType = convertMergeStateCauseToEditable(mergeStateCause);

    const mergeStateInput = {
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

    // TODO RadStr: Just debug
    const mergeStateId = await this.createMergeState(mergeStateInput);
    console.info("Current merge state with:", await this.getMergeStateFromUUID(mergeStateId, true));
    console.info("Current merge state without:", await this.getMergeStateFromUUID(mergeStateId, false));
    if (mergeStateCause !== "merge") {
      // In case of merge we do not know what is the state of synchronization, we perform it on local ds packages
      await this.resourceModel.updateIsSynchronizedWithRemote(rootResourceIri, false);
    }

    return mergeStateId;
  }

  async propagateResourceChange(packageIri: string, resourceIri: string): Promise<string[]> {
    throw new Error("TODO RadStr: Implement");
  }

  async mergeStateFinalizer(uuid: string): Promise<MergeState | null> {
    const mergeState = await this.getMergeStateFromUUID(uuid, true);
    if (mergeState === null) {
      throw new Error(`Merge state for uuid (${uuid}) does not exist`);
    }
    const isFinalized = await this.mergeStateConflictFinalizerInternal(mergeState);
    if (isFinalized) {
      return mergeState;
    }

    return null;
  }

  private async handlePullFinalizer(mergeState: MergeState) {
    // TODO: This can be "generalized" to allow updating git (classic filesystem)
    let filesystemToUpdate: AvailableFilesystems;
    let rootIriToUpdate: string;
    // Here we name it static - that is the one, which was not editable
    let filesystemOfTheStatic: AvailableFilesystems;
    let rootFullPathToMetaMergeToOfTheStatic: string;
    if (mergeState.editable === "mergeFrom") {
      filesystemToUpdate = mergeState.filesystemTypeMergeFrom;
      rootIriToUpdate = mergeState.rootIriMergeFrom;
      filesystemOfTheStatic = mergeState.filesystemTypeMergeTo;
      rootFullPathToMetaMergeToOfTheStatic = mergeState.rootFullPathToMetaMergeTo;
    }
    else {
      // TODO RadStr: Thinking about it, when I am pulling maybe I don't want to have mergeTo
      filesystemToUpdate = mergeState.filesystemTypeMergeTo;
      rootIriToUpdate = mergeState.rootIriMergeTo;
      filesystemOfTheStatic = mergeState.filesystemTypeMergeFrom;
      rootFullPathToMetaMergeToOfTheStatic = mergeState.rootFullPathToMetaMergeFrom;
    }

    if (filesystemToUpdate === AvailableFilesystems.DS_Filesystem) {
      const resource = await this.resourceModel.getResource(rootIriToUpdate);
      if (resource === null) {
        throw new Error(`Resource no longer exists or it never existed. The merge state: ${mergeState}`);
      }
    }
    if (filesystemOfTheStatic === AvailableFilesystems.ClassicFilesystem) {
      // We need path to any directory inside repo (path to file causes error)
      const directory = path.dirname(rootFullPathToMetaMergeToOfTheStatic);
      const git = simpleGit(directory);
      const gitCommitHash = await getLastCommitHash(git);
      this.resourceModel.updateLastCommitHash(rootIriToUpdate, gitCommitHash);
    }

    return {
      filesystemToUpdate,
      rootIriToUpdate,
      filesystemOfTheStatic,
      rootFullPathToMetaMergeToOfTheStatic,
    };
  }

  private async handlePushFinalizer(mergeState: MergeState) {
    // Same as pull, but we want the user to push, that is to insert the commit message back,
    //  but that is handled in the request handler, not here
    await this.handlePullFinalizer(mergeState);
    // TODO RadStr: Or just for now don't do anything about it ... make the user commit again
  }


  /**
   * This method checks if the list of unresolved conflicts is empty and if so it removes the entry and updates relevant data.
   *  For example the last commit hash in case of Dataspecer resource
   * @returns true, when it successfully finalized merge state
   */
  private async mergeStateConflictFinalizerInternal(mergeState: MergeState): Promise<boolean> {
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
      return true;
    }
    await this.removeMergeState(mergeState);

    return true;
  }

  private removeRepository(filesystem: AvailableFilesystems, pathToRootMetaFile: string, shouldPrintErrorToConsole: boolean) {
    if (filesystem !== AvailableFilesystems.ClassicFilesystem) {
      return;
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

  async clearTable() {
    // It is important to also remove the repository together with the mergeState
    const mergeStates = await this.prismaClient.mergeState.findMany({include: {mergeStateData: false}});
    for (const mergeState of mergeStates) {
      await this.removeMergeState(mergeState);
    }
  }

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

    return await Promise.all(mergeStates.map(mergeState => this.prismaMergeStateToMergeState(mergeState, false)));
  }

  async getMergeStateFromUUID(uuid: string, shouldIncludeMergeStateData: boolean): Promise<MergeState | null> {
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

    return this.prismaMergeStateToMergeState(mergeState, true);
  }

  async getMergeState(rootIriMergeFrom: string, rootIriMergeTo: string, shouldIncludeMergeStateData: boolean): Promise<MergeState | null> {
    const mergeState = await this.prismaClient.mergeState.findFirst({
      where: {
        rootIriMergeFrom: rootIriMergeFrom,
        rootIriMergeTo: rootIriMergeTo,
      },
      include: {
        mergeStateData: shouldIncludeMergeStateData,
      },
    });

    if (mergeState === null) {
      return null;
    }

    return this.prismaMergeStateToMergeState(mergeState, true);
  }

  async getMergeStatesForMergeTo(
    rootIriMergeTo: string,
    shouldIncludeMergeStateData: boolean
  ): Promise<MergeStateWithoutData[] | MergeStateWithData[]> {
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

  private async setMergeStateIsUpToDate(mergeStateId: string, isUpToDate: boolean) {
    await this.prismaClient.mergeState.update({
      where: {
        uuid: mergeStateId,
      },
      data: {
        isUpToDate
      }
    });
  }


  async updateMergeState(uuid: string, inputData: UpdateMergeStateInput) {
    const convertedMergeStateData = this.convertMergeStateDataToString(inputData);

    await this.prismaClient.mergeState.update({
        where: {
          uuid
        },
        data: {
          isUpToDate: true,
          mergeStateCause: inputData.mergeStateCause,
          editable: inputData.editable,
          lastCommonCommitHash: inputData.lastCommonCommitHash,
          rootIriMergeFrom: inputData.mergeFromInfo.rootIri,
          rootFullPathToMetaMergeFrom: inputData.mergeFromInfo.rootFullPathToMeta,
          lastCommitHashMergeFrom: inputData.mergeFromInfo.lastCommitHash,
          branchMergeFrom: inputData.mergeFromInfo.branch,
          filesystemTypeMergeFrom: inputData.mergeFromInfo.filesystemType,
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
   * @returns The uuid of the newly created merge state in database
   */
  async createMergeState(inputData: CreateMergeStateInput) {
    const uuid = uuidv4();
    const convertedMergeStateData = this.convertMergeStateDataToString({...inputData, unresolvedConflicts: inputData.allConflicts});

    // Create the state
    await this.prismaClient.mergeState.create({
      data: {
        uuid,
        mergeStateCause: inputData.mergeStateCause,
        editable: inputData.editable,
        lastCommonCommitHash: inputData.lastCommonCommitHash,
        rootIriMergeFrom: inputData.mergeFromInfo.rootIri,
        rootFullPathToMetaMergeFrom: inputData.mergeFromInfo.rootFullPathToMeta,
        lastCommitHashMergeFrom: inputData.mergeFromInfo.lastCommitHash,
        branchMergeFrom: inputData.mergeFromInfo.branch,
        filesystemTypeMergeFrom: inputData.mergeFromInfo.filesystemType,
        rootIriMergeTo: inputData.mergeToInfo.rootIri,
        rootFullPathToMetaMergeTo: inputData.mergeToInfo.rootFullPathToMeta,
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
    const newUnresolvedConflicts: ComparisonData[] = JSON.parse(allConflicts)
      .filter((conflict: ComparisonData) => currentlyUnresolvedConflicts.includes(conflict.affectedDataStore.fullPath));

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
   */
  async updateMergeStateWithObjects(
    uuid: string,
    diffTree: DiffTree,
    changedInEditable: ComparisonData[],
    removedInEditable: ComparisonData[],
    createdInEditable: ComparisonData[],
    unresolvedConflicts: ComparisonData[],
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

  async removeMergeState(mergeState: MergeStateWithoutData | MergeState) {
    await this.prismaClient.mergeState.delete({where: {uuid: mergeState.uuid}});
    this.removeRepository(mergeState.filesystemTypeMergeFrom as AvailableFilesystems, mergeState.rootFullPathToMetaMergeFrom, true);
    this.removeRepository(mergeState.filesystemTypeMergeTo as AvailableFilesystems, mergeState.rootFullPathToMetaMergeTo, true);
  }

  private async createMergeEndPointGitData(
    rootIri: string,
    filesystemType: string,
    rootFullPathToMeta: string,
  ): Promise<{
    git: SimpleGit | null,
    gitProvider: GitProvider | null,
  }> {
    const git = filesystemType as AvailableFilesystems === AvailableFilesystems.ClassicFilesystem ?
      simpleGit(rootFullPathToMeta):
      null;
    let gitProvider: GitProvider | null = null;
    if (git !== null) {
      const gitRemotes = await git.getRemotes(true);
      const originUrl = gitRemotes.find(remote => remote.name === "origin")?.refs.fetch;
      if (originUrl !== undefined) {
        gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(originUrl);
      }
      // Else null
    }
    else {
      const pckg = await this.resourceModel.getPackage(rootIri);
      if (isGitUrlSet(pckg?.linkedGitRepositoryURL)) {
        gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(pckg!.linkedGitRepositoryURL);
      }
      // Else null
    }

    return {
      git,
      gitProvider,
    };
  }

  async prismaMergeStateToMergeState(prismaMergeState: MergeStateWithData, shouldUpdateIfNotUpToDate: boolean): Promise<MergeState> {
    if (shouldUpdateIfNotUpToDate && !prismaMergeState.isUpToDate) {
      const { git: gitForMergeFrom, gitProvider: gitProviderForMergeFrom } = await this.createMergeEndPointGitData(
        prismaMergeState.rootIriMergeFrom, prismaMergeState.filesystemTypeMergeFrom, prismaMergeState.rootFullPathToMetaMergeFrom);
      const mergeFrom: MergeEndpointForStateUpdate = {
        rootIri: prismaMergeState.rootIriMergeFrom,
        filesystemType: prismaMergeState.filesystemTypeMergeFrom as AvailableFilesystems,
        fullPath: prismaMergeState.rootFullPathToMetaMergeFrom,
        git: gitForMergeFrom,
        gitProvider: gitProviderForMergeFrom,
        lastCommitHash: prismaMergeState.lastCommitHashMergeFrom,
        branch: prismaMergeState.branchMergeFrom,
      };


      const { git: gitForMergeTo, gitProvider: gitProviderForMergeTo } = await this.createMergeEndPointGitData(
        prismaMergeState.rootIriMergeTo, prismaMergeState.filesystemTypeMergeTo, prismaMergeState.rootFullPathToMetaMergeTo);
      const mergeTo: MergeEndpointForStateUpdate = {
        rootIri: prismaMergeState.rootIriMergeTo,
        filesystemType: prismaMergeState.filesystemTypeMergeTo as AvailableFilesystems,
        fullPath: prismaMergeState.rootFullPathToMetaMergeTo,
        git: gitForMergeTo,
        gitProvider: gitProviderForMergeTo,
        lastCommitHash: prismaMergeState.lastCommitHashMergeTo,
        branch: prismaMergeState.branchMergeTo,
      };

      const updatedMergeStateResult = await updateMergeStateToBeUpToDate(prismaMergeState.uuid, mergeFrom, mergeTo, prismaMergeState.mergeStateCause as MergeStateCause);
      if (!updatedMergeStateResult) {
        throw new Error("Could not update merge state to be up to date, when trying to get it from database");
      }
      const createdMergeState = await this.getMergeStateFromUUID(prismaMergeState.uuid, prismaMergeState.mergeStateData !== null);
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
      lastCommitHashMergeTo: prismaMergeState.lastCommitHashMergeTo,
      rootFullPathToMetaMergeTo: prismaMergeState.rootFullPathToMetaMergeTo,
      rootIriMergeTo: prismaMergeState.rootIriMergeTo,
      filesystemTypeMergeTo: prismaMergeState.filesystemTypeMergeTo as AvailableFilesystems,

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
