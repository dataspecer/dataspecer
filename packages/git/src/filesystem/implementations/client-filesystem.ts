import { DatastoreComparison } from "../../merge/merge-state.ts";
import { FilesystemNodeLocation, FilesystemMappingType, DirectoryNode, FilesystemNode, DatastoreInfo, ExportShareableMetadataType } from "../../export-import-data-api.ts";
import { FilesystemAbstractionBase } from "../abstractions/filesystem-abstraction-base.ts";
import { AvailableFilesystems, FilesystemAbstraction, getDatastoreInfoOfGivenDatastoreType } from "../abstractions/filesystem-abstraction.ts";


export type CreateDatastoreFilesystemNodesInfo = {
  parentProjectIri: string,
  projectIrisTreePath: string,
  userMetadataDatastoreInfo: DatastoreInfo,
};


/**
 * Very lightweight filesystem, which just serves as component to to work with datastore content from backend
 */
export class ClientFilesystem extends FilesystemAbstractionBase {
  private backendFilesystem: AvailableFilesystems;
  private backendApiPath: string;

  constructor(
    backendFilesystem: AvailableFilesystems,
    globalFilesystemMappingForProjectIris: FilesystemMappingType,
    globalFilesystemMappingForIris: FilesystemMappingType,
    backendApiPath: string,
  ) {
    super();
    this.backendFilesystem = backendFilesystem;
    this.globalFilesystemMappingForProjectIris = globalFilesystemMappingForProjectIris;
    this.globalFilesystemMappingForIris = globalFilesystemMappingForIris;
    this.backendApiPath = backendApiPath;
  }

  public getFilesystemType(): AvailableFilesystems {
    return this.backendFilesystem;
  }

