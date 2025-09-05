import { ComparisonData } from "../../merge/merge-state.ts";
import { FilesystemNodeLocation, FilesystemMappingType, DirectoryNode, FilesystemNode, DatastoreInfo } from "../../export-import-data-api.ts";
import { GitProvider } from "../../git-provider-api.ts";
import { FilesystemAbstractionBase } from "../abstractions/filesystem-abstraction-base.ts";
import { AvailableFilesystems, FilesystemAbstraction, getDatastoreInfoOfGivenDatastoreType } from "../abstractions/filesystem-abstraction.ts";

/**
 * Very lightweight filesystem, which just serves as component to load datastore content from backend
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

  public static async getDatastoreContentDirectly(
    datastoreInfo: DatastoreInfo | null,
    shouldConvertToDatastoreFormat: boolean,
    backendApiPath: string,
    backendFilesystem: AvailableFilesystems | null,
  ) {
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

    const responseAsJSON = await response.json();
    console.info("getDatastoreContentDirectly", {responseAsJSON, datastoreInfo});       // TODO RadStr: Debug
    return responseAsJSON;
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
  removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<boolean> {
    throw new Error("Method not implemented.");
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

    const url = backendApiPath + "/git/update-datastore-content?";
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

    console.info("updateDatastoreContentDirectly", {datastoreInfo, response, newContent});       // TODO RadStr: Debug

    return response.ok;
  }


  async updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, content: string): Promise<boolean> {
    const datastoreInfo: DatastoreInfo = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType);
    return ClientFilesystem.updateDatastoreContentDirectly(datastoreInfo, content, this.backendFilesystem, this.backendApiPath);
  }
  createDatastore(otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

}