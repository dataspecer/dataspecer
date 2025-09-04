import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { v4 as uuidv4 } from 'uuid';
import { GitProvider, FilesystemAbstractionBase, ComparisonData, DatastoreInfo, DirectoryNode, FilesystemMappingType, FilesystemNode, FilesystemNodeLocation, MetadataCacheType, createEmptyFilesystemMapping, createFilesystemMappingRoot, createMetaPrefixName, FilesystemAbstraction, FileSystemAbstractionFactoryMethod, removeDatastoreFromNode, isDatastoreForMetadata } from "@dataspecer/git";
import { ResourceModel } from "../../../models/resource-model.ts";
import { deleteBlob, deleteResource, updateBlob } from "../../../routes/resource.ts";
import { BaseResource } from "@dataspecer/core-v2/project";
import { convertDatastoreBasedOnFormat } from "../../../utils/git-utils.ts";
import { currentVersion } from "../../../tools/migrations/index.ts";
import configuration from "../../../configuration.ts";
import { resourceModel as mainResourceModel } from "../../../main.ts";



export class DSFilesystem extends FilesystemAbstractionBase {
  /////////////////////////////////////
  // Properties
  /////////////////////////////////////
  private resourceModel: ResourceModel;   // TODO RadStr: Do I even need this? 1) in class instance, 2) in this file at all? can't I just use the extracted stuff inside the file with deleteBlob, etc.?


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

  public static async getDatastoreContentForPath(givenResourceModel: ResourceModel, fullPath: string, type: string, datastoreFormat: string | null, shouldConvertToDatastoreFormat: boolean): Promise<any> {
    if (isDatastoreForMetadata(type)) {
      const resource = (await givenResourceModel.getResource(fullPath));
      if (resource === null) {
        throw new Error("The resource is not present in database, therefore we can not extract the metadata file");
      }

      const metadata = DSFilesystem.constructMetadataFromResource(resource);
      const metadataAsString: string = JSON.stringify(metadata);
      return convertDatastoreBasedOnFormat(metadataAsString, datastoreFormat, shouldConvertToDatastoreFormat);
    }
    else {
      const data = await givenResourceModel.storeModel.getModelStore(fullPath).getString();
      return convertDatastoreBasedOnFormat(data, datastoreFormat, shouldConvertToDatastoreFormat);
    }
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
        // await this.exportResource(subResource.iri, fullName);      // TODO RadStr: Remove

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



    const metaPrefixName: DatastoreInfo = createMetaPrefixName(localNameCandidate, "json");
    filesystemNode.datastores.push(metaPrefixName);
    if (shouldSetMetadataCache) {
      const metadata = DSFilesystem.constructMetadataFromResource(resource);
      filesystemNode.metadataCache = metadata;
    }

    // TODO RadStr: The export code - remove later
    // const metadata = this.constructMetadataFromResource(resource);
    // await this.writeBlob(fullName, "meta", metadata);

    for (const [blobName, storeId] of Object.entries(resource.dataStores)) {
      const format = "json";
      const afterPrefix = `.${blobName}.${format}`;
      const prefixName: DatastoreInfo = {
        fullName: `${storeId}${afterPrefix}`,
        afterPrefix, // TODO RadStr: .json ... well probably not? or yes?
        type: blobName,
        name: storeId,
        format,
        fullPath: storeId,
      }
      filesystemNode.datastores.push(prefixName);

      // TODO RadStr: The export code - remove later
      // const data = await this.resourceModel.storeModel.getModelStore(storeId).getJson();
      // await this.writeBlob(fullName, blobName, data);
    }

    return filesystemMapping;
  }

  private static constructMetadataFromResource(resource: BaseResource): MetadataCacheType {
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

  async updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, content: string): Promise<boolean> {
    const resource = await this.resourceModel.getResource(filesystemNode.name);      // TODO RadStr: What Am I even getting the resource for??
    if (resource === null) {
      throw new Error("The Resource for given datastore does not exist");
    }

    // TODO RadStr: Maybe just enough to call the updateBlob, it will just throw exception if it does not exist
    updateBlob(filesystemNode.name, datastoreType, content);

    return true;    // TODO RadStr: ... Always returns true
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


export function getDatastoreInfoOfGivenDatastoreType(filesystemNode: FilesystemNode, type: string) {
  const relevantDatastore = filesystemNode.datastores.find(datastore => datastore.type === type);
  return relevantDatastore;
}