  public static async removeFilesystemNodeDirectly(
    mergeStateUuid: string,
    filesystemNodeTreePath: string,
    backendApiPath: string,
    backendFilesystem: AvailableFilesystems | null,
  ): Promise<boolean> {
    if (backendFilesystem === null) {
      return false;
    }

    const queryAsObject = {
      filesystemNodeTreePath,
      filesystem: backendFilesystem,
      mergeStateUuid,
    };

    let url = backendApiPath + "/git/remove-filesystem-node?";
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

    console.info("removeFilesystemNodeDirectly", { response, filesystemNodeTreePath });       // TODO RadStr Debug:
    return response.ok;
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


  protected createFilesystemMappingRecursive(mappedNodeLocation: FilesystemNodeLocation, filesystemMapping: FilesystemMappingType, parentDirectoryNode: DirectoryNode | null): Promise<FilesystemMappingType> {
    throw new Error("Method not implemented.");
  }
  async getDatastoreContent(irisTreePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any> {
    const resourceWithDatastore: FilesystemNode = this.globalFilesystemMappingForIris[irisTreePath];
    const datastoreInfo: DatastoreInfo | null = getDatastoreInfoOfGivenDatastoreType(resourceWithDatastore, type);
    return ClientFilesystem.getDatastoreContentDirectly(datastoreInfo, shouldConvertToDatastoreFormat, this.backendApiPath, this.backendFilesystem);
  }
  createFilesystemMapping(root: FilesystemNodeLocation): Promise<FilesystemMappingType> {
    throw new Error("Method not implemented.");
  }
  changeDatastore(otherFilesystem: FilesystemAbstraction, changed: DatastoreComparison): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  /**
   * @param shouldRemoveFileWhenNoDatastores For now always just set to false.
   * @returns
   */
  public static async removeDatastoreDirectly(
    mergeStateUuid: string,
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
      mergeStateUuid,
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
    const datastoreInfo: DatastoreInfo | null = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType);
    // The "" will throw error on backend, so for it to work it should be allowed to have missing merge state id in the request,
    // but since we are currently (and probably always will be) using just the static methods, there is no need to implement it
    return ClientFilesystem.removeDatastoreDirectly("",
      filesystemNode.metadata.iri, datastoreInfo, this.backendApiPath,
      this.backendFilesystem, shouldRemoveFileWhenNoDatastores);
  }
  removeFile(filesystemNode: FilesystemNode): Promise<boolean> {
    throw new Error("Method not implemented.");
  }


  public static async updateDatastoreContentDirectly(
    mergeStateUuid: string,
    datastoreParentIri: string | null,
    datastoreInfo: DatastoreInfo | null,
    newContent: string,
    backendFilesystem: AvailableFilesystems | null,
    backendApiPath: string,
  ) {
    if (datastoreParentIri === null) {
      console.error("The datastore to update has no parent filesystem node.");
      return false;
    }
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
        datastoreParentIri,
        mergeStateUuid,
      }),
    });

    console.info("updateDatastoreContentDirectly", {datastoreInfo, response, newContent});       // TODO RadStr Debug:

    return response.ok;
  }


  async updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, content: string): Promise<boolean> {
    const datastoreInfo: DatastoreInfo | null = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType);
    // The "" will throw error on backend, so for it to work it should be allowed to have missing merge state id in the request,
    // but since we are currently (and probably always will be) using just the static methods, there is no need to implement it
    return ClientFilesystem.updateDatastoreContentDirectly("", filesystemNode.metadata.iri, datastoreInfo, content, this.backendFilesystem, this.backendApiPath);
  }


  public static async createFilesystemNodesDirectly(
    mergeStateUuid: string,
    createdFilesystemNodesInTreePath: ExportShareableMetadataType[],
    parentIri: string,
    backendFilesystem: AvailableFilesystems | null,
    backendApiPath: string,
  ): Promise<string[]> {
    if (backendFilesystem === null) {
      console.error("There is not set any filesystem, so the we can not create new filesystem nodes on backend.");
      return [];
    }


    const url = backendApiPath + "/git/create-filesystem-nodes";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mergeStateUuid,
        parentIri,
        createdFilesystemNodesInTreePath,
        filesystem: backendFilesystem,
      }),
    });

    console.info("createFilesystemNodesDirectly", {response});       // TODO RadStr Debug:
    if (!response.ok) {
      console.error(response);
      throw new Error("Failed to create filesystem nodes directly");
    }

    return (await response.json()) as string[];
  }


  public static async createDatastoreDirectlyWithParents(
    mergeStateUuid: string,
    createdFilesystemNodesInTreePath: ExportShareableMetadataType[],
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
        mergeStateUuid,
        parentIri,
        createdFilesystemNodesInTreePath,
        type: datastoreInfo.type,
        format: datastoreInfo.format,
        filesystem: backendFilesystem,
        content,
      }),
    });

    console.info("createDatastoreDirectlyWithParents", {datastoreInfo, response, content});       // TODO RadStr Debug:
    return response.ok;
  }

  public static async createDatastoreDirectly(
    mergeStateUuid: string,
    parentIri: string | null,
    content: string,
    backendFilesystem: AvailableFilesystems | null,
    datastoreInfo: DatastoreInfo | null,
    backendApiPath: string,
  ): Promise<boolean> {
    if (parentIri === null) {
      console.error({datastoreInfo});
      console.error("The parent iri was not provided, we do not know under which filesystem node should be the datastore put.");
      return false;
    }
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
        mergeStateUuid,
        createdFilesystemNodesInTreePath: [],
        parentIri,
        type: datastoreInfo.type,
        format: datastoreInfo.format,
        filesystem: backendFilesystem,
        content,
      }),
    });

    console.info("createDatastoreDirectly", {datastoreInfo, response, content});       // TODO RadStr Debug:
    return response.ok;
  }


  async createDatastore(parentIriInToBeChangedFilesystem: string, otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean> {
    const content = await ClientFilesystem.getDatastoreContentDirectly(changedDatastore, true, this.backendApiPath, this.backendFilesystem);
    const filesystemNodesInTreePath: ExportShareableMetadataType[] = [];
    let currentNode: FilesystemNode | null = filesystemNode;
    let parent: DirectoryNode | null = null;
    while (currentNode !== null) {
      parent = otherFilesystem.getParentForNode(currentNode);
      filesystemNodesInTreePath.push(currentNode.metadata);
      currentNode = parent;
    }
    // The "" will throw error on backend, so for it to work it should be allowed to have missing merge state id in the request,
    // but since we are currently (and probably always will be) using just the static methods, there is no need to implement it
    return ClientFilesystem.createDatastoreDirectlyWithParents("",
      filesystemNodesInTreePath.reverse(),
      parentIriInToBeChangedFilesystem, content,
      this.backendFilesystem, changedDatastore, this.backendApiPath);
  }
}