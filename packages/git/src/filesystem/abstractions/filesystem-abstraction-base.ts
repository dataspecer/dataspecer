// TODO RadStr PR: Important observation, should be put mentioned also somewhere else, then be in code comment, but thesis text is too full already:
//  We currently do not support the fact to have 2 same project iris within one package
//  (that would happen if somebody imported the same git repo under package like we do for the other import)
//  Possible future solutions would be to generate new iri as project iri on import inside resource (or only if there is conflict)
//  ... but that is and not really clean and hard to implement. Technical consultant said that disabling importing into other package using Git is fine.

import { FilesystemNode, FilesystemMappingType, DirectoryNode, FilesystemNodeLocation, DatastoreInfo, ExportMetadataType } from "../../export-import-data-api.ts";
import { AvailableFilesystems, createEmptyFilesystemMapping, createFilesystemMappingFakeRoot, createInitialNodeToParentMap, FilesystemAbstraction, getMetaPrefixType } from "./filesystem-abstraction.ts";

import { DatastoreComparison } from "../../merge/merge-state.ts";

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
    const topLevelRoot = createFilesystemMappingFakeRoot();
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

  isDirectory(iriTreePath: string): boolean {
    return this.globalFilesystemMappingForIris[iriTreePath].type === "directory";
  }

  getDatastoreTypes(treePath: string): DatastoreInfo[] {
    return this.globalFilesystemMappingForIris[treePath].datastores;
  }

  readDirectory(iriTreePath: string): FilesystemNode[] {
    const directoryNode = this.globalFilesystemMappingForIris[iriTreePath];
    if (directoryNode.type !== "directory") {
      throw new Error("the read directory is not a directory");
    }

    return Object.values(directoryNode.content);
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
      await this.createFilesystemMapping(givenRoot, this.root.content, this.root);
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

  async getMetadataObject(irisTreePath: string): Promise<ExportMetadataType> {
    const metaContent = await this.getDatastoreContent(irisTreePath, getMetaPrefixType(), true);
    return metaContent as ExportMetadataType;
  }

  /**
   * @param mappedNodeLocation - for Git filesystem, the fullPath is path to parent and iri is projectIri,
   *  for DS filesystem it is the IRI and the fullpath is also iri. ... This is really kind of unfortunate API.
   *  ... so DS filesystem does not really uses the full path.
   * @param parentDirectoryNode is the last directory node on the path. That is the parent in the fileystem.
   */
  protected abstract createFilesystemMapping(
    mappedNodeLocation: FilesystemNodeLocation,
    filesystemMapping: FilesystemMappingType,
    parentDirectoryNode: DirectoryNode | null,
  ): Promise<FilesystemMappingType>

  abstract getFilesystemType(): AvailableFilesystems;
  abstract getDatastoreContent(irisTreePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any>;
  abstract changeDatastore(otherFilesystem: FilesystemAbstraction, changed: DatastoreComparison): Promise<boolean>;
  abstract removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<void>;
  abstract removeFile(filesystemNode: FilesystemNode): Promise<void>;
  abstract updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, content: string): Promise<boolean>;
  abstract createDatastore(parentIriInToBeChangedFilesystem: string, otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<void>;
}