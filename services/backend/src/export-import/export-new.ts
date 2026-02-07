import { PackageExporterBase } from "./export-base.ts";
import { DirectoryNode, FilesystemNode, isDatastoreForMetadata } from "@dataspecer/git";


export class PackageExporterNew extends PackageExporterBase {
  getExportVersion(): number {
    return 1;
  }

  protected async exportDirectory(directory: DirectoryNode, pathToDirectory: string, pathToExportDirectory: string) {
    await this.exportDatastores(directory, pathToDirectory, pathToExportDirectory);
    for (const [name, filesystemNode] of Object.entries(directory.content)) {
      if (filesystemNode.type === "directory") {
        const fullPath = `${pathToDirectory}${name}/`;
        const exportFullPath = `${pathToExportDirectory}${name}/`;
        await this.exportDirectory(filesystemNode, fullPath, exportFullPath)
      }
      else {
        await this.exportDatastores(filesystemNode, pathToDirectory, pathToExportDirectory);
      }
    }
  }

  private async exportDatastores(filesystemNode: FilesystemNode, pathToDirectory: string, pathToExportDirectory: string) {
    const fullname: string = pathToDirectory + filesystemNode.name;
    const exportFullName: string = pathToExportDirectory + (filesystemNode.type === "directory" ? "" : filesystemNode.name);
    for(const datastore of filesystemNode.datastores) {
      let data;
      if (isDatastoreForMetadata(datastore.type)) {
        data = filesystemNode.metadata;
        this.setExportVersionInternal(data);
      }
      else {
        data = await this.importFilesystem.getDatastoreContent(filesystemNode.irisTreePath, datastore.type, true);
      }

      await this.exportActions.exportDatastoreAction(exportFullName, datastore, data, this.exportFormat);
    }
  }
}


