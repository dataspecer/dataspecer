import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import path from "path";
import { PackageExporterBase } from "./export-base.ts";
import { DirectoryNode, FilesystemNode, isDatastoreForMetadata } from "@dataspecer/git";
import { resourceTypetoTypeDirectoryMapping, ResourceTypes } from "./export.ts";

export class PackageExporterByResourceType extends PackageExporterBase {
  getExportVersion(): number {
    return 2;
  }

  protected async exportDirectory(
    directory: DirectoryNode,
    pathToDirectory: string,
    pathToExportDirectory: string,
  ) {
    await this.exportDatastores(directory, pathToDirectory, pathToExportDirectory);
    for (const [name, filesystemNode] of Object.entries(directory.content)) {
      if (filesystemNode.type === "directory") {
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
    // The fullName and exportFullName are the path to datastore without the suffix (that is the type and format - for example .meta.json). And in case of directories it ends with /
    let fullName: string;
    let exportFullName: string;
    if (filesystemNode.type === "directory") {
      fullName = pathToDirectory;
      exportFullName = pathToExportDirectory;
    }
    else {
      fullName = this.createPathBasedOnResourceType(pathToDirectory, filesystemNode.name, filesystemNode.metadataCache.types[0]);
      exportFullName = this.createPathBasedOnResourceType(pathToExportDirectory, filesystemNode.name, filesystemNode.metadataCache.types[0]);
    }

    for(const datastore of filesystemNode.datastores) {
      let data;
      if (isDatastoreForMetadata(datastore.type)) {
        data = filesystemNode.metadataCache;
        this.setExportVersionInternal(data);
      }
      else {
        data = await this.importFilesystem.getDatastoreContent(filesystemNode.fullTreePath, datastore.type, true);
      }

      await this.exportActions.exportDatastoreAction(exportFullName, datastore, data, this.exportFormat);
    }
  }

  private createPathBasedOnResourceType(pathToResource: string, filesystemNodeName: string, resourceType: string) {
    let resourceDirectory: string;
    resourceDirectory = resourceTypetoTypeDirectoryMapping[resourceType as ResourceTypes];
    // If it is not resource type, the value is undefined
    if (resourceDirectory === undefined) {
      throw new Error("Unknown type of resource, you probably forgot to extend switch in export class: " + resourceType);
    }

    // Notice that there is not / between the first two variables - the path already ends with "/", because local_packages ends with "/" as seen in return of this method
    const result = `${pathToResource}${resourceDirectory}/${filesystemNodeName}`;
    // TODO RadStr DEBUG: Debug prints
    console.info("result");
    console.info(result);
    console.info(path.join(pathToResource, resourceDirectory, filesystemNodeName));

    return resourceType === LOCAL_PACKAGE ? (result + "/") : result;
  }
}
