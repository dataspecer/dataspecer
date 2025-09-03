import { API_SPECIFICATION_MODEL, APPLICATION_GRAPH, LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { BaseResource } from "../models/resource-model.ts";
import { currentVersion } from "../tools/migrations/index.ts";
import configuration from "../configuration.ts";

import path from "path";
import { PackageExporterBase } from "./export-base.ts";
import { DirectoryNode, FilesystemNode, isDatastoreForMetadata, MetadataCacheType } from "@dataspecer/git";

export class PackageExporterByResourceType extends PackageExporterBase {
  async exportDirectory(
    directory: DirectoryNode,
    pathToDirectory: string,
    pathToExportDirectory: string,
  ) {
    await this.exportDatastores(directory, pathToDirectory, pathToExportDirectory);
    for (const [name, filesystemNode] of Object.entries(directory.content)) {
      if (filesystemNode.type === "directory") {
        // TODO RadStr: We can newly use the fullPath from the filesystem node
        // const fullPath = path.join(pathToDirectory, name) + "/";
        // TODO RadStr: No this is correct I think
        const fullPath = this.createPathBasedOnResourceType(pathToDirectory, filesystemNode.name, filesystemNode.metadataCache.types[0]);
        const exportFullPath = this.createPathBasedOnResourceType(pathToExportDirectory, filesystemNode.name, filesystemNode.metadataCache.types[0]);
        await this.exportDirectory(filesystemNode, fullPath, exportFullPath);
      }
      else {
        await this.exportDatastores(filesystemNode, pathToDirectory, pathToExportDirectory);
      }
    }
  }

  private async exportDatastores(
    filesystemNode: FilesystemNode,
    pathToDirectory: string,
    pathToExportDirectory: string,
  ) {
    for(const datastore of filesystemNode.datastores) {
      let fullName: string;
      let exportFullName: string;
      let data;
      // fullname = pathToDirectory + filesystemNode.name;
      if (filesystemNode.type === "directory") {
        fullName = pathToDirectory;
        exportFullName = pathToExportDirectory;
        console.info("directory", {fullname: fullName, pathToDirectory, pathToExportDirectory});   // TODO RadStr: Debug print
      }
      else {
        fullName = this.createPathBasedOnResourceType(pathToDirectory, filesystemNode.name, filesystemNode.metadataCache.types[0]);
        exportFullName = this.createPathBasedOnResourceType(pathToExportDirectory, filesystemNode.name, filesystemNode.metadataCache.types[0]);
      }
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

        data = await this.importFilesystem.getDatastoreContent(filesystemNode.fullTreePath, datastore.type, true);
        // TODO RadStr: Replaced by getDatastoreContent
        // data = await this.resourceModel.storeModel.getModelStore(datastore.fullName.substring(0, datastore.fullName.indexOf("."))).getJson();



        // fullname = path.join(pathToDirectory, datastore.fullName);
        // fullname = pathToDirectory + filesystemNode.name;
      }

      await this.exportActions.exportDatastoreAction(exportFullName, datastore, data);
      // await this.writeBlob(fullname, datastore.type, data);
    }
  }

  // TODO RadStr: Same method is defined in the directory version
  private createPathBasedOnResourceType(pathToResource: string, filesystemNodeName: string, resourceType: string) {
    let resourceDirectory: string;

//     export const LOCAL_PACKAGE = "http://dataspecer.com/resources/local/package";
// export const LOCAL_VISUAL_MODEL = "http://dataspecer.com/resources/local/visual-model";
// export const LOCAL_SEMANTIC_MODEL = "http://dataspecer.com/resources/local/semantic-model";
// export const API_SPECIFICATION_MODEL = "http://dataspecer.com/resources/local/api-specification";
// export const APPLICATION_GRAPH = "http://dataspecer.com/resources/local/application-graph";

// // Old models from core@v1
// export const V1 = {
//     CIM: "http://dataspecer.com/resources/v1/cim",
//     PIM: "http://dataspecer.com/resources/v1/pim",
//     PSM: "http://dataspecer.com/resources/v1/psm",
//     GENERATOR_CONFIGURATION: "http://dataspecer.com/resources/v1/generator-configuration",
// };

    resourceDirectory = resourceTypetoTypeDirectoryMapping[resourceType as ResourceTypes];
    // If it is not serousce type, the value is undefined
    if (resourceDirectory === undefined) {
      throw new Error("Unknown type of resource, you probably forgot to extend switch in export class: " + resourceType);
    }

    // TODO RadStr: Remove the commented switch - it is the old version
    // switch(resourceType) {
    //   case LOCAL_PACKAGE:
    //     resourceDirectory = "directories";
    //     break;
    //   case LOCAL_VISUAL_MODEL:
    //     resourceDirectory = "visual-models"
    //     break;
    //   case LOCAL_SEMANTIC_MODEL:
    //     resourceDirectory = "semantic-models"
    //     break;
    //   case API_SPECIFICATION_MODEL:
    //     resourceDirectory = "api-specification-models"
    //     break;
    //   case APPLICATION_GRAPH:
    //     resourceDirectory = "application-graphs"
    //     break;
    //   case V1.CIM:
    //     resourceDirectory = "cims"
    //     break;
    //   case V1.GENERATOR_CONFIGURATION:
    //     resourceDirectory = "generator-configurations"
    //     break;
    //   case V1.PIM:
    //     resourceDirectory = "pims"
    //     break;
    //   case V1.PSM:
    //     resourceDirectory = "psms"
    //     break;
    //     // TODO RadStr: Some name inconsistencies for SGOV and pim wrapper, but that is how it was I guess
    //   case "https://dataspecer.com/core/model-descriptor/sgov":
    //     resourceDirectory = "sgovs";
    //     break;
    //   case "https://dataspecer.com/core/model-descriptor/pim-store-wrapper":
    //     resourceDirectory = "pim-wrappers";
    //     break;
    //   default:
    //     throw new Error("Unknown type of resource, you probably forgot to extend switch in export class: " + resourceType);
    // }

    // TODO RadStr: Remove path.join from everywhere
    // const result = path.join(pathToResource, resourceDirectory, filesystemNodeName);
    // Notice that there is not / between the first two variables - the path already ends with "/", because local_packages ends with "/" as seen in return of this method - TODO RadStr: Is this correct? I guess yes?
    const result = `${pathToResource}${resourceDirectory}/${filesystemNodeName}`;
    console.info("result");
    console.info(result);
    console.info(path.join(pathToResource, resourceDirectory, filesystemNodeName));

    return resourceType === LOCAL_PACKAGE ? (result + "/") : result;
    // return result;
  }


  // TODO RadStr: remove ... As said, it is deprecated
  // /**
  //  * TODO RadStr: Should probably be instance method but name the class differently and change its API
  //  * @deprecated Implemented in abstracted filesystem
  //  */
  // async createFilesystemMapping(iri: string, shouldSetMetadataCache: boolean): Promise<FilesystemMappingType> {
  //   const rootDirectoryNode = createFilesystemMappingRoot();
  //   return this.createFilesystemMappingRecursive(iri, "", rootDirectoryNode.content, rootDirectoryNode, shouldSetMetadataCache);   // TODO RadStr: Once again - should I use await?
  // }

  // /**
  //  * @deprecated Implemented in abstracted filesystem
  //  */
  // private async createFilesystemMappingRecursive(
  //   iri: string,
  //   path: string,
  //   filesystemMapping: FilesystemMappingType,
  //   parentDirectoryNode: DirectoryNode | null,
  //   shouldSetMetadataCache: boolean,
  // ): Promise<FilesystemMappingType> {
  //   const resource = (await this.resourceModel.getResource(iri))!;

  //   let localNameCandidate = iri;
  //   if (iri.startsWith(path)) {
  //     localNameCandidate = iri.slice(path.length);
  //   }
  //   if (localNameCandidate.includes("/") || localNameCandidate.length === 0) {
  //     localNameCandidate = uuidv4();
  //   }
  //   let fullName = path + localNameCandidate;

  //   let filesystemNode: FilesystemNode;

  //   if (resource.types.includes(LOCAL_PACKAGE)) {
  //     fullName += "/"; // Create directory


  //     const directoryNode: DirectoryNode = {
  //       type: "directory",
  //       metadataCache: {},
  //       datastores: [],
  //       name: localNameCandidate,
  //       content: createEmptyFilesystemMapping(),
  //       parent: parentDirectoryNode,
  //       fullTreePath: fullName,
  //     };
  //     filesystemNode = directoryNode;


  //     const pckg = (await this.resourceModel.getPackage(iri))!;

  //     for (const subResource of pckg.subResources) {
  //       // await this.exportResource(subResource.iri, fullName);
  //       await this.createFilesystemMappingRecursive(subResource.iri, fullName, filesystemNode.content, filesystemNode, shouldSetMetadataCache);
  //     }
  //   }
  //   else {  // Not a package
  //     const fileNode: FileNode = {
  //       type: "file",
  //       datastores: [],
  //       metadataCache: {},
  //       name: localNameCandidate,
  //       parent: parentDirectoryNode,
  //       fullTreePath: fullName,
  //     }
  //     filesystemNode = fileNode;
  //   }
  //   filesystemMapping[localNameCandidate] = filesystemNode;



  //   const metaPrefixName: DatastoreInfo = createMetaPrefixName(localNameCandidate, "json");
  //   filesystemNode.datastores.push(metaPrefixName);
  //   if (shouldSetMetadataCache) {
  //     const metadata = this.constructMetadataFromResource(resource);
  //     filesystemNode.metadataCache = metadata;
  //   }

  //   // TODO RadStr: The export code - just remove after commit
  //   // const metadata = this.constructMetadataFromResource(resource);
  //   // await this.writeBlob(fullName, "meta", metadata);

  //   for (const [blobName, storeId] of Object.entries(resource.dataStores)) {
  //     const format = "json"
  //     const afterPrefix = `.${blobName}.${format}`;
  //     const prefixName: DatastoreInfo = {
  //       fullName: `${storeId}${afterPrefix}`,
  //       afterPrefix,
  //       type: blobName,
  //       name: storeId,
  //       format,
  //       fullPath: storeId
  //     }
  //     filesystemNode.datastores.push(prefixName);

  //     // TODO RadStr: The export code - just remove after commit
  //     // const data = await this.resourceModel.storeModel.getModelStore(storeId).getJson();
  //     // await this.writeBlob(fullName, blobName, data);
  //   }

  //   return filesystemMapping;
  // }

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
      _exportVersion: 2,
      _exportedAt: new Date().toISOString(),
      _exportedBy: configuration.host,
    };
  }

  // TODO RadStr: Remove
  // private async writeBlob(iri: string, blobName: string, data: object) {
  //   // TODO RadStr: Probably should have different implementations based on the chosen format - now we just use json
  //   const stream = this.zipStreamDictionary.writePath(iri + "." + blobName + ".json");
  //   await stream.write(JSON.stringify(data, null, 2));
  //   stream.close();
  // }
}


