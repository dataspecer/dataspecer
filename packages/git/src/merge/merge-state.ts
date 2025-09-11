import { FilesystemNode, DatastoreInfo } from "../export-import-data-api.ts";
import { AvailableFilesystems } from "../filesystem/abstractions/filesystem-abstraction.ts";

export type ComparisonData = {
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
};

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

// TODO RadStr: Also new type, which does not exist on backend
export type ResourceComparisonResult = "exists-in-both" | "exists-in-new" | "exists-in-old";


// TODO RadStr: Also new type, which does not exist on backend
export type ResourceComparison = {
  resource: FilesystemNode;
  resourceComparisonResult: ResourceComparisonResult;
  datastoreComparisons: DatastoreComparison[];
  childrenDiffTree: DiffTree;     // Empty if the type of resource is file
}

export type CreatedRemovedModified = "unknown" | "same" | "modified" | "created-in-new" | "removed-in-new";


// TODO RadStr: Changed compared to the backend - there it was named Comparison data and had different field
export type DatastoreComparison = {
  datastoreComparisonResult: CreatedRemovedModified;
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
}

/**
 * Tells us which part of DiffEditor is editable. "mergeFrom" is the left one, "mergeTo" is the right one.
 */
export type EditableType = "mergeFrom" | "mergeTo";
export const isEditableType = (value: string): value is EditableType => value === "mergeFrom" || value === "mergeTo";

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

/**
 * @deprecated TODO RadStr: Depreacted for now, I will see how will I handle the updates
 */
export interface MergeStateOnBackend extends MergeState {
  usUpToDate: boolean
}