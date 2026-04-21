import { createDatastoreWithReplacedIris, DirectoryNode, FilesystemNode, isDatastoreForMetadata } from "@dataspecer/git";
import { PackageExporterBase } from "../export-api/export-base.ts";


export class PackageExporterNew extends PackageExporterBase {
  getExportVersion(): number {
    return 1;
  }

  protected async exportDirectory(directory: DirectoryNode, pathToExportDirectory: string) {
    await this.exportDatastores(directory, pathToExportDirectory);
    for (const [name, filesystemNode] of Object.entries(directory.content)) {
      if (filesystemNode.type === "directory") {
        let exportFullPath: string;
        if (this.shouldUseIrisForNames) {
          const iri = filesystemNode.metadata.iri.substring(filesystemNode.metadata.iri.lastIndexOf("/") + 1);
          exportFullPath = `${pathToExportDirectory}${iri}/`;
        }
        else {
          exportFullPath = `${pathToExportDirectory}${filesystemNode.metadata.projectIri}/`;
        }
        await this.exportDirectory(filesystemNode, exportFullPath)
      }
      else {
        await this.exportDatastores(filesystemNode, pathToExportDirectory);
      }
    }
  }

  private async exportDatastores(filesystemNode: FilesystemNode, pathToExportDirectory: string) {
    let exportFullName: string;
    if (this.shouldUseIrisForNames) {
      const iri = filesystemNode.metadata.iri.substring(filesystemNode.metadata.iri.lastIndexOf("/") + 1);
      exportFullName = pathToExportDirectory + (filesystemNode.type === "directory" ? "" : iri);
    }
    else {
      exportFullName = pathToExportDirectory + (filesystemNode.type === "directory" ? "" : filesystemNode.metadata.projectIri);
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
          // TODO RadStr PR: Not sure ... but it is annoying when using with git commit - each meta has it changed for every commit it even when not changed
          delete data["_exportedAt"];
        }
        this.setExportVersionInternal(data);
      }
      else {
        data = await this.importFilesystem.getDatastoreContent(filesystemNode.irisTreePath, datastore.type, true);
        if (this.iriMapping !== null) {
          // Note that if therr are some missing iris it is ok, those iris exist because there are some new resources.
          const { datastoreWithReplacedIris } = createDatastoreWithReplacedIris(data, this.iriMapping, this.shouldRunTestVariantForIriReplacement);
          data = datastoreWithReplacedIris;
        }
      }

      await this.exportActions.exportDatastoreAction(exportFullName, datastore, data, this.exportFormat);
    }
  }
}


