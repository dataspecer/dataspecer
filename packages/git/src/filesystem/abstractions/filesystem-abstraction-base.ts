import { GitProvider } from "../../git-provider-api.ts";
import { FilesystemNode, FilesystemMappingType, MetadataCacheType, DirectoryNode, FilesystemNodeLocation, DatastoreInfo } from "../../export-import-data-api.ts";
import { createEmptyFilesystemMapping, createFilesystemMappingRoot, createInitialNodeToParentMap, FilesystemAbstraction, getMetaPrefixType } from "./filesystem-abstraction.ts";

import path from "path";
import { ComparisonData } from "../../merge/merge-state.ts";

export abstract class FilesystemAbstractionBase implements FilesystemAbstraction {
  /////////////////////////////////////
  // Properties
  /////////////////////////////////////

  protected root: DirectoryNode;
  protected globalFilesystemMapping: FilesystemMappingType;
  protected nodeToParentMap: Record<string, DirectoryNode | null>;


  /////////////////////////////////////
  // Constructor
  /////////////////////////////////////

  protected constructor() {
    const emptyMapping = createEmptyFilesystemMapping();
    const topLevelRoot = createFilesystemMappingRoot();
    this.nodeToParentMap = createInitialNodeToParentMap(topLevelRoot);
    this.globalFilesystemMapping = createEmptyFilesystemMapping();
    this.root = topLevelRoot;
    this.setValueInFilesystemMapping({iri: "", fullTreePath: ""}, emptyMapping, topLevelRoot, null);
  }

  /////////////////////////////////////
  // Methods
  /////////////////////////////////////

  getRoot(): DirectoryNode {
    return this.root;
  }

  setRootContent(newRootContent: FilesystemMappingType): void {
    this.root.content = newRootContent;
  }

  getGlobalFilesystemMap(): Record<string, FilesystemNode> {
    return this.globalFilesystemMapping;
  }

  isDirectory(treePath: string): boolean {
    return this.globalFilesystemMapping[treePath].type === "directory";
  }

  getDatastoreTypes(treePath: string): DatastoreInfo[] {
    return this.globalFilesystemMapping[treePath].datastores;
  }

  readDirectory(directory: string): FilesystemNode[] {
    const directoryNode = this.globalFilesystemMapping[directory];
    if (directoryNode.type !== "directory") {
      throw new Error("the read directory is not a directory");   // TODO RadStr: Better Error handling
    }

    return Object.values(directoryNode.content);
  }

  extendFilesystemAbstractionObjectByDirectory(filesystemAbstractionObject: FilesystemMappingType, directory: string, basename: string, shouldExtendWithMetadata: boolean): void {
    throw new Error("Method not implemented.");
  }
  convertFilesystemAbstractionObjectNamesToIris(filesystemAbstractionObject: FilesystemMappingType): FilesystemMappingType {
    throw new Error("Method not implemented.");
  }

  /**
   * @deprecated ... just remove it once I finish the API
   */
  readDirectoryOldVariant(directory: string): string[] {
    throw new Error("Method not implemented.");
  }

  getNodeToParentMap(): Record<string, DirectoryNode | null> {
    return this.nodeToParentMap;
  }

  getParentForNode(node: FilesystemNode): DirectoryNode | null {
    const map = this.getNodeToParentMap();
    return map[node.fullTreePath];
  }


  async initializeFilesystem(filesystemRoots: FilesystemNodeLocation[]): Promise<void> {
    for (const givenRoot of filesystemRoots) {
      await this.createFilesystemMappingRecursive(givenRoot, this.root.content, this.root, true);
    }
  }

  /**
   * Sets the both recursive and global mapping values correctly. Also sets the nodeToParentMap
   */
  protected setValueInFilesystemMapping(
    nodeLocation: Omit<FilesystemNodeLocation, "fullPath">,
    relativeMapping: FilesystemMappingType,
    newFilesystemNode: FilesystemNode,
    newFilesystemNodeParent: DirectoryNode | null,
  ) {
    this.globalFilesystemMapping[nodeLocation.fullTreePath] = newFilesystemNode;
    relativeMapping[nodeLocation.iri] = newFilesystemNode;
    this.nodeToParentMap[newFilesystemNode.fullTreePath] = newFilesystemNodeParent;
  }

  /**
   * Removes the entry with name {@link relativePath} from the provided {@link relativeMapping} and the global mapping present on class.
   * Also removes the entry from {@link nodeToParentMap}.
   */
  protected removeValueInFilesystemMapping(relativePath: string, relativeMapping: FilesystemMappingType) {
    const fullTreePath = relativeMapping[relativePath].fullTreePath;
    delete this.globalFilesystemMapping[fullTreePath];
    delete relativeMapping[relativePath];
    delete this.nodeToParentMap[fullTreePath];
  }

  async getMetadataObject(treePath: string): Promise<MetadataCacheType> {
    const metaContent = await this.getDatastoreContent(treePath, getMetaPrefixType(), true);
    return metaContent as unknown as MetadataCacheType;
  }

  // TODO RadStr: This is no longer the case - iri is not the last part of the path - it is the name after the path
  /**
   * The internal mapping to set the {@link filesystemMapping} recursively with the provided {@link iri} and the {@link path}, where the iri is the last part of the path.
   * @param parentDirectoryNode is the last directory node on the path. That is the parent in the fileystem.
   */
  protected abstract createFilesystemMappingRecursive(
    mappedNodeLocation: FilesystemNodeLocation,
    filesystemMapping: FilesystemMappingType,
    parentDirectoryNode: DirectoryNode | null,
    shouldSetMetadataCache: boolean
  ): Promise<FilesystemMappingType>

  abstract getDatastoreContent(treePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any>;
  abstract shouldIgnoreDirectory(directory: string, gitProvider: GitProvider): boolean;
  abstract shouldIgnoreFile(file: string): boolean;
  abstract createFilesystemMapping(root: FilesystemNodeLocation, shouldSetMetadataCache: boolean): Promise<FilesystemMappingType>;
  abstract changeDatastore(otherFilesystem: FilesystemAbstraction, changed: ComparisonData, shouldUpdateMetadataCache: boolean): Promise<boolean>;
  abstract removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<boolean>;
  abstract removeFile(filesystemNode: FilesystemNode): Promise<boolean>;
  abstract updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, content: string): Promise<boolean>;
  abstract createDatastore(otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean>;
}