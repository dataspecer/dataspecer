import { FilesystemNode, DatastoreInfo } from "../export-import-data-api.ts";
import { AvailableFilesystems } from "../filesystem/abstractions/filesystem-abstraction.ts";

export type CommitConflictInfo = {
  conflictMergeFromIri: string,
  conflictMergeToIri: string
} | null;

export type DatastoreComparison = {
  affectedDataStore: DatastoreInfo;
} & OldNewFilesystemNode;

export type CreatedRemovedModified = "same" | "modified" | "created-in-new" | "removed-in-new";

// It has additional info about how they differ.
export type DatastoreComparisonWithChangeTypeInfo = {
  datastoreComparisonResult: CreatedRemovedModified;
} & DatastoreComparison;

export type OldNewFilesystemNode = {
  old: FilesystemNode | null;
  new: FilesystemNode | null;
}

type MergeFromMergeTo = "MergeFrom" | "MergeTo";

export function getMergeFromMergeToMappingForGitAndDS(mergeStateCause: Omit<MergeStateCause, "merge">): { dsResultNameSuffix: MergeFromMergeTo, gitResultNameSuffix: MergeFromMergeTo } {
  const editable = convertMergeStateCauseToEditable(mergeStateCause as MergeStateCause);

  switch(editable) {
    case "mergeFrom":
      return {
        dsResultNameSuffix: "MergeFrom",
        gitResultNameSuffix: "MergeTo",
      };
    case "mergeTo":
      return {
        dsResultNameSuffix: "MergeTo",
        gitResultNameSuffix: "MergeFrom",
      };
    default:
      throw new Error(`Unknown editable which we got from the mergeStateCause: ${mergeStateCause}`);
  };
}

export function getMergeFromMergeToForGitAndDS(
  mergeStateCause: Omit<MergeStateCause, "merge">,
  dsValue: any,
  gitValue: any
): { valueMergeFrom: any, valueMergeTo: any } {
  const editable = convertMergeStateCauseToEditable(mergeStateCause as MergeStateCause);

  switch(editable) {
    case "mergeFrom":
      return {
        valueMergeFrom: dsValue,
        valueMergeTo: gitValue,
      };
    case "mergeTo":
      return {
        valueMergeFrom: gitValue,
        valueMergeTo: dsValue,
      };
    default:
      throw new Error(`Unknown editable which we got from the mergeStateCause: ${mergeStateCause}`);
  };
}

export function getEditableValue<T>(
  editable: EditableType,
  mergeFrom: T,
  mergeTo: T,
): T {
  switch(editable) {
    case "mergeFrom":
      return mergeFrom;
    case "mergeTo":
      return mergeTo;
    default:
      throw new Error(`Unknown editable: ${editable}`);
  };
}

export function getEditableAndNonEditableValue<T>(
  editable: EditableType,
  mergeFrom: T,
  mergeTo: T,
): {editable: T, nonEditable: T} {
  switch(editable) {
    case "mergeFrom":
      return {
        editable: mergeFrom,
        nonEditable: mergeTo,
      };
    case "mergeTo":
      return {
        editable: mergeTo,
        nonEditable: mergeFrom,
      };
    default:
      throw new Error(`Unknown editable: ${editable}`);
  };
}

export function setEditableValue<T>(
  editable: EditableType,
  entryToChange: { mergeFrom: T, mergeTo: T },
  newContent: T,
): void {
  switch(editable) {
    case "mergeFrom":
      entryToChange.mergeFrom = newContent;
      break;
    case "mergeTo":
      entryToChange.mergeTo = newContent;
      break;
    default:
      throw new Error(`Unknown editable: ${editable}`);
  };
}

/**
 * Says the Cause of the merge. Combined with the "editable" field, that is the field which gives us information about what datasource we were changing,
 *  will give us the action, which should be performed after the resolving of all the conflicts.
 */
export type MergeStateCause = "pull" | "push" | "merge";

/**
 * Converts the {@link mergeStateCause} to the {@link EditableType}, which tells us which part of DiffEditor is editable.
 * @param mergeStateCause
 */
export function convertMergeStateCauseToEditable(mergeStateCause: MergeStateCause): EditableType {
  switch(mergeStateCause) {
    case "pull":
      return "mergeTo"
    case "push":
      return "mergeFrom"
    case "merge":
      return "mergeTo"
    default:
      throw new Error("Forgot to extend merge state cause to editable map");
  }
}

export type DiffTree = Record<string, ResourceComparison>;

export type ResourceComparisonResult = "exists-in-both" | "exists-in-new" | "exists-in-old";

export type ResourceComparison = {
  resources: OldNewFilesystemNode;
  resourceComparisonResult: ResourceComparisonResult;
  datastoreComparisons: DatastoreComparisonWithChangeTypeInfo[];
  childrenDiffTree: DiffTree;     // Empty if the type of resource is file
}


/**
 * Tells us which part of DiffEditor is editable. "mergeFrom" is the left one, "mergeTo" is the right one.
 */
export type EditableType = "mergeFrom" | "mergeTo";
export const isEditableType = (value: string): value is EditableType => value === "mergeFrom" || value === "mergeTo";

export interface MergeState {
  uuid: string;

  commitMessage: string;

  createdAt: Date;
  modifiedDiffTreeAt: Date;

  isMergeToBranch: boolean;
  branchMergeTo: string;
  gitUrlMergeTo: string;
  lastCommitHashMergeTo: string;
  rootFullPathToMetaMergeTo: string;
  rootIriMergeTo: string;
  filesystemTypeMergeTo: AvailableFilesystems;

  isMergeFromBranch: boolean;
  branchMergeFrom: string;
  gitUrlMergeFrom: string;
  lastCommitHashMergeFrom: string;
  rootFullPathToMetaMergeFrom: string;
  rootIriMergeFrom: string;
  filesystemTypeMergeFrom: AvailableFilesystems;

  editable: EditableType;

  lastCommonCommitHash: string;

  changedInEditable?: DatastoreComparison[];
  removedInEditable?: DatastoreComparison[];
  createdInEditable?: DatastoreComparison[];
  conflicts?: DatastoreComparison[];
  unresolvedConflicts?: DatastoreComparison[];
  conflictCount: number;

  mergeStateCause: MergeStateCause;

  diffTreeData?: {
    diffTree: DiffTree;
    diffTreeSize: number;   // TODO RadStr: Maybe not needed can just compute on client from diffTree
  };

  isUpToDate: boolean;
}
