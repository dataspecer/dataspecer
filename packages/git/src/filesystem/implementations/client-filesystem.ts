import { ComparisonData } from "../../merge/merge-state.ts";
import { FilesystemNodeLocation, FilesystemMappingType, DirectoryNode, FilesystemNode, DatastoreInfo, ExportMetadataCacheType } from "../../export-import-data-api.ts";
import { GitProvider } from "../../git-provider-api.ts";
import { FilesystemAbstractionBase } from "../abstractions/filesystem-abstraction-base.ts";
import { AvailableFilesystems, FilesystemAbstraction, getDatastoreInfoOfGivenDatastoreType } from "../abstractions/filesystem-abstraction.ts";


export type CreateDatastoreFilesystemNodesInfo = {
  parentProjectIri: string,
  treePath: string,
  userMetadataDatastoreInfo: DatastoreInfo,
};

export type CreateDatastoreFilesystemNodesData = {
  parentProjectIri: string,
  treePath: string,
  userMetadata: ExportMetadataCacheType,
};

/**
 * Very lightweight filesystem, which just serves as component to to work with datastore content from backend
 */
export class ClientFilesystem extends FilesystemAbstractionBase {
  private backendFilesystem: AvailableFilesystems;
  private backendApiPath: string;

  constructor(
    backendFilesystem: AvailableFilesystems,
    globalFilesystemMapping: FilesystemMappingType,
    backendApiPath: string,
  ) {
    super();
    this.backendFilesystem = backendFilesystem;
    this.globalFilesystemMapping = globalFilesystemMapping;
    this.backendApiPath = backendApiPath;
  }

  public getFilesystemType(): AvailableFilesystems {
    return this.backendFilesystem;
  }

  public static async getDatastoreContentDirectly(
    datastoreInfo: DatastoreInfo | null,
    shouldConvertToDatastoreFormat: boolean,
    backendApiPath: string,
    backendFilesystem: AvailableFilesystems | null,
  ): Promise<string | any> {
    if (datastoreInfo === null) {
      return null;
    }
    if (backendFilesystem === null) {
      return null;
    }

    const queryAsObject = {
      pathToDatastore: encodeURIComponent(datastoreInfo.fullPath),
      format: datastoreInfo.format,
      type: datastoreInfo.type,
      filesystem: backendFilesystem,
      shouldConvertToDatastoreFormat,
    };

    let url = backendApiPath + "/git/get-datastore-content?";
    for (const [key, value] of Object.entries(queryAsObject)) {
      url += key;
      url += "=";
      url += value;
      url += "&";
    }
    url = url.slice(0, -1);

    const response = await fetch(url, {
      method: "GET",
    });

    const textResponse = await response.text();
    console.info("getDatastoreContentDirectly", {textResponse, datastoreInfo});       // TODO RadStr Debug:
    return textResponse;
  }


  protected createFilesystemMappingRecursive(mappedNodeLocation: FilesystemNodeLocation, filesystemMapping: FilesystemMappingType, parentDirectoryNode: DirectoryNode | null, shouldSetMetadataCache: boolean): Promise<FilesystemMappingType> {
    throw new Error("Method not implemented.");
  }
  async getDatastoreContent(treePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any> {
    const resourceWithDatastore: FilesystemNode = this.globalFilesystemMapping[treePath];
    const datastoreInfo: DatastoreInfo = getDatastoreInfoOfGivenDatastoreType(resourceWithDatastore, type);
    return ClientFilesystem.getDatastoreContentDirectly(datastoreInfo, shouldConvertToDatastoreFormat, this.backendApiPath, this.backendFilesystem);
  }
  shouldIgnoreDirectory(directory: string, gitProvider: GitProvider): boolean {
    throw new Error("Method not implemented.");
  }
  shouldIgnoreFile(file: string): boolean {
    throw new Error("Method not implemented.");
  }
  createFilesystemMapping(root: FilesystemNodeLocation, shouldSetMetadataCache: boolean): Promise<FilesystemMappingType> {
    throw new Error("Method not implemented.");
  }
  changeDatastore(otherFilesystem: FilesystemAbstraction, changed: ComparisonData, shouldUpdateMetadataCache: boolean): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  /**
   * @param shouldRemoveFileWhenNoDatastores For now always just set to false.
   * @returns
   */
  public static async removeDatastoreDirectly(
    filesystemNodeIri: string,
    datastoreInfo: DatastoreInfo | null,
    backendApiPath: string,
    backendFilesystem: AvailableFilesystems | null,
    shouldRemoveFileWhenNoDatastores: boolean,
  ): Promise<boolean> {
    if (datastoreInfo === null) {
      return false;
    }
    if (backendFilesystem === null) {
      return false;
    }

    const encodedFullPath = encodeURIComponent(datastoreInfo.fullPath);

    const queryAsObject = {
      filesystemNodeIri,
      pathToDatastore: encodedFullPath,
      filesystem: backendFilesystem,
      type: datastoreInfo.type,
      shouldRemoveFileWhenNoDatastores,
    };

    let url = backendApiPath + "/git/remove-datastore-content?";
    for (const [key, value] of Object.entries(queryAsObject)) {
      url += key;
      url += "=";
      url += value;
      url += "&";
    }
    url = url.slice(0, -1);

    const response = await fetch(url, {
      method: "DELETE",
    });

    console.info("removeDatastoreDirectly", { response, datastoreInfo });       // TODO RadStr Debug:
    return response.ok;
  }

  removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<boolean> {
    const datastoreInfo: DatastoreInfo = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType);
    return ClientFilesystem.removeDatastoreDirectly(
      filesystemNode.metadataCache.iri, datastoreInfo, this.backendApiPath,
      this.backendFilesystem, shouldRemoveFileWhenNoDatastores);
  }
  removeFile(filesystemNode: FilesystemNode): Promise<boolean> {
    throw new Error("Method not implemented.");
  }


