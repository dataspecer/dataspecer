import _ from "lodash";
import { DatastoreInfo, DirectoryNode, FileNode, FilesystemNode } from "../export-import-data-api.ts";
import { FilesystemAbstraction, getDatastoreInfoOfGivenDatastoreType } from "../filesystem/abstractions/filesystem-abstraction.ts";
import { ComparisonData, DatastoreComparison, DiffTree, ResourceComparison, ResourceComparisonResult } from "./merge-state.ts";
import { ResourceDatastoreStripHandlerBase } from "./comparison/resource-datastore-strip-handler-base.ts";

export type ComparisonFullResult = {
  diffTree: DiffTree,
  diffTreeSize: number,
} & ComparisonDifferences;

export type ComparisonDifferences = {
  created: ComparisonData[],
  removed: ComparisonData[],
  changed: ComparisonData[],
  conflicts: ComparisonData[],
};


/**
 * @returns The difftree and the total number of nodes in the difftree
*/
export async function compareFileTrees(
  filesystem1: FilesystemAbstraction,
  fakeTreeRoot1: DirectoryNode,
  filesystem2: FilesystemAbstraction,
  fakeTreeRoot2: DirectoryNode,
): Promise<ComparisonFullResult> {
  const diffTree: DiffTree = {};
  const changed: ComparisonData[] = [];
  const removed: ComparisonData[] = [];
  const created: ComparisonData[] = [];
  const conflicts: ComparisonData[] = [];


  const diffTreeSize = await compareTreesInternal(filesystem1, fakeTreeRoot1,
                                                  filesystem2, fakeTreeRoot2,
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
 * Compares the {@link directory1} to {@link directory2}. That is the {@link diffTree} will contain
 *  the removed entries from {@link directory1} compared to {@link directory2} and same for changed.
 *  The created ones will be those present in {@link directory2}, but not in {@link directory1}.
 *
 * @returns The number of nodes stored inside the {@link diffTree} (that is the difftree) computed in the method call.
 */
async function compareTreesInternal(
  filesystem1: FilesystemAbstraction,
  directory1: DirectoryNode | undefined,
  filesystem2: FilesystemAbstraction,
  directory2: DirectoryNode | undefined,
  diffTree: DiffTree,
  comparisonDifferences: ComparisonDifferences,
): Promise<number> {
  let diffTreeSize: number = 0;

  for (const [nodeName, nodeValue] of Object.entries(directory1?.content ?? {})) {
    diffTreeSize++;

    const node2Value = directory2?.content[nodeName];
    if (node2Value !== undefined && nodeValue.type !== node2Value.type) { // They are not of same type and both exists
      console.error("Tree comparison error - Compared entries have the same name however they are of different type. One is file, while the other is directory");
      throw new Error("Tree comparison error - Compared entries have the same name however they are of different type. One is file, while the other is directory");
    }

    const resourceComparisonResult: ResourceComparisonResult = node2Value === undefined ? "exists-in-old" : "exists-in-both";
    const currentlyProcessedDiffFilesystemNode: ResourceComparison = {
      childrenDiffTree: {},
      datastoreComparisons: [],
      resources: { old: nodeValue, new: node2Value ?? null },
      resourceComparisonResult,
    };
    diffTree[nodeName] = currentlyProcessedDiffFilesystemNode;

    const processedDatastoresInSecondTree: Set<DatastoreInfo> = new Set();
    for (const datastore1 of nodeValue.datastores) {
      diffTreeSize++;

      const node2Datastore = node2Value === undefined ? undefined : getDatastoreInfoOfGivenDatastoreType(node2Value, datastore1.type);
      if (node2Datastore !== undefined) {
        processedDatastoresInSecondTree.add(node2Datastore);

        if (await compareDatastoresContents(filesystem1, nodeValue, filesystem2, node2Value as FileNode, datastore1)) {
          const same: DatastoreComparison = {
            old: nodeValue,
            new: node2Value ?? null,
            affectedDataStore: datastore1,
            datastoreComparisonResult: "same",
          };
          currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(same);
        }
        else {
          const changed: DatastoreComparison = {
            old: nodeValue,
            new: node2Value ?? null,
            affectedDataStore: datastore1,
            datastoreComparisonResult: "modified",
          };
          currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(changed);
          comparisonDifferences.conflicts.push(changed);
          comparisonDifferences.changed.push(changed);
        }
      }
      else {
        const removed: DatastoreComparison = {
          old: nodeValue,
          new: null,
          affectedDataStore: datastore1,
          datastoreComparisonResult: "removed-in-new"
        };
        currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(removed);
        comparisonDifferences.conflicts.push(removed);
        comparisonDifferences.removed.push(removed);
      }
    }


    // Add those datastores which are present only in the second tree
    for (const datastore2 of node2Value?.datastores ?? []) {
      if (!processedDatastoresInSecondTree.has(datastore2)) {
        const created: DatastoreComparison = {
          old: null,
          new: node2Value!,
          affectedDataStore: datastore2,
          datastoreComparisonResult: "created-in-new"
        };
        currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(created);
        comparisonDifferences.conflicts.push(created);
        comparisonDifferences.created.push(created);
        diffTreeSize++;
      }
    }

    // Recursively process "subdirectories"
    if (nodeValue.type === "directory") {
      const subtreeSize = await compareTreesInternal(filesystem1, nodeValue,
                                                      filesystem2, node2Value as (DirectoryNode | undefined),
                                                      currentlyProcessedDiffFilesystemNode.childrenDiffTree,
                                                      comparisonDifferences);
      diffTreeSize += subtreeSize;
    }
  }

  // Find the filesystem nodes which are present only in the 2nd tree
  for (const [nodeName, nodeValue] of Object.entries(directory2?.content ?? {})) {
    if (diffTree[nodeName] !== undefined) {
      continue;
    }

    diffTreeSize++;
    const resourceComparisonResult: ResourceComparisonResult = "exists-in-new";
    const currentlyProcessedDiffFilesystemNode: ResourceComparison = {
      childrenDiffTree: {},
      datastoreComparisons: [],
      resources: { old: null, new: nodeValue },
      resourceComparisonResult,
    };
    diffTree[nodeName] = currentlyProcessedDiffFilesystemNode;

    for (const datastore of nodeValue.datastores) {
      // The datastore is not present, since the parent filesystem node does not exist, then it means that all of the datastores are not present neither
      const created: DatastoreComparison = {
        datastoreComparisonResult: "created-in-new",
        old: null,
        new: nodeValue,
        affectedDataStore: datastore,
      };
      currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(created);
      comparisonDifferences.created.push(created);
      diffTreeSize++;
    }

    if (nodeValue.type === "directory") {
      const subtreeSize = await compareTreesInternal(filesystem1, undefined,
                                                      filesystem2, nodeValue,
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
  let diffNode: ResourceComparison;

  for (const part of parts) {
    if (currentDiffTree === undefined) {
      return null;    // Path is too long
    }
    diffNode = currentDiffTree[part];
    currentDiffTree = diffNode.childrenDiffTree;
  }

  return diffNode ?? null;
}
