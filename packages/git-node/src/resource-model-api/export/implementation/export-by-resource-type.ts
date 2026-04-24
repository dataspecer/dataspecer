import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import path from "path";
import { createDatastoreWithReplacedIris, DirectoryNode, ExportVersionType, FilesystemNode, isDatastoreForMetadata, ResourceTypes, resourceTypeToTypeDirectoryMapping } from "@dataspecer/git";
import { PackageExporterNew } from "./export-new.ts";
import { PackageExporterBase } from "../export-api/export-base.ts";


export class PackageExporterFactory {
  /**
   * @todo Could be probably programmed better by having Map, having the static export version stored as static element at the Export classes and so on.
   */
  public static createPackageExporter(exportVersion: ExportVersionType) {
    switch(exportVersion) {
      case 1:
        return new PackageExporterNew();
      case 2:
        return new PackageExporterByResourceType();
      default:
        throw new Error(`Programmer error - forgot to extend factory switch. Unknown export version: ${exportVersion}`);
    }
  }
}


/**
 * The new version of export. More structured than the old one. It puts the models into specific directories, which are decided by the type of the model.
 */
export class PackageExporterByResourceType extends PackageExporterBase {
  getExportVersion(): number {
    return 2;
  }

  protected async exportDirectory(
    directory: DirectoryNode,
    pathToExportDirectory: string,
  ) {
    await this.exportDatastores(directory, pathToExportDirectory);
    for (const [name, filesystemNode] of Object.entries(directory.content)) {
      if (filesystemNode.type === "directory") {
        let exportFullPath: string;
        if (this.shouldUseIrisForNames) {
          const iri = filesystemNode.metadata.iri.substring(filesystemNode.metadata.iri.lastIndexOf("/") + 1);
          exportFullPath = this.createPathBasedOnResourceType(pathToExportDirectory, iri, filesystemNode.metadata.types[0]);
        }
        else {
          exportFullPath = this.createPathBasedOnResourceType(pathToExportDirectory, filesystemNode.metadata.projectIri, filesystemNode.metadata.types[0]);
        }
        await this.exportDirectory(filesystemNode, exportFullPath);
      }
      else {
        await this.exportDatastores(filesystemNode, pathToExportDirectory);
      }
    }
  }

  private async exportDatastores(
    filesystemNode: FilesystemNode,
    pathToExportDirectory: string,
  ) {
    // The fullName and exportFullName are the path to datastore without the suffix (that is the type and format - for example .meta.json). And in case of directories it ends with /
    let exportFullName: string;
    if (filesystemNode.type === "directory") {
      exportFullName = pathToExportDirectory;
    }
    else {
      if (this.shouldUseIrisForNames) {
        const iri = filesystemNode.metadata.iri.substring(filesystemNode.metadata.iri.lastIndexOf("/") + 1);
        exportFullName = this.createPathBasedOnResourceType(pathToExportDirectory, iri, filesystemNode.metadata.types[0]);
      }
      else {
        exportFullName = this.createPathBasedOnResourceType(pathToExportDirectory, filesystemNode.metadata.projectIri, filesystemNode.metadata.types[0]);
      }
    }

    for(const datastore of filesystemNode.datastores) {
      let data;
      if (isDatastoreForMetadata(datastore.type)) {
        data = filesystemNode.metadata;
        if (this.iriMapping !== null) {
          const { datastoreWithReplacedIris } = createDatastoreWithReplacedIris(data, this.iriMapping, this.shouldRunTestVariantForIriReplacement);
          data = datastoreWithReplacedIris;
        }
        if (this.shouldRemoveExportedAt) {
          // It is annoying when using with git commit - each meta has it changed for every commit it even when not changed
          delete data["_exportedAt"];
          // Remove modificationDate based on Stepan's feedback.
          delete data["metadata"]["modificationDate"];
        }
        this.setExportVersionInternal(data);
      }
      else {
        data = await this.importFilesystem.getDatastoreContent(filesystemNode.irisTreePath, datastore.type, true);
        if (this.iriMapping !== null) {
          // Note that if there are some missing iris it is ok, those iris exist because there are some new resources.
          const { datastoreWithReplacedIris } = createDatastoreWithReplacedIris(data, this.iriMapping, this.shouldRunTestVariantForIriReplacement);
          data = datastoreWithReplacedIris;
        }
      }

      await this.exportActions.exportDatastoreAction(exportFullName, datastore, data, this.exportFormat);
    }
  }

  private createPathBasedOnResourceType(pathToResource: string, filesystemNodeName: string, resourceType: string) {
    let resourceDirectory: string;
    resourceDirectory = resourceTypeToTypeDirectoryMapping[resourceType as ResourceTypes];
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
