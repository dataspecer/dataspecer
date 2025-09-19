import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { v4 as uuidv4 } from 'uuid';
import { GitProvider, FilesystemAbstractionBase, ComparisonData, DatastoreInfo, DirectoryNode, FilesystemMappingType, FilesystemNode, FilesystemNodeLocation, MetadataCacheType, createEmptyFilesystemMapping, createFilesystemMappingRoot, createMetaDatastoreInfo, FilesystemAbstraction, FileSystemAbstractionFactoryMethod, removeDatastoreFromNode, isDatastoreForMetadata, getDatastoreInfoOfGivenDatastoreType, AvailableFilesystems, convertDatastoreContentBasedOnFormat } from "@dataspecer/git";
import { ResourceModel } from "../../../models/resource-model.ts";
import { deleteBlob, deleteResource } from "../../../routes/resource.ts";
import { BaseResource } from "@dataspecer/core-v2/project";
import { currentVersion } from "../../../tools/migrations/index.ts";
import configuration from "../../../configuration.ts";
import { resourceModel as mainResourceModel } from "../../../main.ts";

// Note that DS always works with jsons as formats for datastores, it is too much work to make to make it work for everything.
// Since we would need to change every component (including cme) to support multiple formats.
// So we just convert it to js object and store it. and similiarly when creating mapping we just use json as format to the datastore info

export class DSFilesystem extends FilesystemAbstractionBase {
  /////////////////////////////////////
  // Properties
  /////////////////////////////////////
  private resourceModel: ResourceModel;


  /////////////////////////////////////
  // Factory method
  /////////////////////////////////////
  public static createFilesystemAbstraction: FileSystemAbstractionFactoryMethod = async (roots: FilesystemNodeLocation[], gitProvider: GitProvider | null): Promise<DSFilesystem> => {
    // Note that we ignore the git provider
    const createdFilesystem = new DSFilesystem(mainResourceModel);
    await createdFilesystem.initializeFilesystem(roots);
    return createdFilesystem;
  };


  /////////////////////////////////////
  // Constructor
  /////////////////////////////////////
  private constructor(resourceModel: ResourceModel) {
    super();
    this.resourceModel = resourceModel;
  }


  /////////////////////////////////////
  // Methods
  /////////////////////////////////////

  public getFilesystemType(): AvailableFilesystems {
    return AvailableFilesystems.DS_Filesystem;
  }

  public static async getDatastoreContentForPath(
    givenResourceModel: ResourceModel,
    fullPath: string,
    type: string,
    datastoreFormat: string | null,
    shouldConvertToDatastoreFormat: boolean
  ): Promise<any> {
    if (isDatastoreForMetadata(type)) {
      const resource = (await givenResourceModel.getResource(fullPath));
      if (resource === null) {
        throw new Error("The resource is not present in database, therefore we can not extract the metadata file");
      }

      const metadata = DSFilesystem.constructMetadataFromResource(resource);
      const metadataAsString: string = JSON.stringify(metadata);
      return convertDatastoreContentBasedOnFormat(metadataAsString, datastoreFormat, shouldConvertToDatastoreFormat);
    }
    else {
      const data = await givenResourceModel.storeModel.getModelStore(fullPath).getString();
      return convertDatastoreContentBasedOnFormat(data, datastoreFormat, shouldConvertToDatastoreFormat);
    }
  }

  public static async setDatastoreContentForPath(
    givenResourceModel: ResourceModel,
    fullPath: string,
    datastoreFormat: string | null,
    type: string,
    newContent: string
  ): Promise<boolean> {
    if (datastoreFormat === null) {
      datastoreFormat = "json";
    }
    // Hardcoded JSON. Check top of file for more info.
    const contentAsObject = convertDatastoreContentBasedOnFormat(newContent, datastoreFormat, true);
    if (isDatastoreForMetadata(type)) {
      // Pass in only the userMetadata
      await givenResourceModel.updateResourceMetadata(fullPath, contentAsObject.userMetadata ?? {});
    }
    else {
      await givenResourceModel.storeModel.getModelStore(fullPath).setJson(contentAsObject);
    }

    return true;
  }

  public static async removeDatastoreContentForPath(
    givenResourceModel: ResourceModel,
    parentFilesystemNodeIri: string,
    type: string,
  ): Promise<boolean> {
    await givenResourceModel.deleteModelStore(parentFilesystemNodeIri, type);
    return true;
  }


