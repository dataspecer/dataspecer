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

  public static async getDatastoreContentForFullPath(
    resourceWithDatastore: FilesystemNode,
    datastoreInfo: DatastoreInfo,
    shouldConvertToDatastoreFormat: boolean,
    backendApiPath: string,
    backendFilesystem: AvailableFilesystems
  ) {
    if (resourceWithDatastore.metadataCache.iri === undefined) {
      throw new Error(`The iri in cache is not set for the resource ${resourceWithDatastore}`);
    }

    const pathToDatastore = datastoreInfo.fullPath;
    const format = datastoreInfo.format;
    const type = datastoreInfo.type;
    try {
      const fetchResult = await fetch(`${backendApiPath}/get-datastore-content?pathToDatastore=${pathToDatastore}&format=${format}&type=${type}&filesystem=${backendFilesystem}&shouldConvertToDatastoreFormat=${shouldConvertToDatastoreFormat}`, {
        method: "GET",
      });
      console.info("fetched data", fetchResult);   // TODO RadStr: Debug
      return fetchResult;
      // const fetchResultAsJson = await fetchResult.json();
      // console.info("fetched data as json", fetchResultAsJson);   // TODO RadStr: Debug

      // return fetchResultAsJson;
    }
    catch(error) {
      console.error(`Error when fetching data tree data for diff (for iri: ${pathToDatastore}). The error: ${error}`);
      throw error;
    }
  }


  protected createFilesystemMappingRecursive(mappedNodeLocation: FilesystemNodeLocation, filesystemMapping: FilesystemMappingType, parentDirectoryNode: DirectoryNode | null, shouldSetMetadataCache: boolean): Promise<FilesystemMappingType> {
    throw new Error("Method not implemented.");
  }
  async getDatastoreContent(treePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any> {
    const resourceWithDatastore: FilesystemNode = this.globalFilesystemMapping[treePath];
    const datastoreInfo: DatastoreInfo = getDatastoreInfoOfGivenDatastoreType(resourceWithDatastore, type);
    return ClientFilesystem.getDatastoreContentForFullPath(resourceWithDatastore, datastoreInfo, shouldConvertToDatastoreFormat, this.backendApiPath, this.backendFilesystem);
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
  updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, content: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  createDatastore(otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

}