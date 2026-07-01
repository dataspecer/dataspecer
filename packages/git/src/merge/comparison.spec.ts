import { expect, test } from "vitest";
import { compareFileTrees, createRootDirectoryNodesForComparisonTest, getDiffNodeFromDiffTree, getNodeInDirectoryTree, TestFilesystemAbstraction } from "./comparison.ts";
import { FilesystemNode, DirectoryNode } from "../export-import-data-api.ts";
import { DiffTree } from "./merge-state.ts";
import _ from "lodash";

const expectedDefaultTestDiffTreeSize = 3 + 6 + 4; // 3 directory nodes (with 1,2,3 datastores) and 2 file nodes with 1 datastore each

test("Test filesystems comparison - 2 same trees", async () => {
  const { oldFakeRoot, newFakeRoot } = createRootDirectoryNodesForComparisonTest();
  const oldInputFilesystem: TestFilesystemAbstraction = new TestFilesystemAbstraction(oldFakeRoot);
  const newInputFilesystem: TestFilesystemAbstraction = new TestFilesystemAbstraction(newFakeRoot);

  // Create the contents for trees. This time the content is the same for both trees.
  for (const node of Object.values(oldInputFilesystem.getGlobalFilesystemMapForIris())) {
    for (const datastore of node.datastores) {
      oldInputFilesystem.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
      newInputFilesystem.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
    }
  }


  const comparisonResult = await compareFileTrees(oldInputFilesystem, oldFakeRoot, newInputFilesystem, newFakeRoot);
  expect(comparisonResult.conflicts.length).toBe(0);
  expect(comparisonResult.diffTreeSize).toBe(expectedDefaultTestDiffTreeSize);
  testDiffTreesEqualness(comparisonResult.diffTree);
});

function testDiffTreesEqualness(diffTree: DiffTree) {
  for (const [name, resourceComparison] of Object.entries(diffTree)) {
    expect(resourceComparison.resourceComparisonResult).toBe("exists-in-both");
    for (const datastore of resourceComparison.datastoreComparisons) {
      expect(datastore.datastoreComparisonResult).toBe("same");
    }
    testDiffTreesEqualness(resourceComparison.childrenDiffTree);
  }
}


test("Test filesystems comparison - trees differ in datastore", async () => {
  const { oldFakeRoot, newFakeRoot } = createRootDirectoryNodesForComparisonTest();
  const oldInputFilesystem: TestFilesystemAbstraction = new TestFilesystemAbstraction(oldFakeRoot);
  const newInputFilesystem: TestFilesystemAbstraction = new TestFilesystemAbstraction(newFakeRoot);

  // Create the contents for trees. This time the content is the same for both trees.
  for (const node of Object.values(oldInputFilesystem.getGlobalFilesystemMapForIris())) {
    for (const datastore of node.datastores) {
      oldInputFilesystem.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
      newInputFilesystem.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath + "changed"});
    }
  }


  const comparisonResult = await compareFileTrees(oldInputFilesystem, oldFakeRoot, newInputFilesystem, newFakeRoot);
  expect(comparisonResult.conflicts.length).toBe(8);      // There are 8 datastores, all changed
  expect(comparisonResult.diffTreeSize).toBe(expectedDefaultTestDiffTreeSize);
  testDiffTreesNotEqualness(comparisonResult.diffTree);
});

function testDiffTreesNotEqualness(diffTree: DiffTree) {
  for (const [name, resourceComparison] of Object.entries(diffTree)) {
    expect(resourceComparison.resourceComparisonResult).toBe("exists-in-both");
    for (const datastore of resourceComparison.datastoreComparisons) {
      expect(datastore.datastoreComparisonResult).toBe("modified");
    }
    testDiffTreesNotEqualness(resourceComparison.childrenDiffTree);
  }
}

