import { GitProvider } from "../../git-providers/git-provider-api.ts";
import { ComparisonData } from "../../routes/git-webhook-handler.ts";
import { FilesystemNode, FilesystemMappingType, MetadataCacheType, DirectoryNode, FilesystemNodeLocation, DatastoreInfo } from "../export-import-data-api.ts";
import { createEmptyFilesystemMapping, createFilesystemMappingRoot, FilesystemAbstraction, getMetaPrefixType } from "./filesystem-abstraction.ts";

import path from "path";

export abstract class FilesystemAbstractionBase implements FilesystemAbstraction {
  /////////////////////////////////////
  // Properties
  /////////////////////////////////////

  protected root: DirectoryNode;
  protected globalFilesystemMapping: FilesystemMappingType;


  /////////////////////////////////////
  // Constructor
  /////////////////////////////////////

  protected constructor() {
    const emptyMapping = createEmptyFilesystemMapping();
    const topLevelRoot = createFilesystemMappingRoot();
    this.globalFilesystemMapping = createEmptyFilesystemMapping();
    this.root = topLevelRoot;
    this.setValueInFilesystemMapping({iri: "", fullTreePath: ""}, emptyMapping, topLevelRoot);
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


  async initializeFilesystem(filesystemRoots: FilesystemNodeLocation[]): Promise<void> {
    for (const givenRoot of filesystemRoots) {
      await this.createFilesystemMappingRecursive(givenRoot, this.root.content, this.root, true);
    }
  }

  /**
   * Sets the both recursive and global mapping values correctly
   */
  protected setValueInFilesystemMapping(nodeLocation: Omit<FilesystemNodeLocation, "fullPath">, relativeMapping: FilesystemMappingType, newFilesystemNode: FilesystemNode) {
    this.globalFilesystemMapping[nodeLocation.fullTreePath] = newFilesystemNode;
    relativeMapping[nodeLocation.iri] = newFilesystemNode;
  }

  /**
   * Removes the entry with name {@link relativePath} from the provided {@link relativeMapping} and the global mapping present on class.
   */
  protected removeValueInFilesystemMapping(relativePath: string, relativeMapping: FilesystemMappingType) {
    delete this.globalFilesystemMapping[relativeMapping[relativePath].fullTreePath];
    delete relativeMapping[relativePath];
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