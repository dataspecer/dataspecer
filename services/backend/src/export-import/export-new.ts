import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { BaseResource, ResourceModel } from "../models/resource-model.ts";
import { v4 as uuidv4 } from 'uuid';
import { currentVersion } from "../tools/migrations/index.ts";
import configuration from "../configuration.ts";
import { DirectoryNode, FileNode, FilesystemMappingType, FilesystemNode, MetadataCacheType, DatastoreInfo } from "./export-import-data-api.ts";
import { createEmptyFilesystemMapping, createFilesystemMappingRoot, createMetaPrefixName, getMetaPrefixType } from "./filesystem-abstractions/filesystem-abstraction.ts";

import path from "path";
import { ZipStreamDictionary } from "../utils/zip-stream-dictionary.ts";


// TODO RadStr: Put this method into some separate file
export function isDatastoreForMetadata(datastoreType: string): boolean {
  return datastoreType === getMetaPrefixType();
}


// TODO RadStr: Trying new API for exporters and importers - so this should in future substitute the PackageExporter and PackageImporter (in the import case)
export class PackageExporterNew {
  resourceModel: ResourceModel;
  zipStreamDictionary!: ZipStreamDictionary;

  constructor(resourceModel: ResourceModel) {
    this.resourceModel = resourceModel;
  }

  async doExportFromIRI(iri: string): Promise<Buffer> {
    const mapping = await this.createFilesystemMapping(iri, true);

    // TODO RadStr: Same as handle-webhook
    const filesystemNodeEntries = Object.entries(mapping);
    if (!(filesystemNodeEntries.length === 1 && filesystemNodeEntries[0][1].type === "directory")) {
      console.error("The mapping does not have root directory or the root is not a directory");
      throw new Error("Could not perform export, since the mapping does not have root directory or the root is not a directory.");
    }
    const [rootDirectoryName, rootDirectory] = filesystemNodeEntries[0];

    await this.doExportFromRootDirectory(rootDirectoryName, rootDirectory);
    return await this.zipStreamDictionary.save();
  }

  async doExportFromRootDirectory(rootDirectoryName: string, rootDirectory: DirectoryNode): Promise<Buffer> {
    this.zipStreamDictionary = new ZipStreamDictionary();
    await this.exportDirectory(rootDirectory, rootDirectoryName + path.sep);
    return await this.zipStreamDictionary.save();
  }

  private async exportDirectory(directory: DirectoryNode, pathToDirectory: string) {
    await this.exportDatastores(directory, pathToDirectory);
    for (const [name, filesystemNode] of Object.entries(directory.content)) {
      if (filesystemNode.type === "directory") {
        // TODO RadStr: We can newly use the fullPath from the filesystem node
        const fullPath = path.join(pathToDirectory, name) + path.sep;
        await this.exportDirectory(filesystemNode, fullPath)
      }
      else {
        await this.exportDatastores(filesystemNode, pathToDirectory);
      }
    }
  }

  private async exportDatastores(filesystemNode: FilesystemNode, pathToDirectory: string) {
    for(const datastore of filesystemNode.datastores) {
      let fullname: string;
      let data;
      fullname = pathToDirectory + filesystemNode.name;
      if (isDatastoreForMetadata(datastore.type)) {
        data = filesystemNode.metadataCache;
        // fullname = path.join(pathToDirectory, datastore.afterPrefix);
        // fullname = pathToDirectory;
        // const stream = this.zipStreamDictionary.writePath(fullname);
        // await stream.write(JSON.stringify(data, null, 2));
        // await stream.close();
      }
      else {
        // TODO RadStr: Kind of hardcoded
        // TODO RadStr: + It expects the "pathToDirectory" to end with / for directories

        data = await this.resourceModel.storeModel.getModelStore(datastore.fullName.substring(0, datastore.fullName.indexOf("."))).getJson();
        // fullname = path.join(pathToDirectory, datastore.fullName);
        // fullname = pathToDirectory + filesystemNode.name;
      }
      await this.writeBlob(fullname, datastore.type, data);
    }
  }

