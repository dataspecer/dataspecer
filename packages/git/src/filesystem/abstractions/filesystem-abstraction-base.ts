// TODO RadStr Write somewhere else also, since it is important observation:
//  We currently do not support the fact to have 2 same project iris within one package
//  (that would happen if somebody imported the same git repo under package UNDER the same level - the same level since in the filesystems we identify using the tree path and not the iri)
//  Possible future solutions would be to generate new iri as project iri on import inside resource (or only if there is conflict)

import { GitProvider } from "../../git-provider-api.ts";
import { FilesystemNode, FilesystemMappingType, DirectoryNode, FilesystemNodeLocation, DatastoreInfo, ExportMetadataType } from "../../export-import-data-api.ts";
import { AvailableFilesystems, createEmptyFilesystemMapping, createFilesystemMappingRoot, createInitialNodeToParentMap, FilesystemAbstraction, getMetaPrefixType } from "./filesystem-abstraction.ts";

import path from "path";
import { ComparisonData } from "../../merge/merge-state.ts";

export abstract class FilesystemAbstractionBase implements FilesystemAbstraction {
  /////////////////////////////////////
  // Properties
  /////////////////////////////////////

  protected root: DirectoryNode;
  /**
   * The keys are tree paths created by putting projectIri (NOT IRIS) in the path joined by "/"
   * @deprecated Maybe deprecated? I think that using the project iris will be enough
   */
  protected globalFilesystemMappingForProjectIris: FilesystemMappingType;
  /**
   * The keys are tree paths created by putting iris (NOT PROJECTIRIS) in the path joined by "/". Note that for the git this is same as proejct iris map.
   *  However for DS it is not, since it is not uniquely identifiable projectIri (+ repo path), so there we need the actual iris.
   */
  protected globalFilesystemMappingForIris: FilesystemMappingType;
  protected nodeToParentMap: Record<string, DirectoryNode | null>;


  /////////////////////////////////////
  // Constructor
  /////////////////////////////////////

  protected constructor() {
    const emptyMapping = createEmptyFilesystemMapping();
    const topLevelRoot = createFilesystemMappingRoot();
    this.nodeToParentMap = createInitialNodeToParentMap(topLevelRoot);
    this.globalFilesystemMappingForProjectIris = createEmptyFilesystemMapping();
    this.globalFilesystemMappingForIris = createEmptyFilesystemMapping();
    this.root = topLevelRoot;
    this.setValueInFilesystemMapping("", {iri: "", irisTreePath: "", projectIrisTreePath: ""}, emptyMapping, topLevelRoot, null);
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

  getGlobalFilesystemMapForProjectIris(): FilesystemMappingType {
    return this.globalFilesystemMappingForProjectIris;
  }

  getGlobalFilesystemMapForIris(): FilesystemMappingType {
    return this.globalFilesystemMappingForIris;
  }

  isDirectory(treePath: string): boolean {
    return this.globalFilesystemMappingForIris[treePath].type === "directory";
  }

  getDatastoreTypes(treePath: string): DatastoreInfo[] {
    return this.globalFilesystemMappingForIris[treePath].datastores;
  }

  readDirectory(directory: string): FilesystemNode[] {
    const directoryNode = this.globalFilesystemMappingForIris[directory];
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
    return map[node.irisTreePath];
  }


  async initializeFilesystem(filesystemRoots: FilesystemNodeLocation[]): Promise<void> {
    for (const givenRoot of filesystemRoots) {
      await this.createFilesystemMappingRecursive(givenRoot, this.root.content, this.root);
    }
  }

  /**
   * Sets the both recursive and global mapping values correctly. Also sets the nodeToParentMap
   */
  protected setValueInFilesystemMapping(
    projectIri: string,
    nodeLocation: Omit<FilesystemNodeLocation, "fullPath">,
    relativeMapping: FilesystemMappingType,
    newFilesystemNode: FilesystemNode,
    newFilesystemNodeParent: DirectoryNode | null,
  ) {
    this.globalFilesystemMappingForProjectIris[nodeLocation.projectIrisTreePath] = newFilesystemNode;
    this.globalFilesystemMappingForIris[nodeLocation.irisTreePath] = newFilesystemNode;
    relativeMapping[projectIri] = newFilesystemNode;
    this.nodeToParentMap[newFilesystemNode.irisTreePath] = newFilesystemNodeParent;
  }

  /**
   * Removes the entry with name {@link relativePath} from the provided {@link relativeMapping} and the global mapping present on class.
   * Also removes the entry from {@link nodeToParentMap}.
   */
  protected removeValueInFilesystemMapping(relativePath: string, relativeMapping: FilesystemMappingType) {
    const irisTreePath = relativeMapping[relativePath].irisTreePath;
    const projectIrisTreePath = relativeMapping[relativePath].projectIrisTreePath;
    delete this.globalFilesystemMappingForProjectIris[projectIrisTreePath];
    delete this.globalFilesystemMappingForIris[irisTreePath];
    delete relativeMapping[relativePath];
    delete this.nodeToParentMap[irisTreePath];
  }

  async getMetadataObject(treePath: string): Promise<ExportMetadataType> {
    const metaContent = await this.getDatastoreContent(treePath, getMetaPrefixType(), true);
    return metaContent as ExportMetadataType;
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
  ): Promise<FilesystemMappingType>

  abstract getFilesystemType(): AvailableFilesystems;
  abstract getDatastoreContent(irisTreePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any>;
  abstract shouldIgnoreDirectory(directory: string, gitProvider: GitProvider): boolean;
  abstract shouldIgnoreFile(file: string): boolean;
  abstract createFilesystemMapping(root: FilesystemNodeLocation): Promise<FilesystemMappingType>;
  abstract changeDatastore(otherFilesystem: FilesystemAbstraction, changed: ComparisonData): Promise<boolean>;
  abstract removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<boolean>;
  abstract removeFile(filesystemNode: FilesystemNode): Promise<boolean>;
  abstract updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, content: string): Promise<boolean>;
  abstract createDatastore(parentIriInToBeChangedFilesystem: string, otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean>;
}