import _ from "lodash";
import { DatastoreInfo, DirectoryNode, FileNode, FilesystemNode } from "../export-import-data-api.ts";
import { FilesystemAbstraction, getDatastoreInfoOfGivenDatastoreType } from "../filesystem/abstractions/filesystem-abstraction.ts";
import { DatastoreComparison, DatastoreComparisonWithChangeTypeInfo, DiffTree, ResourceComparison, ResourceComparisonResult } from "./merge-state.ts";
import { ResourceDatastoreStripHandlerBase } from "./comparison/resource-datastore-strip-handler-base.ts";

export type ComparisonFullResult = {
  diffTree: DiffTree,
  diffTreeSize: number,
} & ComparisonDifferences;

export type ComparisonDifferences = {
  created: DatastoreComparison[],
  removed: DatastoreComparison[],
  changed: DatastoreComparison[],
  conflicts: DatastoreComparison[],
};

/**
 * Note that the arguments are really fake tree roots. It could be reimplemented to be any root (directory node).
 *  What this means that the given root is not in the comparison (respectively its datastores), it just starts comparison from its child nodes.
 * Usually the {@link newFilesystem} is the editable filesystem and the old {@link oldFilesystem} is the not editable one
 * @param oldFilesystem is the old filesystem. This behaves as the value we are comparing changes to.
 *  Therefore, if new something exists in the {@link newFilesystem}, we call it created-in-new and not missing-in-old.
 * @returns The difftree and the total number of nodes in the difftree
*/
export async function compareFileTrees(
  oldFilesystem: FilesystemAbstraction,
  oldFakeTreeRoot: DirectoryNode,
  newFilesystem: FilesystemAbstraction,
  newFakeTreeRoot: DirectoryNode,
): Promise<ComparisonFullResult> {
  const diffTree: DiffTree = {};
  const changed: DatastoreComparison[] = [];
  const removed: DatastoreComparison[] = [];
  const created: DatastoreComparison[] = [];
  const conflicts: DatastoreComparison[] = [];


  const diffTreeSize = await compareTreesInternal(oldFilesystem, oldFakeTreeRoot,
                                                  newFilesystem, newFakeTreeRoot,
                                                  diffTree, {changed, removed, created, conflicts});
  return {
    changed,
    removed,
    created,
    conflicts,
    diffTree,
    diffTreeSize,
  };
}

/**
 * Compares the {@link oldDirectory} to {@link newDirectory}. That is the {@link diffTree} will contain
 *  the removed entries from {@link oldDirectory} compared to {@link newDirectory} and same for changed.
 *  The created ones (created-in-new) will be those present in {@link newDirectory}, but not in {@link oldDirectory}.
 *
 * @returns The number of nodes stored inside the {@link diffTree} (that is the difftree) computed in the method call.
 */
async function compareTreesInternal(
  oldFilesystem: FilesystemAbstraction,
  oldDirectory: DirectoryNode | undefined,
  newFilesystem: FilesystemAbstraction,
  newDirectory: DirectoryNode | undefined,
  diffTree: DiffTree,
  comparisonDifferences: ComparisonDifferences,
): Promise<number> {
  let diffTreeSize: number = 0;

  for (const [nodeName, nodeInOld] of Object.entries(oldDirectory?.content ?? {})) {
    diffTreeSize++;

    const nodeInNew = newDirectory?.content[nodeName];
    if (nodeInNew !== undefined && nodeInOld.type !== nodeInNew.type) { // They are not of same type and both exists
      console.error("Tree comparison error - Compared entries have the same name however they are of different type. One is file, while the other is directory");
      throw new Error("Tree comparison error - Compared entries have the same name however they are of different type. One is file, while the other is directory");
    }

    const resourceComparisonResult: ResourceComparisonResult = nodeInNew === undefined ? "exists-in-old" : "exists-in-both";
    const currentlyProcessedDiffFilesystemNode: ResourceComparison = {
      childrenDiffTree: {},
      datastoreComparisons: [],
      resources: { old: nodeInOld, new: nodeInNew ?? null },
      resourceComparisonResult,
    };
    diffTree[nodeName] = currentlyProcessedDiffFilesystemNode;      // TODO RadStr: ... nodeName is IRI (probably unless I rewrite it now), we want projectIri

    const processedDatastoresInNew: Set<DatastoreInfo> = new Set();
    for (const datastoreInOld of nodeInOld.datastores) {
      diffTreeSize++;

      const datastoreInNew = nodeInNew === undefined ? undefined : getDatastoreInfoOfGivenDatastoreType(nodeInNew, datastoreInOld.type);
      if (datastoreInNew !== undefined && datastoreInNew !== null) {
        processedDatastoresInNew.add(datastoreInNew);

        if (await compareDatastoresContents(oldFilesystem, nodeInOld, newFilesystem, nodeInNew as FileNode, datastoreInOld)) {
          const same: DatastoreComparisonWithChangeTypeInfo = {
            old: nodeInOld,
            new: nodeInNew ?? null,
            affectedDataStore: datastoreInOld,
            datastoreComparisonResult: "same",
          };
          currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(same);
        }
        else {
          const changed: DatastoreComparisonWithChangeTypeInfo = {
            old: nodeInOld,
            new: nodeInNew ?? null,
            affectedDataStore: datastoreInOld,
            datastoreComparisonResult: "modified",
          };
          currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(changed);
          comparisonDifferences.conflicts.push(changed);
          comparisonDifferences.changed.push(changed);
        }
      }
      else {
        const removed: DatastoreComparisonWithChangeTypeInfo = {
          old: nodeInOld,
          new: null,
          affectedDataStore: datastoreInOld,
          datastoreComparisonResult: "removed-in-new"
        };
        currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(removed);
        comparisonDifferences.conflicts.push(removed);
        comparisonDifferences.removed.push(removed);
      }
    }


    // Add those datastores which are present only in the second tree
    for (const datastoreInNew of nodeInNew?.datastores ?? []) {
      if (!processedDatastoresInNew.has(datastoreInNew)) {
        const created: DatastoreComparisonWithChangeTypeInfo = {
          old: null,
          new: nodeInNew!,
          affectedDataStore: datastoreInNew,
          datastoreComparisonResult: "created-in-new"
        };
        currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(created);
        // comparisonDifferences.conflicts.push(created);     // Commented so it is consistent with the filesystem node ... there we also show only the conflicts if it was removed
        comparisonDifferences.created.push(created);
        diffTreeSize++;
      }
    }

    // Recursively process "subdirectories"
    if (nodeInOld.type === "directory") {
      const subtreeSize = await compareTreesInternal(oldFilesystem, nodeInOld,
                                                      newFilesystem, nodeInNew as (DirectoryNode | undefined),
                                                      currentlyProcessedDiffFilesystemNode.childrenDiffTree,
                                                      comparisonDifferences);
      diffTreeSize += subtreeSize;
    }
  }

  // Find the filesystem nodes which are present only in the 2nd tree
  for (const [nodeName, nodeInNew] of Object.entries(newDirectory?.content ?? {})) {
    if (diffTree[nodeName] !== undefined) {
      continue;
    }

    diffTreeSize++;
    const resourceComparisonResult: ResourceComparisonResult = "exists-in-new";
    const currentlyProcessedDiffFilesystemNode: ResourceComparison = {
      childrenDiffTree: {},
      datastoreComparisons: [],
      resources: { old: null, new: nodeInNew },
      resourceComparisonResult,
    };
    diffTree[nodeName] = currentlyProcessedDiffFilesystemNode;

    for (const datastoreInNew of nodeInNew.datastores) {
      // The datastore is not present, since the parent filesystem node does not exist, then it means that all of the datastores are not present neither
      const created: DatastoreComparisonWithChangeTypeInfo = {
        datastoreComparisonResult: "created-in-new",
        old: null,
        new: nodeInNew,
        affectedDataStore: datastoreInNew,
      };
      currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(created);
      comparisonDifferences.created.push(created);
      diffTreeSize++;
    }

    if (nodeInNew.type === "directory") {
      const subtreeSize = await compareTreesInternal(oldFilesystem, undefined,
                                                      newFilesystem, nodeInNew,
                                                      currentlyProcessedDiffFilesystemNode.childrenDiffTree,
                                                      comparisonDifferences);
      diffTreeSize += subtreeSize;
    }
  }

  return diffTreeSize;
}