test("Test filesystems comparison - trees differ in removed and created datastore", async () => {
  const { oldFakeRoot, newFakeRoot } = createRootDirectoryNodesForComparisonTest();

  const nodeToChangeInOld = getNodeInDirectoryTree(oldFakeRoot, 2, "directory");
  nodeToChangeInOld.datastores.splice(0, 1);
  const nodeToChangeInNew = getNodeInDirectoryTree(newFakeRoot, 2, "directory");
  const missingDatastore = nodeToChangeInNew.datastores.splice(1, 1);
  const oldInputFilesystem: TestFilesystemAbstraction = new TestFilesystemAbstraction(oldFakeRoot);
  const newInputFilesystem: TestFilesystemAbstraction = new TestFilesystemAbstraction(newFakeRoot);


  // Create the contents for trees. This time the content is the same for both trees.
  for (const node of Object.values(oldInputFilesystem.getGlobalFilesystemMapForIris())) {
    for (const datastore of node.datastores) {
      oldInputFilesystem.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
      newInputFilesystem.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
    }
  }


  const comparisonResult = await compareFileTrees(oldInputFilesystem, oldFakeRoot, newInputFilesystem, newFakeRoot);
  expect(comparisonResult.conflicts.length).toBe(1);      // There were 8 datastores, 2 removed; one from each tree. But only the removal from the old one is conflict
  expect(comparisonResult.conflicts[0].affectedDataStore).toEqual(missingDatastore[0]);
  expect(comparisonResult.removed[0].affectedDataStore).toEqual(missingDatastore[0]);
  expect(comparisonResult.diffTreeSize).toBe(expectedDefaultTestDiffTreeSize);

  const diffNode = getDiffNodeFromDiffTree(comparisonResult.diffTree, nodeToChangeInNew.irisTreePath);
  expect(diffNode.resourceComparisonResult).toBe("exists-in-both");
  expect(diffNode.datastoreComparisons[0].datastoreComparisonResult).toBe("removed-in-new");
  expect(diffNode.datastoreComparisons[1].datastoreComparisonResult).toBe("created-in-new");
});


test("Test filesystems comparison - trees differ in removed and created FilesystemNode", async () => {
  const { oldFakeRoot, newFakeRoot } = createRootDirectoryNodesForComparisonTest();

  const nodeToChangeInOld = getNodeInDirectoryTree(oldFakeRoot, 2, "directory") as DirectoryNode;
  let removedFilesystemNodeInOld: FilesystemNode;
  for (const [key, value] of Object.entries(nodeToChangeInOld.content)) {
    if (value.type === "file") {
      removedFilesystemNodeInOld = nodeToChangeInOld.content[key];
      delete nodeToChangeInOld.content[key];
    }
  }

  const nodeToChangeInNew = getNodeInDirectoryTree(newFakeRoot, 3, "directory") as DirectoryNode;
  let removedFilesystemNodeInNew: FilesystemNode;
  for (const [key, value] of Object.entries(nodeToChangeInNew.content)) {
    if (value.type === "file") {
      removedFilesystemNodeInNew = nodeToChangeInNew.content[key];
      delete nodeToChangeInNew.content[key];
    }
  }
  const inputFilesystem1: TestFilesystemAbstraction = new TestFilesystemAbstraction(oldFakeRoot);
  const inputFilesystem2: TestFilesystemAbstraction = new TestFilesystemAbstraction(newFakeRoot);

  // Create the contents for trees. This time the content is the same for both trees.
  for (const node of Object.values(inputFilesystem1.getGlobalFilesystemMapForIris())) {
    for (const datastore of node.datastores) {
      inputFilesystem1.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
      inputFilesystem2.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
    }
  }


  const comparisonResult = await compareFileTrees(inputFilesystem1, oldFakeRoot, inputFilesystem2, newFakeRoot);
  expect(comparisonResult.conflicts.length).toBe(1);      // There were 8 datastores, We removed 2 filesystem nodes. However, the conflict is only the removal in the new. Creation is not
  expect(comparisonResult.created.length).toBe(1);
  expect(comparisonResult.created[0].new).toEqual(removedFilesystemNodeInOld);
  expect(comparisonResult.diffTreeSize).toBe(expectedDefaultTestDiffTreeSize);
  expect(comparisonResult.removed.length).toBe(1);
  expect(comparisonResult.removed[0].old).toEqual(removedFilesystemNodeInNew);
  expect(comparisonResult.conflicts[0].affectedDataStore).toEqual(removedFilesystemNodeInNew.datastores[0]);

  const diffNodeForFirstRemoval = getDiffNodeFromDiffTree(comparisonResult.diffTree, removedFilesystemNodeInOld.irisTreePath);
  expect(diffNodeForFirstRemoval.resourceComparisonResult).toBe("exists-in-new");
  expect(diffNodeForFirstRemoval.datastoreComparisons[0].datastoreComparisonResult).toBe("created-in-new");

  const diffNodeForSecondRemoval = getDiffNodeFromDiffTree(comparisonResult.diffTree, removedFilesystemNodeInNew.irisTreePath);
  expect(diffNodeForSecondRemoval.resourceComparisonResult).toBe("exists-in-old");
  expect(diffNodeForSecondRemoval.datastoreComparisons[0].datastoreComparisonResult).toBe("removed-in-new");
});

