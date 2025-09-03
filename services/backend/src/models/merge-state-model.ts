import { Prisma, PrismaClient } from "@prisma/client";
import { ComparisonData } from "../routes/git-webhook-handler.ts";
import { v4 as uuidv4 } from "uuid";
import { deepOmit, removeCircularDependenciesInDiffTree } from "../utils/git-utils.ts";
import fs from "fs";
import path from "path";
import { ALL_GIT_REPOSITORY_ROOTS } from "./git-store-info.ts";
import { ResourceModel } from "./resource-model.ts";
import { simpleGit } from "simple-git";
import { FilesystemNode, DatastoreInfo } from "@dataspecer/git";
import { AvailableFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-abstraction-factory.ts";

/**
 * Says the Cause of the merge. Combined with the "editable" field, that is the field which gives us information about what datasource we were changing,
 *  will give us the action, which should be performed after the resolving of all the conflicts.
 */
export type MergeStateCause = "pull" | "push" | "merge";

export type DiffTree = Record<string, ResourceComparison>;

// TODO RadStr: Also new type, which does not exist on backend
export type ResourceComparisonResult = "exists-in-both" | "exists-in-new" | "exists-in-old";


// TODO RadStr: Also new type, which does not exist on backend
export type ResourceComparison = {
  resource: FilesystemNode;
  resourceComparisonResult: ResourceComparisonResult;
  datastoreComparisons: DatastoreComparison[];
  childrenDiffTree: DiffTree;     // Empty if the type of resource is file
}

type CreatedRemovedModified = "unknown" | "same" | "modified" | "created-in-new" | "removed-in-new";


// TODO RadStr: Changed compared to the backend - there it was named Comparison data and had different field
export type DatastoreComparison = {
  datastoreComparisonResult: CreatedRemovedModified;
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
}

// TODO RadStr: Put to package, used both in backend and DiffTree dialog
export type EditableType = "mergeFrom" | "mergeTo";
const isEditableType = (value: string): value is EditableType => value === "mergeFrom" || value === "mergeTo";

// TODO RadStr: Put into package, used both in backend and in client in the difftree dialog
export interface MergeState {
  uuid: string;

  lastCommitHashMergeTo: string;
  rootFullPathToMetaMergeTo: string;
  rootIriMergeTo: string;
  filesystemTypeMergeTo: AvailableFilesystems;

  lastCommitHashMergeFrom: string;
  rootFullPathToMetaMergeFrom: string;
  rootIriMergeFrom: string;
  filesystemTypeMergeFrom: AvailableFilesystems;

  editable: EditableType;

  lastCommonCommitHash: string;

  changedInEditable?: ComparisonData[];
  removedInEditable?: ComparisonData[];
  createdInEditable?: ComparisonData[];
  conflicts?: ComparisonData[];
  unresolvedConflicts?: ComparisonData[];
  conflictCount: number;

  mergeStateCause: MergeStateCause;

  diffTreeData?: {
    diffTree: DiffTree;
    diffTreeSize: number;   // TODO RadStr: Maybe not needed can just compute on client from diffTree
  };
}

type MergeStateWithData = Prisma.MergeStateGetPayload<{
  include: { mergeStateData: true }
}>;

export class MergeStateModel {
  private prismaClient: PrismaClient;
  private resourceModel: ResourceModel;

  constructor(prismaClient: PrismaClient, resourceModel: ResourceModel) {
    this.prismaClient = prismaClient;
    this.resourceModel = resourceModel;
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
    // TODO: This can be "generalized" to allow updating git
    let filesystemOfTheToUpdate: AvailableFilesystems;
    let iriOfTheToUpdate: string;
    let filesystemOfThePulled: AvailableFilesystems;
    let rootFullPathToMetaMergeToOfThePulled: string;
    if (mergeState.editable === "mergeFrom") {
      filesystemOfTheToUpdate = mergeState.filesystemTypeMergeFrom;
      iriOfTheToUpdate = mergeState.rootIriMergeFrom;
      filesystemOfThePulled = mergeState.filesystemTypeMergeTo;
      rootFullPathToMetaMergeToOfThePulled = mergeState.rootFullPathToMetaMergeTo;
    }
    else {
      // TODO RadStr: Thinking about it, when I am pulling maybe I don't want to have mergeTo
      filesystemOfTheToUpdate = mergeState.filesystemTypeMergeTo;
      iriOfTheToUpdate = mergeState.rootIriMergeTo;
      filesystemOfThePulled = mergeState.filesystemTypeMergeFrom;
      rootFullPathToMetaMergeToOfThePulled = mergeState.rootFullPathToMetaMergeFrom;
    }

    if (filesystemOfTheToUpdate === AvailableFilesystems.DS_Filesystem) {
      const resource = await this.resourceModel.getResource(iriOfTheToUpdate);
      if (resource === null) {
        throw new Error(`Resource no longer exists or it never existed. The merge state: ${mergeState}`);
      }
    }
    if (filesystemOfThePulled === AvailableFilesystems.ClassicFilesystem) {
      // We need path to any directory inside repo (path to file causes error)
      const directory = path.dirname(rootFullPathToMetaMergeToOfThePulled);
      const git = simpleGit(directory);
      const gitCommitHash = await git.revparse(["HEAD"]);
      this.resourceModel.updateLastCommitHash(iriOfTheToUpdate, gitCommitHash);
    }
  }

  private async handlePushFinalizer(mergeState: MergeState) {
    // Same as pull, but we want the user to push, that is to insert the commit message back,
    //  but that is handled in the request handler, not here
    await this.handlePullFinalizer(mergeState);
  }

  private async handleMergeFinalizer(mergeState: MergeState) {
    // TODO RadStr: Same as pull but with updating the new merge fields in db table
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
      await this.handleMergeFinalizer(mergeState);
    }
    await this.removeMergeState(mergeState.uuid);

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

      fs.rmSync(dirNameToRemove, { recursive: true, force: true });
      return true;
    }
    catch(error) {
      // Actually since I am using force, the rmSync probably should not throw error
      if (shouldPrintErrorToConsole) {
        // TODO RadStr: Debug prints
        console.error("The repository could not be removed:", pathToRootMetaFile);
        console.error("The error:", error);
      }

      return false;
    }
  }

  async clearTable() {
    // TODO RadStr: It is important to also remove the repository together with the mergeState
    const mergeStates = await this.prismaClient.mergeState.findMany({include: {mergeStateData: false}});
    for (const mergeState of mergeStates) {
      this.removeRepository(mergeState.filesystemTypeMergeFrom as AvailableFilesystems, mergeState.rootFullPathToMetaMergeFrom, true);
      this.removeRepository(mergeState.filesystemTypeMergeTo as AvailableFilesystems, mergeState.rootFullPathToMetaMergeTo, true);
      await this.prismaClient.mergeState.delete({where: {id: mergeState.id}});
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

    return await Promise.all(mergeStates.map(mergeState => this.prismaMergeStateToMergeState(mergeState)));
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

    return this.prismaMergeStateToMergeState(mergeState);
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

    return this.prismaMergeStateToMergeState(mergeState);
  }

  removeCircularDependencyFromFilesystemNode(
    filesystemNode: FilesystemNode | null
  ): Omit<FilesystemNode, "parent"> | null {
    if (filesystemNode === null) {
      return null;
    }

    const { parent, ...strippedFilesystemNode } = filesystemNode;
    return strippedFilesystemNode;
  }

  removeCircularDependenciesFromComparisonData(comparisonData: ComparisonData[]) {
    return deepOmit(comparisonData, "parent");
  }

  private convertMergeStateDataToString(
    changedInEditable: ComparisonData[],
    removedInEditable: ComparisonData[],
    createdInEditable: ComparisonData[],
    conflicts: ComparisonData[],
    diffTree: DiffTree,
  ) {
    const changedInEditableAsString = JSON.stringify(this.removeCircularDependenciesFromComparisonData(changedInEditable));
    const removedInEditableAsString = JSON.stringify(this.removeCircularDependenciesFromComparisonData(removedInEditable));
    const createdInEditableAsString = JSON.stringify(this.removeCircularDependenciesFromComparisonData(createdInEditable));
    const conflictsAsString = JSON.stringify(this.removeCircularDependenciesFromComparisonData(conflicts));
    const diffTreeAsString = JSON.stringify(removeCircularDependenciesInDiffTree(diffTree));

    return {
      changedInEditableAsString,
      removedInEditableAsString,
      createdInEditableAsString,
      conflictsAsString,
      diffTreeAsString,
    };
  }

  /**
   * Note that this method modifies the given data in {@link changedInEditable}, {@link createdInEditable}, {@link removedInEditable}, {@link conflicts},
   * by removing circular dependency
   * TODO RadStr: That won't be the case after the rewrite
   */
  async createMergeState(
    inputData: {
      lastCommonCommitHash: string,
      mergeStateCause: MergeStateCause,
      editable: EditableType,
      //
      rootIriMergeFrom: string,
      rootFullPathToMetaMergeFrom: string,
      lastCommitHashMergeFrom: string,
      filesystemTypeMergeFrom: AvailableFilesystems,
      //
      rootIriMergeTo: string,
      rootFullPathToMetaMergeTo: string,
      lastCommitHashMergeTo: string,
      filesystemTypeMergeTo: AvailableFilesystems,
      //
      changedInEditable: ComparisonData[],
      removedInEditable: ComparisonData[],
      createdInEditable: ComparisonData[],
      conflicts: ComparisonData[],
      diffTree: DiffTree,
      diffTreeSize: number,
    }
  ) {
    // Test if the merge state already exists
    const existingMergeState = await this.prismaClient.mergeState.findFirst({
      where: {
        rootFullPathToMetaMergeFrom: inputData.rootFullPathToMetaMergeFrom,
        rootFullPathToMetaMergeTo: inputData.rootFullPathToMetaMergeTo
      }
    });

    if (existingMergeState !== null) {
        throw new Error("Cannot create merge state because it already exists.");
    }

    const uuid = uuidv4();

    const {
      changedInEditableAsString,
      conflictsAsString,
      createdInEditableAsString,
      diffTreeAsString,
      removedInEditableAsString
    } = this.convertMergeStateDataToString(inputData.changedInEditable, inputData.removedInEditable, inputData.createdInEditable, inputData.conflicts, inputData.diffTree);

    // Create the state
    await this.prismaClient.mergeState.create({
        data: {
          uuid,
          mergeStateCause: inputData.mergeStateCause,
          editable: inputData.editable,
          lastCommonCommitHash: inputData.lastCommonCommitHash,
          rootIriMergeFrom: inputData.rootIriMergeFrom,
          rootFullPathToMetaMergeFrom: inputData.rootFullPathToMetaMergeFrom,
          lastCommitHashMergeFrom: inputData.lastCommitHashMergeFrom,
          filesystemTypeMergeFrom: inputData.filesystemTypeMergeFrom,
          rootIriMergeTo: inputData.rootIriMergeTo,
          rootFullPathToMetaMergeTo: inputData.rootFullPathToMetaMergeTo,
          lastCommitHashMergeTo: inputData.lastCommitHashMergeTo,
          filesystemTypeMergeTo: inputData.filesystemTypeMergeTo,
          conflictCount: inputData.conflicts.length,
          mergeStateData: {
            create: {
              createdInEditable: createdInEditableAsString,
              changedInEditable: changedInEditableAsString,
              removedInEditable: removedInEditableAsString,
              conflicts: conflictsAsString,
              unresolvedConflicts: conflictsAsString,
              diffTree: diffTreeAsString,
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
  async updateMergeStatePartly(uuid: string, newlyResolvedConflicts: string[]) {
    const mergeState = await this.prismaClient.mergeState.findFirst({
      where: {uuid},
      include: {
        mergeStateData: true,
      },
    });
    if (mergeState === null) {
      throw new Error(`There is no such MergeState with uuid: ${uuid}`);
    }

    const unresolvedConflicts = mergeState.mergeStateData?.unresolvedConflicts;
    if (unresolvedConflicts === undefined) {
      throw new Error(`For some reasons the unresolved conflicts are undefined in the MergeState with uuid: ${uuid}. It has to be array`);
    }
    const newUnresolvedConflicts: ComparisonData[] = JSON.parse(unresolvedConflicts)
      .filter((conflict: ComparisonData) => !newlyResolvedConflicts.includes(conflict.affectedDataStore.fullPath));

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

    const {
      changedInEditableAsString,
      conflictsAsString: unresolvedConflictsAsString,
      createdInEditableAsString,
      diffTreeAsString,
      removedInEditableAsString
    } = this.convertMergeStateDataToString(changedInEditable, removedInEditable, createdInEditable, unresolvedConflicts, diffTree);

    await this.prismaClient.mergeState.update({
        where: { uuid: uuid },
        data: {
          mergeStateData: {
            update: {
              changedInEditable: changedInEditableAsString,
              removedInEditable: removedInEditableAsString,
              createdInEditable: createdInEditableAsString,
              unresolvedConflicts: unresolvedConflictsAsString,
              diffTree: diffTreeAsString,
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

  async removeMergeState(uuid: string) {
    await this.prismaClient.mergeState.delete({where: {uuid: uuid}});
  }

  async prismaMergeStateToMergeState(prismaMergeState: MergeStateWithData): Promise<MergeState> {
    const includesMergeStateData = !(prismaMergeState.mergeStateData === null || prismaMergeState.mergeStateData === undefined);

    const changedInEditable = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.changedInEditable) : undefined;
    const removedInEditable = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.removedInEditable) : undefined;
    const createdInEditable = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.createdInEditable) : undefined;
    const conflicts = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.conflicts) : undefined;
    const unresolvedConflicts = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.unresolvedConflicts) : undefined;
    const diffTree = includesMergeStateData ? JSON.parse(prismaMergeState.mergeStateData!.diffTree): undefined;

    const editable = prismaMergeState.editable;
    if (!isEditableType(editable)) {
      // TODO RadStr: Maybe better error handling
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
    };

    return result;
  }

}
