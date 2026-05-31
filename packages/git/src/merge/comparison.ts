import _ from "lodash";
import { DatastoreInfo, DirectoryNode, ExportMetadataType, FileNode, FilesystemMappingType, FilesystemNode, FilesystemNodeLocation } from "../export-import-data-api.ts";
import { AvailableFilesystems, FilesystemAbstraction, getDatastoreInfoOfGivenDatastoreType } from "../filesystem/abstractions/filesystem-abstraction.ts";
import { DatastoreComparison, DatastoreComparisonWithChangeTypeInfo, DiffTree, OldNewFilesystemNode, ResourceComparison, ResourceComparisonResult } from "./merge-state.ts";
import { ResourceDatastoreStripHandlerBase } from "./comparison/resource-datastore-strip-handler-base.ts";
import { createDatastoreWithReplacedIris } from "../datastore-manipulation/iri-replacement.ts";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";

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


  const iriToProjectIriMap = getIriToProjectIriMap(oldFakeTreeRoot, newFakeTreeRoot);

  const diffTreeSize = await compareTreesInternal(oldFilesystem, oldFakeTreeRoot,
                                                  newFilesystem, newFakeTreeRoot,
                                                  iriToProjectIriMap, diffTree, {changed, removed, created, conflicts});
  return {
    changed,
    removed,
    created,
    conflicts,
    diffTree,
    diffTreeSize,
  };
}

function getIriToProjectIriMap(
  oldDirectory: DirectoryNode | undefined,
  newDirectory: DirectoryNode | undefined,
): Record<string, string> {
  const iriToProjectIriMap: Record<string, string> = {};
  getIriToProjectIriMapInternal(oldDirectory, iriToProjectIriMap);
  getIriToProjectIriMapInternal(newDirectory, iriToProjectIriMap);
  return iriToProjectIriMap;
}

function getIriToProjectIriMapInternal(
  directory: DirectoryNode,
  iriToProjectIriMap: Record<string, string>,
): void {
  for (const node of Object.values(directory?.content ?? {})) {
    iriToProjectIriMap[node.metadata.iri] = node.metadata.projectIri;
    if (node.type === "directory") {
      getIriToProjectIriMapInternal(node, iriToProjectIriMap);
    }
  }
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
  iriToProjectIriMap: Record<string, string>,
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
    diffTree[nodeName] = currentlyProcessedDiffFilesystemNode;

    const processedDatastoresInNew: Set<DatastoreInfo> = new Set();
    for (const datastoreInOld of nodeInOld.datastores) {
      diffTreeSize++;

      const datastoreInNew = nodeInNew === undefined ? undefined : getDatastoreInfoOfGivenDatastoreType(nodeInNew, datastoreInOld.type);
      if (datastoreInNew !== undefined && datastoreInNew !== null) {
        processedDatastoresInNew.add(datastoreInNew);

        if (await getDatastoresAndCompare(oldFilesystem, nodeInOld, newFilesystem, nodeInNew as FileNode, datastoreInOld, iriToProjectIriMap)) {
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
      const subtreeSize = await compareTreesInternal(
        oldFilesystem, nodeInOld, newFilesystem, nodeInNew as (DirectoryNode | undefined), iriToProjectIriMap,
        currentlyProcessedDiffFilesystemNode.childrenDiffTree, comparisonDifferences);
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
      const subtreeSize = await compareTreesInternal(
        oldFilesystem, undefined, newFilesystem, nodeInNew, iriToProjectIriMap,
        currentlyProcessedDiffFilesystemNode.childrenDiffTree, comparisonDifferences);
      diffTreeSize += subtreeSize;
    }
  }

  return diffTreeSize;
}

/**
 * @returns True if the datastores contents are equal. False otherwise
 */
export async function getDatastoresAndCompare(
  filesystem1: FilesystemAbstraction,
  entry1: FilesystemNode,
  filesystem2: FilesystemAbstraction,
  entry2: FilesystemNode,
  datastore: DatastoreInfo,
  iriToProjectIriMap: Record<string, string>,
): Promise<boolean> {
  const content1 = await filesystem1.getDatastoreContent(entry1.irisTreePath, datastore.type, true);
  const content2 = await filesystem2.getDatastoreContent(entry2.irisTreePath, datastore.type, true);
  return compareDatastoresContents(
    content1, content2,
    entry1.metadata.types ?? entry2.metadata.types,
    datastore.type, iriToProjectIriMap);
}

/**
 *
 * @param content1 has to be an object
 * @param content2 has to be an object
 */
export function compareDatastoresContents(
  content1: any,
  content2: any,
  modelTypes: string[],
  datastoreType: string,
  iriToProjectIriMap: Record<string, string>,
): boolean {
  const stripMethod = new ResourceDatastoreStripHandlerBase(modelTypes[0]).createHandlerMethodForDatastoreType(datastoreType);

  const { strippedDatastore: strippedContent1} = stripMethod(content1, true);
  const { strippedDatastore: strippedContent2 } = stripMethod(content2, true);
  const datastoreToCompare1 = createDatastoreWithReplacedIris(strippedContent1, iriToProjectIriMap);
  const datastoreToCompare2 = createDatastoreWithReplacedIris(strippedContent2, iriToProjectIriMap);

  return _.isEqual(datastoreToCompare1.datastoreWithReplacedIris, datastoreToCompare2.datastoreWithReplacedIris);
}


export function extractMetadataFromDiffTree(diffTree: DiffTree, projectIrisTreePath: string): ExportMetadataType {
  const diffNode = getDiffNodeFromDiffTree(diffTree, projectIrisTreePath);
  return extractFirstNonEmptyFieldFromComparison(diffNode!.resources, "metadata") as ExportMetadataType;
}

export function extractFirstNonEmptyFieldFromComparison(comparison: OldNewFilesystemNode | null, comparisonFieldToExtract: keyof FilesystemNode) {
  if (comparison === null) {
    return null;
  }
  return (comparison.old?.[comparisonFieldToExtract] ?? comparison.new?.[comparisonFieldToExtract]);
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














export async function createComparisonResultForTourMode() {
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
  let isFirst: boolean = true;
  for (const node of Object.values(inputFilesystem1.getGlobalFilesystemMapForIris())) {
    for (const datastore of node.datastores) {
      if (isFirst) {
        isFirst = false;
        inputFilesystem1.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: "Content in first"});
        inputFilesystem2.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: "Content in second"});
      }
      else {
        inputFilesystem1.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
        inputFilesystem2.setContent(node.irisTreePath, datastore.type, {[datastore.fullPath]: datastore.fullPath});
      }
    }
  }


  const comparisonResult = await compareFileTrees(inputFilesystem1, oldFakeRoot, inputFilesystem2, newFakeRoot);
  return comparisonResult;
}