  async getDatastoreContent(treePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any> {
    // TODO RadStr: As said somewhere else ... improve the PrefixName type
    //              ... already improved now fix the code
    const relevantDatastore = getDatastoreInfoOfGivenDatastoreType(this.globalFilesystemMapping[treePath], type);
    if (relevantDatastore === undefined) {
      throw new Error(`Datastore with given type (${type}), does not exist`);     // TODO RadStr: Better error handling
    }
    const datastoreFormat = relevantDatastore.format;
    return await DSFilesystem.getDatastoreContentForPath(this.resourceModel, relevantDatastore.fullPath, type, datastoreFormat, shouldConvertToDatastoreFormat);
  }

  shouldIgnoreDirectory(directory: string, gitProvider: GitProvider): boolean {
    return false;
    // TODO RadStr: This is how I do it for the classic filesystem
    // if (directory.endsWith(".git")) {     // TODO RadStr: Maybe can be better integrated into the ignore file
    //   return {};
    // }
    // if (gitProvider.isGitProviderDirectory(directory)) {     // TODO RadStr: Maybe can be better integrated into the ignore file
    //   return {};
    // }
  }
  shouldIgnoreFile(file: string): boolean {
    return file === "README.md";
  }

  /**
   * @deprecated Calling the Recursive variant straight from constructor ... remove later
   */
  async createFilesystemMapping(root: FilesystemNodeLocation, shouldSetMetadataCache: boolean): Promise<FilesystemMappingType> {
    const rootDirectoryNode = createFilesystemMappingRoot();
    return this.createFilesystemMappingRecursive(root, rootDirectoryNode.content, rootDirectoryNode, shouldSetMetadataCache);   // TODO RadStr: Once again - should I use await?
  }

  // TODO RadStr: Rename to not contain the Recursive in name, since we removed the top level method
  protected async createFilesystemMappingRecursive(
    mappedNodeLocation: FilesystemNodeLocation,
    filesystemMapping: FilesystemMappingType,
    parentDirectoryNode: DirectoryNode | null,
    shouldSetMetadataCache: boolean,
  ): Promise<FilesystemMappingType> {
    const { iri, fullTreePath } = mappedNodeLocation;     // Note that we are not using the fullPath

    const resource = (await this.resourceModel.getResource(iri))!;

    let localNameCandidate = iri;
    if (iri.startsWith(fullTreePath)) {
      localNameCandidate = iri.slice(fullTreePath.length);
    }
    if (localNameCandidate.includes("/") || localNameCandidate.length === 0) {
      localNameCandidate = uuidv4();
    }
    let fullName = fullTreePath + localNameCandidate;
    let newNodeLocation: FilesystemNodeLocation | null = null;

    let filesystemNode: FilesystemNode;

    if (resource.types.includes(LOCAL_PACKAGE)) {
      fullName += "/"; // Create directory

      newNodeLocation = {
        iri: localNameCandidate,
        fullPath: localNameCandidate,
        fullTreePath: fullName,
      };

      const directoryNode: DirectoryNode = {
        name: newNodeLocation.iri,
        type: "directory",
        metadataCache: {},
        datastores: [],
        content: createEmptyFilesystemMapping(),
        fullTreePath: newNodeLocation.fullTreePath,
      };
      filesystemNode = directoryNode;

      const pckg = (await this.resourceModel.getPackage(iri))!;

      for (const subResource of pckg.subResources) {
        const newDirectoryNodeLocation: FilesystemNodeLocation = {
          iri: subResource.iri,
          fullPath: subResource.iri,      // TODO RadStr: Either that or the fullName, I think it should be the iri
          fullTreePath: fullName
        };
        await this.createFilesystemMappingRecursive(newDirectoryNodeLocation, filesystemNode.content, filesystemNode, shouldSetMetadataCache);
      }
    }
    else {  // Not a package
      newNodeLocation = {
        iri: localNameCandidate,
        fullPath: localNameCandidate,
        fullTreePath: fullName,
      };

      const fileNode: FilesystemNode = {
        name: newNodeLocation.iri,
        type: "file",
        metadataCache: {},
        datastores: [],
        fullTreePath: newNodeLocation.fullTreePath,
      }
      filesystemNode = fileNode;
    }
    this.setValueInFilesystemMapping(newNodeLocation, filesystemMapping, filesystemNode, parentDirectoryNode);

    // Maybe in future we will have something else than JSONs on backend, but right now always use JSONs for DS filesystem.
    // Check top of file for more info.
    if (shouldSetMetadataCache) {
      const metadata = DSFilesystem.constructMetadataFromResource(resource);
      filesystemNode.metadataCache = metadata;
    }
    // TODO RadStr: Once again using the iri, otherwise we crash ... so yeah it is no longer cache.
    // For Dataspecer fileystem hardcode JSONs as format. Check top of file for more info.
    const metaDatastoreInfo: DatastoreInfo = createMetaDatastoreInfo(filesystemNode.metadataCache.iri ?? localNameCandidate, "json");
    filesystemNode.datastores.push(metaDatastoreInfo);

    for (const [blobName, storeId] of Object.entries(resource.dataStores)) {
      const format = "json";
      const afterPrefix = `.${blobName}.${format}`;
      const prefixName: DatastoreInfo = {
        fullName: `${storeId}${afterPrefix}`,
        afterPrefix,
        type: blobName,
        name: storeId,
        format,
        fullPath: storeId,
      }
      filesystemNode.datastores.push(prefixName);
    }

    return filesystemMapping;
  }

  public static constructMetadataFromResource(resource: BaseResource): MetadataCacheType {
    return {
      iri: resource.iri,
      projectIri: resource.projectIri,
      types: resource.types,
      userMetadata: resource.userMetadata,
      metadata: resource.metadata,
      _version: currentVersion,
      _exportVersion: -1,   // This has to be rewritten by the exporter for the root resource! That is why it is -1 so we know that it is wrong on check
      _exportedAt: new Date().toISOString(),
      _exportedBy: configuration.host,
    };
  }

  async changeDatastore(otherFilesystem: FilesystemAbstraction, changed: ComparisonData, shouldUpdateMetadataCache: boolean): Promise<boolean> {
    // Here we just update the blob

    const relevantDatastore = getDatastoreInfoOfGivenDatastoreType(changed.oldVersion!, changed.affectedDataStore.type);
    if (relevantDatastore === undefined) {
      throw new Error(`Datastore with given type (${changed.affectedDataStore.type}), does not exist`);     // TODO RadStr: Better error handling
    }

    const newContent = await otherFilesystem.getDatastoreContent(changed.newVersion!.fullTreePath, changed.affectedDataStore.type, false);
    await this.updateDatastore(changed.oldVersion!, changed.affectedDataStore.type, newContent);

    return true;      // TODO RadStr: ... Always returns true
  }

  async removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<boolean> {
    // We have to perform 2 actions:
    // 1) remove the datastore, that is remove the blob with datastore and update the resource to no longer contain the datastore
    // 2) If the resource will become empty, we also have to remove the datastore
    await deleteBlob(filesystemNode.name, datastoreType);
    removeDatastoreFromNode(filesystemNode, datastoreType);
    if (shouldRemoveFileWhenNoDatastores) {
      if (filesystemNode.datastores.length === 0) {       // TODO RadStr: Not sure about this, we will always have metadata, right? or no?
        await deleteResource(filesystemNode.name);
        // TODO RadStr: Just put fullPath inside the FilesystemNode and be done with it
        this.removeValueInFilesystemMapping(filesystemNode.name, this.getParentForNode(filesystemNode)?.content ?? this.root.content);
      }
    }

    return true;    // TODO RadStr: ... Always returns true
  }

  async removeFile(filesystemNode: FilesystemNode): Promise<boolean> {
    for (const datastore of filesystemNode.datastores) {
      const datastoreType = datastore.fullName;
      this.removeDatastore(filesystemNode, datastoreType, true);
    }

    return true;    // TODO RadStr: ... Always returns true
  }

  async updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, newContent: string): Promise<boolean> {
    const relevantDatastore = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType);
    return DSFilesystem.setDatastoreContentForPath(this.resourceModel, relevantDatastore.fullPath, relevantDatastore.format, datastoreType, newContent)
  }

  createDatastore(otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<boolean> {
    // this.resourceModel.createPackage(parentIri, directoryNode.name, userMetadata)
    // createPackageResource()
    // const metadata = ;
    // const parentIri = directoryNode.parent?.name ?? local
    // this.resourceModel.createPackage(parentIri, directoryNode, metadata);
    // this.createFilesystemNode
    throw new Error("Method not implemented.");
  }
}
