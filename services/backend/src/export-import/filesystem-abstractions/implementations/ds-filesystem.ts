import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { v4 as uuidv4 } from 'uuid';
import {
  FilesystemAbstractionBase, DatastoreComparison, DatastoreInfo, DirectoryNode, FilesystemMappingType, FilesystemNode,
  FilesystemNodeLocation, createEmptyFilesystemMapping, createFilesystemMappingRoot, createMetaDatastoreInfo, FilesystemAbstraction,
  removeDatastoreFromNode, isDatastoreForMetadata, getDatastoreInfoOfGivenDatastoreType, AvailableFilesystems, convertDatastoreContentBasedOnFormat,
  ExportMetadataType, GitIgnore
} from "@dataspecer/git";
import { deleteBlob, deleteResource } from "../../../routes/resource.ts";
import { BaseResource } from "@dataspecer/core-v2/project";
import { currentVersion } from "../../../tools/migrations/index.ts";
import configuration from "../../../configuration.ts";
import { ResourceChangeType } from "../../../models/resource-change-observer.ts";
import { ResourceModelForFilesystemRepresentation } from "../../export.ts";
import { FileSystemAbstractionFactoryMethod } from "../backend-filesystem-abstraction-factory.ts";

// Note that DS always works with jsons as formats for datastores, it is too much work to make to make it work for everything.
// Since we would need to change every component (including cme) to support multiple formats.
// So we just convert it to js object and store it. and similiarly when creating mapping we just use json as format to the datastore info

export class DSFilesystem extends FilesystemAbstractionBase {
  /////////////////////////////////////
  // Properties
  /////////////////////////////////////
  private resourceModel: ResourceModelForFilesystemRepresentation;


  /////////////////////////////////////
  // Factory method
  /////////////////////////////////////
  public static createFilesystemAbstraction: FileSystemAbstractionFactoryMethod = async (
    roots: FilesystemNodeLocation[],
    gitIgnore: GitIgnore | null,
    resourceModel: ResourceModelForFilesystemRepresentation | null,
  ): Promise<DSFilesystem> => {
    if (resourceModel === null) {
      // Alternatively we could allow the field in the class to be null and crash when performing the operation.
      throw new Error("Expected the resourceModel to be not null. The DSFilesystem needs it to perform certain operations.");
    }

    // Note that we ignore the git provider
    const createdFilesystem = new DSFilesystem(resourceModel);
    await createdFilesystem.initializeFilesystem(roots);
    return createdFilesystem;
  };


  /////////////////////////////////////
  // Constructor
  /////////////////////////////////////
  private constructor(resourceModel: ResourceModelForFilesystemRepresentation) {
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
    givenResourceModel: ResourceModelForFilesystemRepresentation,
    fullPath: string,
    type: string,
    datastoreFormat: string | null,
    shouldConvertToDatastoreFormat: boolean,
  ): Promise<any> {
    if (isDatastoreForMetadata(type)) {
      const resource = (await givenResourceModel.getResource(fullPath));
      if (resource === null) {
        throw new Error("The resource is not present in database. Therefore, we can not extract the metadata file");
      }

      const metadata = DSFilesystem.constructMetadataFromResource(resource);
      const metadataAsString: string = JSON.stringify(metadata);
      return convertDatastoreContentBasedOnFormat(metadataAsString, datastoreFormat, shouldConvertToDatastoreFormat, null);
    }
    else {
      const data = await givenResourceModel.storeModel.getModelStore(fullPath).getString();
      return convertDatastoreContentBasedOnFormat(data, datastoreFormat, shouldConvertToDatastoreFormat, null);
    }
  }

  public static async setDatastoreContentForPath(
    datastoreParentIri: string,
    givenResourceModel: ResourceModelForFilesystemRepresentation,
    fullPath: string,
    datastoreFormat: string | null,
    type: string,
    newContent: string,
    mergeStateUUIDsToIgnoreInUpdating?: string[],
  ): Promise<boolean> {
    if (datastoreFormat === null) {
      datastoreFormat = "json";
    }
    // Hardcoded JSON. Check top of file for more info.
    const contentAsObject = convertDatastoreContentBasedOnFormat(newContent, datastoreFormat, true, null);
    if (isDatastoreForMetadata(type)) {
      // Pass in only the userMetadata
      await givenResourceModel.updateResourceMetadata(fullPath, contentAsObject.userMetadata ?? {}, mergeStateUUIDsToIgnoreInUpdating);
    }
    else {
      const onUpdate = () => givenResourceModel.updateModificationTime(datastoreParentIri, type, ResourceChangeType.Modified, true, true, mergeStateUUIDsToIgnoreInUpdating);
      await givenResourceModel.storeModel.getModelStore(fullPath, [onUpdate]).setJson(contentAsObject);
    }

    return true;
  }