function generateOneLevelTestDirectoryNode(
  parentIriPath: string,
  parentProjectIriPath: string,
  iri: string,
  projectIri: string,
  datastoreCount: number,
): DirectoryNode {
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
      types: [LOCAL_PACKAGE],
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
  projectIri: string,
  fileNodeType: string,
): FileNode {
  const directoryNodeToCreateFileNodeFrom: DirectoryNode = generateOneLevelTestDirectoryNode(
    parentIriPath, parentProjectIriPath, iri, projectIri, 1);
  const fileNode: FileNode = _.cloneDeep(directoryNodeToCreateFileNodeFrom) as unknown as FileNode;
  delete (fileNode as any).content;
  fileNode.type = "file";
  fileNode.metadata.types = [fileNodeType];
  return fileNode;
}


type ComparisonTreeRootNodes = {
  oldFakeRoot: DirectoryNode;
  newFakeRoot: DirectoryNode;
};


function createIriWithCopy(input: string, repetitionCount: number, valueToRepeat: string) {
  let output = input;
  for (let i = 0; i < repetitionCount; i++) {
    output += `-${valueToRepeat}`;
  }

  return output;
}

/**
 * Generated with the help of ChatGPT to save some work with a lot of manual rewrites.
 * @returns Two roots which can be used for testing. Not that the second root is nothing else than deepClone of the first root.
 *  The changes themselves depend on the test.
 */
export function createRootDirectoryNodesForComparisonTest(): ComparisonTreeRootNodes {
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
    createIriWithCopy(rootIri + "-file-node", 1, "under"), createIriWithCopy(rootProjectIri + "-file-node", 1, "under"), LOCAL_SEMANTIC_MODEL);
  underRoot.content[fileNodeA.name] = fileNodeA;

  const fileNodeB: FileNode = generateTestFileNode(
    underUnderRoot.irisTreePath, underUnderRoot.projectIrisTreePath,
    createIriWithCopy(rootIri + "-file-node", 2, "under"), createIriWithCopy(rootProjectIri + "-file-node", 2, "under"), LOCAL_VISUAL_MODEL);
  underUnderRoot.content[fileNodeB.name] = fileNodeB;

  const fakeRoot2 = _.cloneDeep(fakeRoot1);
  return { oldFakeRoot: fakeRoot1, newFakeRoot: fakeRoot2 };
}


export class TestFilesystemAbstraction implements FilesystemAbstraction {
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




  getFilesystemType(): AvailableFilesystems {
    throw new Error("Method not implemented.");
  }
  initializeFilesystem(filesystemRoots: FilesystemNodeLocation[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
  readDirectory(iriTreePath: string): FilesystemNode[] {
    throw new Error("Method not implemented.");
  }
  isDirectory(iriTreePath: string): boolean {
    throw new Error("Method not implemented.");
  }
  getMetadataObject(irisTreePath: string): Promise<ExportMetadataType> {
    throw new Error("Method not implemented.");
  }
  getDatastoreTypes(irisTreePath: string): DatastoreInfo[] {
    throw new Error("Method not implemented.");
  }

  changeDatastore(otherFilesystem: FilesystemAbstraction, changed: DatastoreComparison): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }
  removeFilesystemNode(filesystemNode: FilesystemNode): Promise<void> {
    throw new Error("Method not implemented.");
  }
  updateDatastore(fileNode: FileNode, datastoreType: string, content: string): Promise<boolean> {
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




export function getNodeInDirectoryTree(fakeRoot: FilesystemNode, levelToReturn: number, returnType: "directory" | "file"): FilesystemNode | null {
  return getNodeInDirectoryTreeInternal(fakeRoot, 0, levelToReturn, returnType);
}

function getNodeInDirectoryTreeInternal(root: FilesystemNode, currentLevel: number, levelToReturn: number, returnType: "directory" | "file"): FilesystemNode | null {
  if (currentLevel === levelToReturn) {
    return root;
  }
  if (root.type === "file") {
    return null;
  }
  if (currentLevel > levelToReturn) {
    return null;
  }

  let nextRoot: FilesystemNode;
  for (const nextRootCandidate of Object.values(root.content)) {
    if (nextRootCandidate.type === "directory" && returnType === "directory") {
      nextRoot = nextRootCandidate;
      break;
    }
    else if (nextRootCandidate.type === "file" && returnType === "file" && levelToReturn === currentLevel - 1) {
      nextRoot = nextRootCandidate;
      break;
    }
  }
  return getNodeInDirectoryTreeInternal(nextRoot, currentLevel + 1, levelToReturn, returnType);
}
