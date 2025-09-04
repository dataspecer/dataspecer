import { FilesystemNode, DatastoreInfo } from "../export-import-data-api.ts";
import { AvailableFilesystems } from "../filesystem/abstractions/filesystem-abstraction.ts";

export type ComparisonData = {
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
};


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

export type CreatedRemovedModified = "unknown" | "same" | "modified" | "created-in-new" | "removed-in-new";


// TODO RadStr: Changed compared to the backend - there it was named Comparison data and had different field
export type DatastoreComparison = {
  datastoreComparisonResult: CreatedRemovedModified;
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
}

// TODO RadStr: Put to package, used both in backend and DiffTree dialog
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