/**
 * @returns True if the datastores contents are equal. False otherwise
 */
export async function compareDatastoresContents(
  filesystem1: FilesystemAbstraction,
  entry1: FilesystemNode,
  filesystem2: FilesystemAbstraction,
  entry2: FilesystemNode,
  datastore: DatastoreInfo,
): Promise<boolean> {
  const stripMethod = new ResourceDatastoreStripHandlerBase(entry1.metadata.types[0] ?? entry2.metadata.types[0]).createHandlerMethodForDatastoreType(datastore.type);
  const content1 = await filesystem1.getDatastoreContent(entry1.irisTreePath, datastore.type, true);
  const content2 = await filesystem2.getDatastoreContent(entry2.irisTreePath, datastore.type, true);
  const strippedContent1 = stripMethod(content1);
  const strippedContent2 = stripMethod(content2);

  console.info({content1, strippedContent1, content2, strippedContent2});    // TODO RadStr DEBUG: DEBUG Print

  return _.isEqual(strippedContent1, strippedContent2);
}


export function getDiffNodeFromDiffTree(
  diffTree: DiffTree,
  projectIrisTreePath: string
): ResourceComparison | null {
  const parts = projectIrisTreePath.split("/").filter(part => part !== "");
  let currentDiffTree: DiffTree = diffTree;
  let diffNode: ResourceComparison | null = null;

  for (const part of parts) {
    if (currentDiffTree === undefined) {
      return null;    // Path is too long
    }
    diffNode = currentDiffTree[part];
    currentDiffTree = diffNode?.childrenDiffTree;
  }

  return diffNode ?? null;
}

/**
 * Gets all the conflicts from the previous and adds new conflicts for nodes which were not present in the original
 */
export async function createConflictsFromDiffTrees(
  previousDiffTree: DiffTree | null,
  previousConflicts: DatastoreComparison[],
  newDiffTree: DiffTree,
  newConflicts: DatastoreComparison[],
  outputConflicts: DatastoreComparison[],
): Promise<void> {
  for (const [key, newResource] of Object.entries(newDiffTree)) {
    const previousResource = previousDiffTree?.[key];
    for (const datastoreInNew of newResource.datastoreComparisons) {
      const datastoreInPrevious = previousResource?.datastoreComparisons
        .find(comparison => comparison.affectedDataStore.fullPath === datastoreInNew.affectedDataStore.fullPath);
      if (datastoreInPrevious === undefined) {
        // Newly added
        outputConflicts.push(datastoreInNew);
      }
      else {
        const hasConflictInPrevious = previousConflicts
          ?.find(conflict => conflict.affectedDataStore.fullPath === datastoreInNew.affectedDataStore.fullPath);
        if (hasConflictInPrevious) {
          // Was in previous conflicts, keep it (but now with the new datastore for consistency).
          outputConflicts.push(datastoreInNew);
        }
      }
    }

    await createConflictsFromDiffTrees(
      previousResource?.childrenDiffTree ?? null, previousConflicts,
      newResource.childrenDiffTree, newConflicts,
      outputConflicts
    );
  }
}