// TODO RadStr: Can be handled better maybe - at least the V1
// TODO RadStr: Think if I should put it into the class as static or keep it outside - probably static
export type ResourceTypes = typeof LOCAL_PACKAGE |
                            typeof LOCAL_VISUAL_MODEL |
                            typeof LOCAL_SEMANTIC_MODEL |
                            typeof API_SPECIFICATION_MODEL |
                            typeof APPLICATION_GRAPH |
                            "http://dataspecer.com/resources/v1/cim" | // typeof V1.CIM
                            "http://dataspecer.com/resources/v1/generator-configuration" | // typeof V1.GENERATOR_CONFIGURATION
                            "http://dataspecer.com/resources/v1/pim" | // typeof V1.PIM
                            "http://dataspecer.com/resources/v1/psm" | // typeof V1.PSM
                            "https://dataspecer.com/core/model-descriptor/sgov" |
                            "https://dataspecer.com/core/model-descriptor/pim-store-wrapper";

export const resourceTypetoTypeDirectoryMapping: Record<ResourceTypes, string> = {
  "http://dataspecer.com/resources/local/package": "directories",
  "http://dataspecer.com/resources/local/visual-model": "visual-models",
  "http://dataspecer.com/resources/local/semantic-model": "semantic-models",
  "http://dataspecer.com/resources/local/api-specification": "api-specifications",
  "http://dataspecer.com/resources/local/application-graph": "application-graphs",
  "http://dataspecer.com/resources/v1/cim": "cims",
  "http://dataspecer.com/resources/v1/generator-configuration": "generator-configurations",
  "http://dataspecer.com/resources/v1/pim": "pims",
  "http://dataspecer.com/resources/v1/psm": "psms",
  "https://dataspecer.com/core/model-descriptor/sgov": "sgovs",
  "https://dataspecer.com/core/model-descriptor/pim-store-wrapper": "pim-wrappers",
};

const typeExportArtificialDirectories = Object.values(resourceTypetoTypeDirectoryMapping);

export function isArtificialExportDirectory(directoryName: string): boolean {
  return typeExportArtificialDirectories.includes(directoryName);
}