  public static async removeDatastoreContentForPath(
    givenResourceModel: ResourceModelForFilesystemRepresentation,
    parentFilesystemNodeIri: string,
    type: string,
    mergeStateUUIDsToIgnoreInUpdating: string[],
  ): Promise<boolean> {
    await givenResourceModel.deleteModelStore(parentFilesystemNodeIri, type, mergeStateUUIDsToIgnoreInUpdating);
    return true;
  }


  async getDatastoreContent(irisTreePath: string, type: string, shouldConvertToDatastoreFormat: boolean): Promise<any> {
    // TODO RadStr: As said somewhere else ... improve the PrefixName type
    //              ... already improved now fix the code
    const relevantDatastore = getDatastoreInfoOfGivenDatastoreType(this.globalFilesystemMappingForIris[irisTreePath], type);
    if (relevantDatastore === null) {
      throw new Error(`Datastore with given type (${type}), does not exist`);
    }
    const datastoreFormat = relevantDatastore.format;
    return await DSFilesystem.getDatastoreContentForPath(this.resourceModel, relevantDatastore.fullPath, type, datastoreFormat, shouldConvertToDatastoreFormat);
  }

  /**
   * @deprecated Calling the Recursive variant straight from constructor ... remove later
   */
  async createFilesystemMapping(root: FilesystemNodeLocation): Promise<FilesystemMappingType> {
    const rootDirectoryNode = createFilesystemMappingRoot();
    return this.createFilesystemMappingRecursive(root, rootDirectoryNode.content, rootDirectoryNode);   // TODO RadStr: Once again - should I use await?
  }