  /**
   * TODO RadStr: Should probably be instance method but name the class differently and change its API
   * @deprecated Implemented in abstracted filesystem
   */
  async createFilesystemMapping(iri: string, shouldSetMetadataCache: boolean): Promise<FilesystemMappingType> {
    const rootDirectoryNode = createFilesystemMappingRoot();
    return this.createFilesystemMappingRecursive(iri, "", rootDirectoryNode.content, rootDirectoryNode, shouldSetMetadataCache);   // TODO RadStr: Once again - should I use await?
  }

  /**
   * @deprecated Implemented in abstracted filesystem
   */
  private async createFilesystemMappingRecursive(
    iri: string,
    path: string,
    filesystemMapping: FilesystemMappingType,
    parentDirectoryNode: DirectoryNode | null,
    shouldSetMetadataCache: boolean,
  ): Promise<FilesystemMappingType> {
    const resource = (await this.resourceModel.getResource(iri))!;

    let localNameCandidate = iri;
    if (iri.startsWith(path)) {
      localNameCandidate = iri.slice(path.length);
    }
    if (localNameCandidate.includes("/") || localNameCandidate.length === 0) {
      localNameCandidate = uuidv4();
    }
    let fullName = path + localNameCandidate;

    let filesystemNode: FilesystemNode;

    if (resource.types.includes(LOCAL_PACKAGE)) {
      fullName += "/"; // Create directory


      const directoryNode: DirectoryNode = {
        type: "directory",
        metadataCache: {},
        datastores: [],
        name: localNameCandidate,
        content: createEmptyFilesystemMapping(),
        parent: parentDirectoryNode,
        fullTreePath: fullName,
      };
      filesystemNode = directoryNode;


      const pckg = (await this.resourceModel.getPackage(iri))!;

      for (const subResource of pckg.subResources) {
        // await this.exportResource(subResource.iri, fullName);
        await this.createFilesystemMappingRecursive(subResource.iri, fullName, filesystemNode.content, filesystemNode, shouldSetMetadataCache);
      }
    }
    else {  // Not a package
      const fileNode: FileNode = {
        type: "file",
        datastores: [],
        metadataCache: {},
        name: localNameCandidate,
        parent: parentDirectoryNode,
        fullTreePath: fullName,
      }
      filesystemNode = fileNode;
    }
    filesystemMapping[localNameCandidate] = filesystemNode;



    const metaPrefixName: DatastoreInfo = createMetaPrefixName(localNameCandidate, "json");
    filesystemNode.datastores.push(metaPrefixName);
    if (shouldSetMetadataCache) {
      const metadata = this.constructMetadataFromResource(resource);
      filesystemNode.metadataCache = metadata;
    }

    // TODO RadStr: The export code - just remove after commit
    // const metadata = this.constructMetadataFromResource(resource);
    // await this.writeBlob(fullName, "meta", metadata);

    for (const [blobName, storeId] of Object.entries(resource.dataStores)) {
      const format = "json"
      const afterPrefix = `.${blobName}.${format}`;
      const prefixName: DatastoreInfo = {
        fullName: `${storeId}${afterPrefix}`,
        afterPrefix,
        type: blobName,
        datastoreName: storeId,
        format,
        fullPath: storeId
      }
      filesystemNode.datastores.push(prefixName);

      // TODO RadStr: The export code - just remove after commit
      // const data = await this.resourceModel.storeModel.getModelStore(storeId).getJson();
      // await this.writeBlob(fullName, blobName, data);
    }

    return filesystemMapping;
  }

  /**
   * @deprecated Implemented in abstracted filesystem
   */
  private constructMetadataFromResource(resource: BaseResource): MetadataCacheType {
    return {
      iri: resource.iri,
      types: resource.types,
      userMetadata: resource.userMetadata,
      metadata: resource.metadata,
      _version: currentVersion,
      _exportVersion: 1,
      _exportedAt: new Date().toISOString(),
      _exportedBy: configuration.host,
    };
  }

  private async writeBlob(iri: string, blobName: string, data: object) {
    // TODO RadStr: Probably should have different implementations based on the chosen format - now we just use json
    const stream = this.zipStreamDictionary.writePath(iri + "." + blobName + ".json");
    await stream.write(JSON.stringify(data, null, 2));
    stream.close();
  }
}


