import { createDatastoreWithReplacedIris, DirectoryNode, FilesystemNode, isDatastoreForMetadata } from "@dataspecer/git";
import { PackageExporterBase } from "../export-api/export-base.ts";


/**
 * Reimplementation of the old export using new API. It simply puts the content of package in the directory and packages, while subpackages are new directories (recursively).
 */
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
        if (this.shouldRemoveTimeMetadata) {
          // TODO RadStr PR: Maybe there is more stuff to remove, what about the exportedBy or createdAt????
          //                   Note that you also have to change the other exporter if you introduce it here.
          //                    .... Now that I say it, it can be refactored as a method in the base class, that is this if will be the code of that method.
          delete data["_exportedAt"];
          // Remove modificationDate based on Stepan's feedback.
          delete data["metadata"]["modificationDate"];
          delete data["metadata"]["creationDate"];
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


