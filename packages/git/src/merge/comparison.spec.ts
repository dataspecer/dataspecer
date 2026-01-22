import { expect, test } from "vitest";
import { compareFileTrees, getDiffNodeFromDiffTree } from "./comparison.ts";
import { AvailableFilesystems, FilesystemAbstraction } from "../filesystem/abstractions/filesystem-abstraction.ts";
import { FilesystemNodeLocation, FilesystemNode, FilesystemMappingType, ExportMetadataType, DatastoreInfo, FileNode, DirectoryNode } from "../export-import-data-api.ts";
import { DatastoreComparison, DiffTree } from "./merge-state.ts";
import _ from "lodash";

const expectedDefaultTestDiffTreeSize = 3 + 6 + 4; // 3 directory nodes (with 1,2,3 datastores) and 2 file nodes with 1 datastore each

test("Test filesystems comparison - 2 same trees", async () => {
  const { fakeRoot1, fakeRoot2 } = createRootDirectoryNodesForComparisonTest();
  const inputFilesystem1: TestFilesystemAbstraction = new TestFilesystemAbstraction(fakeRoot1);
  const inputFilesystem2: TestFilesystemAbstraction = new TestFilesystemAbstraction(fakeRoot2);

  // Create the contents for trees. This time the content is the same for both trees.
  for (const node of Object.values(inputFilesystem1.getGlobalFilesystemMapForIris())) {
    for (const datastore of node.datastores) {
      inputFilesystem1.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
      inputFilesystem2.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
    }
  }


  const comparisonResult = await compareFileTrees(inputFilesystem1, fakeRoot1, inputFilesystem2, fakeRoot2);
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


// test("Test filesystems comparison - trees differ in datastore", async () => {
//   const { fakeRoot1, fakeRoot2 } = createRootDirectoryNodesForComparisonTest();
//   const inputFilesystem1: TestFilesystemAbstraction = new TestFilesystemAbstraction(fakeRoot1);
//   const inputFilesystem2: TestFilesystemAbstraction = new TestFilesystemAbstraction(fakeRoot2);

//   // Create the contents for trees. This time the content is the same for both trees.
//   for (const node of Object.values(inputFilesystem1.getGlobalFilesystemMapForIris())) {
//     for (const datastore of node.datastores) {
//       inputFilesystem1.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
//       inputFilesystem2.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath + "changed"});
//     }
//   }


//   const comparisonResult = await compareFileTrees(inputFilesystem1, fakeRoot1, inputFilesystem2, fakeRoot2);
//   expect(comparisonResult.conflicts.length).toBe(8);      // There are 8 datastores, all changed
//   expect(comparisonResult.diffTreeSize).toBe(expectedDefaultTestDiffTreeSize);
//   testDiffTreesNotEqualness(comparisonResult.diffTree);
// });

// function testDiffTreesNotEqualness(diffTree: DiffTree) {
//   for (const [name, resourceComparison] of Object.entries(diffTree)) {
//     expect(resourceComparison.resourceComparisonResult).toBe("exists-in-both");
//     for (const datastore of resourceComparison.datastoreComparisons) {
//       expect(datastore.datastoreComparisonResult).toBe("modified");
//     }
//     testDiffTreesNotEqualness(resourceComparison.childrenDiffTree);
//   }
// }


// function getNodeInDirectoryTree(fakeRoot: FilesystemNode, levelToReturn: number, returnType: "directory" | "file"): FilesystemNode | null {
//   return getNodeInDirectoryTreeInternal(fakeRoot, 0, levelToReturn, returnType);
// }

// function getNodeInDirectoryTreeInternal(root: FilesystemNode, currentLevel: number, levelToReturn: number, returnType: "directory" | "file"): FilesystemNode | null {
//   if (currentLevel === levelToReturn) {
//     return root;
//   }
//   if (root.type === "file") {
//     return null;
//   }
//   if (currentLevel > levelToReturn) {
//     return null;
//   }

//   let nextRoot: FilesystemNode;
//   for (const nextRootCandidate of Object.values(root.content)) {
//     if (nextRootCandidate.type === "directory" && returnType === "directory") {
//       nextRoot = nextRootCandidate;
//       break;
//     }
//     else if (nextRootCandidate.type === "file" && returnType === "file" && levelToReturn === currentLevel - 1) {
//       nextRoot = nextRootCandidate;
//       break;
//     }
//   }
//   return getNodeInDirectoryTreeInternal(nextRoot, currentLevel + 1, levelToReturn, returnType);
// }


// test("Test filesystems comparison - trees differ in removed and created datastore", async () => {
//   const { fakeRoot1, fakeRoot2 } = createRootDirectoryNodesForComparisonTest();

//   const nodeToChange1 = getNodeInDirectoryTree(fakeRoot1, 2, "directory");
//   nodeToChange1.datastores.splice(0, 1);
//   const nodeToChange2 = getNodeInDirectoryTree(fakeRoot2, 2, "directory");
//   const missingDatastore = nodeToChange2.datastores.splice(1, 1);
//   const inputFilesystem1: TestFilesystemAbstraction = new TestFilesystemAbstraction(fakeRoot1);
//   const inputFilesystem2: TestFilesystemAbstraction = new TestFilesystemAbstraction(fakeRoot2);


//   // Create the contents for trees. This time the content is the same for both trees.
//   for (const node of Object.values(inputFilesystem1.getGlobalFilesystemMapForIris())) {
//     for (const datastore of node.datastores) {
//       inputFilesystem1.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
//       inputFilesystem2.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
//     }
//   }


//   const comparisonResult = await compareFileTrees(inputFilesystem1, fakeRoot1, inputFilesystem2, fakeRoot2);
//   expect(comparisonResult.conflicts.length).toBe(1);      // There were 8 datastores, 2 removed; one from each tree. But only the removal from the old one is conflict
//   expect(comparisonResult.conflicts[0].affectedDataStore).toEqual(missingDatastore[0]);
//   expect(comparisonResult.removed[0].affectedDataStore).toEqual(missingDatastore[0]);
//   expect(comparisonResult.diffTreeSize).toBe(expectedDefaultTestDiffTreeSize);

//   const diffNode = getDiffNodeFromDiffTree(comparisonResult.diffTree, nodeToChange2.projectIrisTreePath);  // TODO RadStr: Now works only with irisTreePath due to error
//   expect(diffNode.resourceComparisonResult).toBe("exists-in-both");
//   expect(diffNode.datastoreComparisons[0].datastoreComparisonResult).toBe("removed-in-new");
//   expect(diffNode.datastoreComparisons[1].datastoreComparisonResult).toBe("created-in-new");
// });


// test("Test filesystems comparison - trees differ in removed and created FilesystemNode", async () => {
//   const { fakeRoot1, fakeRoot2 } = createRootDirectoryNodesForComparisonTest();

//   const nodeToChange1 = getNodeInDirectoryTree(fakeRoot1, 2, "directory") as DirectoryNode;
//   let removedFilesystemNode1: FilesystemNode;
//   for (const [key, value] of Object.entries(nodeToChange1.content)) {
//     if (value.type === "file") {
//       removedFilesystemNode1 = nodeToChange1.content[key];
//       delete nodeToChange1.content[key];
//     }
//   }

//   const nodeToChange2 = getNodeInDirectoryTree(fakeRoot2, 3, "directory") as DirectoryNode;
//   let removedFilesystemNode2: FilesystemNode;
//   for (const [key, value] of Object.entries(nodeToChange2.content)) {
//     if (value.type === "file") {
//       removedFilesystemNode2 = nodeToChange2.content[key];
//       delete nodeToChange2.content[key];
//     }
//   }
//   const inputFilesystem1: TestFilesystemAbstraction = new TestFilesystemAbstraction(fakeRoot1);
//   const inputFilesystem2: TestFilesystemAbstraction = new TestFilesystemAbstraction(fakeRoot2);

//   // Create the contents for trees. This time the content is the same for both trees.
//   for (const node of Object.values(inputFilesystem1.getGlobalFilesystemMapForIris())) {
//     for (const datastore of node.datastores) {
//       inputFilesystem1.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
//       inputFilesystem2.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
//     }
//   }


//   const comparisonResult = await compareFileTrees(inputFilesystem1, fakeRoot1, inputFilesystem2, fakeRoot2);
//   expect(comparisonResult.conflicts.length).toBe(1);      // There were 8 datastores, We removed 2 filesystem nodes. However, the conflict is only the removal in the new. Creation is not
//   expect(comparisonResult.created.length).toBe(1);
//   expect(comparisonResult.created[0].new).toEqual(removedFilesystemNode1);
//   expect(comparisonResult.diffTreeSize).toBe(expectedDefaultTestDiffTreeSize);
//   expect(comparisonResult.removed.length).toBe(1);
//   expect(comparisonResult.removed[0].old).toEqual(removedFilesystemNode2);
//   expect(comparisonResult.conflicts[0].affectedDataStore).toEqual(removedFilesystemNode2.datastores[0]);

//   const diffNodeForFirstRemoval = getDiffNodeFromDiffTree(comparisonResult.diffTree, removedFilesystemNode1.projectIrisTreePath);   // TODO RadStr: Now works only with irisTreePath due to error
//   expect(diffNodeForFirstRemoval.resourceComparisonResult).toBe("exists-in-new");
//   expect(diffNodeForFirstRemoval.datastoreComparisons[0].datastoreComparisonResult).toBe("created-in-new");

//   const diffNodeForSecondRemoval = getDiffNodeFromDiffTree(comparisonResult.diffTree, removedFilesystemNode2.projectIrisTreePath);  // TODO RadStr: Now works only with irisTreePath due to error
//   expect(diffNodeForSecondRemoval.resourceComparisonResult).toBe("exists-in-old");
//   expect(diffNodeForSecondRemoval.datastoreComparisons[0].datastoreComparisonResult).toBe("removed-in-new");
// });



function generateOneLevelTestDirectoryNode(
  parentIriPath: string,
  parentProjectIriPath: string,
  iri: string,
  projectIri: string,
  datastoreCount: number,
) {
  const time = new Date();

  let irisTreePath: string;
  let projectIrisTreePath: string;
  if (parentIriPath === "") {
    if (parentIriPath !== parentProjectIriPath) {
      throw new Error("If one parent iri path is empty then the other one should be too");
    }
    irisTreePath = iri;
    projectIrisTreePath = projectIri;
  }
  else {
    irisTreePath = parentIriPath + "/" + iri;
    projectIrisTreePath = parentProjectIriPath + "/" + projectIri;
  }

  const datastores = [];
  for (let i = 0; i < datastoreCount; i++) {
    const datastoreName = `${iri}-datastore-${i}`;
    const datastoreFullname = `${datastoreName}.meta.json`;
    // We expect uniqueness of model types (this was thing before implementing Git, it is not newly introduced)
    const type = `meta-${i}`;

    datastores.push({
      fullName: `${datastoreFullname}`,
      afterPrefix: `.${type}.json`,
      type: type,
      name: `${datastoreName}`,
      format: "json",
      fullPath: `${irisTreePath}/${datastoreFullname}`,
    });
  }

  const directoryNode: DirectoryNode = {
    type: "directory",
    name: iri,
    irisTreePath,
    projectIrisTreePath,

    metadata: {
      iri: iri,
      projectIri: projectIri,
      types: ["Package"],
      userMetadata: {
        createdBy: "dataspecer-tester",
        createdAt: time,
      },
    },

    datastores,
    content: {},      // Fill in later.
  };

  return directoryNode;
}


function generateTestFileNode(
  parentIriPath: string,
  parentProjectIriPath: string,
  iri: string,
  projectIri: string
): FileNode {
  const directoryNodeToCreateFileNodeFrom: DirectoryNode = generateOneLevelTestDirectoryNode(
    parentIriPath, parentProjectIriPath, iri, projectIri, 1);
  const fileNode: FileNode = _.cloneDeep(directoryNodeToCreateFileNodeFrom) as unknown as FileNode;
  delete (fileNode as any).content;
  fileNode.type = "file";
  return fileNode;
}


type ComparisonTreeRootNodes = {
  fakeRoot1: DirectoryNode;
  fakeRoot2: DirectoryNode;
};


function createIriWithCopy(input: string, repetitionCount: number, valueToRepeat: string) {
  let output = input;
  for (let i = 0; i < repetitionCount; i++) {
    output += `-${valueToRepeat}`;
  }

  return output;
}

/**
 * Generated with the help of ChatGPT to save some work.
 * @returns Two roots which can be used for testing. Not that the second root is nothing else than deepClone of the first root.
 *  The changes themselves depend on the test.
 */
function createRootDirectoryNodesForComparisonTest(): ComparisonTreeRootNodes {
  const fakeRootIri = "fake-root-iri";
  const fakeRootProjectIri = "fake-root-project-iri"
  const fakeRoot1: DirectoryNode = generateOneLevelTestDirectoryNode("", "", fakeRootIri, fakeRootProjectIri, 0);

  const rootIri = "root-package-iri";
  const rootProjectIri = "root-package-project-iri";
  const root1: DirectoryNode = generateOneLevelTestDirectoryNode("", "", rootIri, rootProjectIri, 1);
  fakeRoot1.content = {
    [root1.name]: root1,
  };

  const underRoot = generateOneLevelTestDirectoryNode(
    root1.irisTreePath, root1.projectIrisTreePath,
    createIriWithCopy(rootIri, 1, "under"), createIriWithCopy(rootProjectIri, 1, "under"), 2);
  root1.content = {
    [underRoot.name]: underRoot,
  };


  const underUnderRoot: DirectoryNode = generateOneLevelTestDirectoryNode(
    underRoot.irisTreePath, underRoot.projectIrisTreePath,
    createIriWithCopy(rootIri, 2, "under"), createIriWithCopy(rootProjectIri, 2, "under"), 3);
  underRoot.content = {
    [underUnderRoot.name]: underUnderRoot,
  };

  const fileNodeA: FileNode = generateTestFileNode(
    underRoot.irisTreePath, underRoot.projectIrisTreePath,
    createIriWithCopy(rootIri + "-file-node", 1, "under"), createIriWithCopy(rootProjectIri + "-file-node", 1, "under"));
  underRoot.content[fileNodeA.name] = fileNodeA;

  const fileNodeB: FileNode = generateTestFileNode(
    underUnderRoot.irisTreePath, underUnderRoot.projectIrisTreePath,
    createIriWithCopy(rootIri + "-file-node", 2, "under"), createIriWithCopy(rootProjectIri + "-file-node", 2, "under"));
  underUnderRoot.content[fileNodeB.name] = fileNodeB;

  const fakeRoot2 = _.cloneDeep(fakeRoot1);
  return { fakeRoot1, fakeRoot2 };
}


class TestFilesystemAbstraction implements FilesystemAbstraction {
  root: DirectoryNode;
  filesystemMap: FilesystemMappingType;
  irisTreePathToContentMap: Record<string, Record<string, any>> = {};


  constructor(root: DirectoryNode) {
    this.root = root;
    this.filesystemMap = {};
    this.buildFilesystemMappingType(root);
  }

  buildFilesystemMappingType(root: DirectoryNode) {
    this.filesystemMap[root.irisTreePath] = root;
    for (const node of Object.values(root.content)) {
      if (node.type === "directory") {
        this.buildFilesystemMappingType(node);
      }
      else {
        this.filesystemMap[node.irisTreePath] = node;
      }
    }
  }

  async getDatastoreContent(irisTreePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any> {
    return this.irisTreePathToContentMap[irisTreePath][type];
  }

  getGlobalFilesystemMapForIris(): FilesystemMappingType {
    return this.filesystemMap;
  }

  setContent(irisTreePath: string, type: string, content: object) {
    if (this.irisTreePathToContentMap[irisTreePath] === undefined) {
      this.irisTreePathToContentMap[irisTreePath] = {};
    }
    this.irisTreePathToContentMap[irisTreePath][type] = content;
  }




  createFilesystemMapping(root: FilesystemNodeLocation): Promise<FilesystemMappingType> {
    throw new Error("Method not implemented.");
  }
  getFilesystemType(): AvailableFilesystems {
    throw new Error("Method not implemented.");
  }
  initializeFilesystem(filesystemRoots: FilesystemNodeLocation[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
  readDirectoryOldVariant(directory: string): string[] {
    throw new Error("Method not implemented.");
  }
  readDirectory(directory: string): FilesystemNode[] {
    throw new Error("Method not implemented.");
  }
  isDirectory(name: string): boolean {
    throw new Error("Method not implemented.");
  }
  extendFilesystemAbstractionObjectByDirectory(filesystemAbstractionObject: FilesystemMappingType, directory: string, basename: string, shouldExtendWithMetadata: boolean): void {
    throw new Error("Method not implemented.");
  }
  convertFilesystemAbstractionObjectNamesToIris(filesystemAbstractionObject: FilesystemMappingType): FilesystemMappingType {
    throw new Error("Method not implemented.");
  }
  getMetadataObject(treePath: string): Promise<ExportMetadataType> {
    throw new Error("Method not implemented.");
  }
  getDatastoreTypes(treePath: string): DatastoreInfo[] {
    throw new Error("Method not implemented.");
  }

  changeDatastore(otherFilesystem: FilesystemAbstraction, changed: DatastoreComparison): Promise<void> {
    throw new Error("Method not implemented.");
  }
  removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }
  removeFile(filesystemNode: FilesystemNode): Promise<void> {
    throw new Error("Method not implemented.");
  }
  updateDatastore(fileNode: FileNode, datastoreType: string, content: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  createDatastore(parentIriInToBeChangedFilesystem: string, otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getRoot(): DirectoryNode {
    throw new Error("Method not implemented.");
  }
  setRootContent(newRootContent: FilesystemMappingType): void {
    throw new Error("Method not implemented.");
  }
  getGlobalFilesystemMapForProjectIris(): FilesystemMappingType {
    throw new Error("Method not implemented.");
  }
  getNodeToParentMap(): Record<string, DirectoryNode | null> {
    throw new Error("Method not implemented.");
  }
  getParentForNode(node: FilesystemNode): DirectoryNode | null {
    throw new Error("Method not implemented.");
  }

}