  public static async updateDatastoreContentDirectly(
    datastoreInfo: DatastoreInfo | null,
    newContent: string,
    backendFilesystem: AvailableFilesystems | null,
    backendApiPath: string,
  ) {
    if (datastoreInfo === null) {
      console.error("There is not any datastore in editor, we can not perform update.");
      return false;
    }
    if (backendFilesystem === null) {
      console.error("There is not set any filesystem, so the we can not update datastore on backend.");
      return false;
    }

    const url = backendApiPath + "/git/update-datastore-content";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathToDatastore: datastoreInfo.fullPath,
        filesystem: backendFilesystem,
        format: datastoreInfo.format,
        type: datastoreInfo.type,
        newContent,
      }),
    });

    console.info("updateDatastoreContentDirectly", {datastoreInfo, response, newContent});       // TODO RadStr Debug:

    return response.ok;
  }


  async updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, content: string): Promise<boolean> {
    const datastoreInfo: DatastoreInfo = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType);
    return ClientFilesystem.updateDatastoreContentDirectly(datastoreInfo, content, this.backendFilesystem, this.backendApiPath);
  }


  public static async createDatastoreDirectly(
    createdFilesystemNodesInTreePath: CreateDatastoreFilesystemNodesData[],
    parentIri: string,
    content: string,
    backendFilesystem: AvailableFilesystems | null,
    datastoreInfo: DatastoreInfo | null,
    backendApiPath: string,
  ): Promise<boolean> {
    if (datastoreInfo === null) {
      console.error("There is not any datastore in editor, we can not create new datastore on backend.");
      return false;
    }
    if (backendFilesystem === null) {
      console.error("There is not set any filesystem, so the we can not create new datastore on backend.");
      return false;
    }


    const url = backendApiPath + "/git/create-datastore-content";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentIri,
        createdFilesystemNodesInTreePath,
        type: datastoreInfo.type,
        format: datastoreInfo.format,
        filesystem: backendFilesystem,
        content,
      }),
    });

    console.info("createDatastoreContentDirectly", {datastoreInfo, response, content});       // TODO RadStr Debug:
    return response.ok;
  }


  async createDatastore(parentIriInToBeChangedFilesystem: string, otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean> {
    const content = await ClientFilesystem.getDatastoreContentDirectly(changedDatastore, true, this.backendApiPath, this.backendFilesystem);
    const filesystemNodesInTreePath: CreateDatastoreFilesystemNodesData[] = [];
    let currentNode = filesystemNode;
    let parent: DirectoryNode | null = null;
    while (currentNode !== null) {
      parent = otherFilesystem.getParentForNode(currentNode);
      filesystemNodesInTreePath.push({
        parentProjectIri: parent.metadataCache.projectIri ?? "",
        treePath: currentNode.fullTreePath,
        userMetadata: currentNode.metadataCache,
      });
      currentNode = parent;
    }
    return ClientFilesystem.createDatastoreDirectly(
      filesystemNodesInTreePath.reverse(),
      parentIriInToBeChangedFilesystem, content,
      this.backendFilesystem, changedDatastore, this.backendApiPath);
  }
}