  // TODO RadStr: Rename to not contain the Recursive in name, since we removed the top level method
  protected async createFilesystemMappingRecursive(
    mappedNodeLocation: FilesystemNodeLocation,
    filesystemMapping: FilesystemMappingType,
    parentDirectoryNode: DirectoryNode | null,
  ): Promise<FilesystemMappingType> {
    const { iri, irisTreePath, projectIrisTreePath } = mappedNodeLocation;     // Note that we are not using the fullPath

    const resource = (await this.resourceModel.getResource(iri))!;
    const projectIri = resource.projectIri;

    let localProjectIriNameCandidate = projectIri;
    // Unless we made a mistake we take care of it on import (we do it on import and not here because of the create branch inside DS)
    // TODO RadStr I don't know: Keep it or not?
    if (projectIri.startsWith(projectIrisTreePath) && projectIrisTreePath.length > 0) {
      console.info({projectIri, projectIrisTreePath});
      localProjectIriNameCandidate = projectIri.slice(projectIrisTreePath.length);
      throw new Error("Should not happen for projectIri");
    }
    if (localProjectIriNameCandidate.includes("/") || localProjectIriNameCandidate.length === 0) {
      localProjectIriNameCandidate = uuidv4();
      console.info({localProjectIriNameCandidate});
      throw new Error("Should not happen for projectIri");
    }
    let fullProjectIriName = projectIrisTreePath + localProjectIriNameCandidate;

    // Same as for projectIri, but here we actually do it right here and not on import
    let localIriNameCandidate = iri;
    if (iri.startsWith(irisTreePath)) {
      localIriNameCandidate = iri.slice(irisTreePath.length);
    }
    if (localIriNameCandidate.includes("/") || localIriNameCandidate.length === 0) {
      localIriNameCandidate = uuidv4();
    }
    let fullIriName = irisTreePath + localIriNameCandidate;


    /**
     * fullPath does not matter (but we use iri and not projectIri, since it is the identifier of the resource).
     */
    let newNodeLocation: FilesystemNodeLocation | null = null;
    let filesystemNode: FilesystemNode;

    if (resource.types.includes(LOCAL_PACKAGE)) {
      newNodeLocation = {
        iri: localIriNameCandidate,
        fullPath: localIriNameCandidate,
        irisTreePath: fullIriName,
        projectIrisTreePath: fullProjectIriName,
      };

      const directoryNode: DirectoryNode = {
        name: newNodeLocation.iri,
        type: "directory",
        metadata: {} as ExportMetadataType,    // We are not using the value in the course of creating the mapping!
        datastores: [],
        content: createEmptyFilesystemMapping(),
        irisTreePath: newNodeLocation.irisTreePath,
        projectIrisTreePath: newNodeLocation.projectIrisTreePath,
      };
      filesystemNode = directoryNode;

      const pckg = (await this.resourceModel.getPackage(iri))!;
      this.setValueInFilesystemMapping(projectIri, newNodeLocation, filesystemMapping, filesystemNode, parentDirectoryNode);

      // For recursion append the / behind it (but for the actual iris, etc. not, that is why we do it here and not before)
      fullProjectIriName += "/"; // Create directory
      fullIriName += "/";
      newNodeLocation.irisTreePath = fullIriName;
      newNodeLocation.projectIrisTreePath = fullProjectIriName;

      for (const subResource of pckg.subResources) {
        const newDirectoryNodeLocation: FilesystemNodeLocation = {
          iri: subResource.iri,
          fullPath: subResource.iri,      // TODO RadStr: Either that or the fullName, I think it should be the iri
          irisTreePath: fullIriName,
          projectIrisTreePath: fullProjectIriName,
        };
        await this.createFilesystemMappingRecursive(newDirectoryNodeLocation, filesystemNode.content, filesystemNode);
      }
    }
    else {  // Not a package
      newNodeLocation = {
        iri: localIriNameCandidate,
        fullPath: localIriNameCandidate,
        irisTreePath: fullIriName,
        projectIrisTreePath: fullProjectIriName,
      };

      const fileNode: FilesystemNode = {
        name: newNodeLocation.iri,
        type: "file",
        metadata: {} as ExportMetadataType,    // We are not using the value in the course of creating the mapping!
        datastores: [],
        irisTreePath: newNodeLocation.irisTreePath,
        projectIrisTreePath: newNodeLocation.projectIrisTreePath,
      };
      filesystemNode = fileNode;
      this.setValueInFilesystemMapping(projectIri, newNodeLocation, filesystemMapping, filesystemNode, parentDirectoryNode);
    }

    // Maybe in future we will have something else than JSONs on backend, but right now always use JSONs for DS filesystem.
    // Check top of file for more info.
    const metadata = DSFilesystem.constructMetadataFromResource(resource);
    filesystemNode.metadata = metadata;

    // TODO RadStr: Once again using the iri, otherwise we crash ... so yeah it is no longer cache.
    // For Dataspecer fileystem hardcode JSONs as format. Check top of file for more info.
    const metaDatastoreInfo: DatastoreInfo = createMetaDatastoreInfo(filesystemNode.metadata.iri , "json");
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

  public static constructMetadataFromResource(resource: BaseResource): ExportMetadataType {
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

  async changeDatastore(otherFilesystem: FilesystemAbstraction, changed: DatastoreComparison): Promise<void> {
    // Here we just update the blob

    const relevantDatastore = getDatastoreInfoOfGivenDatastoreType(changed.old!, changed.affectedDataStore.type);
    if (relevantDatastore === null) {
      throw new Error(`Datastore with given type (${changed.affectedDataStore.type}), does not exist`);
    }

    const newContent = await otherFilesystem.getDatastoreContent(changed.new!.irisTreePath, changed.affectedDataStore.type, false);
    await this.updateDatastore(changed.old!, changed.affectedDataStore.type, newContent);
  }

  async removeDatastore(filesystemNode: FilesystemNode, datastoreType: string, shouldRemoveFileWhenNoDatastores: boolean): Promise<void> {
    // We have to perform 2 actions:
    // 1) remove the datastore, that is remove the blob with datastore and update the resource to no longer contain the datastore
    // 2) If the resource will become empty, we also have to remove the datastore
    await deleteBlob(filesystemNode.metadata.iri, datastoreType);
    removeDatastoreFromNode(filesystemNode, datastoreType);
    if (shouldRemoveFileWhenNoDatastores) {
      if (filesystemNode.datastores.length === 0) {       // TODO RadStr: Not sure about this, we will always have metadata, right? or no?
        await deleteResource(filesystemNode.metadata.iri);
        // TODO RadStr: Just put fullPath inside the FilesystemNode and be done with it
        this.removeValueInFilesystemMapping(filesystemNode.name, this.getParentForNode(filesystemNode)?.content ?? this.root.content);
      }
    }
  }

  async removeFile(filesystemNode: FilesystemNode): Promise<void> {
    for (const datastore of filesystemNode.datastores) {
      const datastoreType = datastore.fullName;
      this.removeDatastore(filesystemNode, datastoreType, true);
    }
  }

  async updateDatastore(filesystemNode: FilesystemNode, datastoreType: string, newContent: string): Promise<void> {
    const relevantDatastore = getDatastoreInfoOfGivenDatastoreType(filesystemNode, datastoreType);
    if (relevantDatastore === null) {
      throw new Error(`Could not update datastore of type ${datastoreType} inside ${filesystemNode.projectIrisTreePath}, since it does not exist on the node`);
    }
    DSFilesystem.setDatastoreContentForPath(filesystemNode.metadata.iri, this.resourceModel, relevantDatastore.fullPath, relevantDatastore.format, datastoreType, newContent)
  }

  createDatastore(parentIriInToBeChangedFilesystem: string, otherFilesystem: FilesystemAbstraction, filesystemNode: FilesystemNode, changedDatastore: DatastoreInfo): Promise<void> {
    // this.resourceModel.createPackage(parentIri, directoryNode.name, userMetadata)
    // createPackageResource()
    // const metadata = ;
    // const parentIri = directoryNode.parent?.name ?? local
    // this.resourceModel.createPackage(parentIri, directoryNode, metadata);
    // this.createFilesystemNode
    throw new Error("Method not implemented.");
  }
}
