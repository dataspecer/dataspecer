import { PackageExporterBase } from "./export-base.ts";
import { DirectoryNode, FilesystemNode, isDatastoreForMetadata } from "@dataspecer/git";


export class PackageExporterNew extends PackageExporterBase {
  getExportVersion(): number {
    return 1;
  }

  async exportDirectory(directory: DirectoryNode, pathToDirectory: string, pathToExportDirectory: string) {
    await this.exportDatastores(directory, pathToDirectory, pathToExportDirectory);
    for (const [name, filesystemNode] of Object.entries(directory.content)) {
      if (filesystemNode.type === "directory") {
        // TODO RadStr: We can newly use the fullPath from the filesystem node
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
    for(const datastore of filesystemNode.datastores) {
      let fullname: string;
      let exportFullName: string;
      let data;
      fullname = pathToDirectory + filesystemNode.name;
      exportFullName = pathToExportDirectory + filesystemNode.name;
      if (isDatastoreForMetadata(datastore.type)) {
        data = filesystemNode.metadataCache;
        this.setExportVersionInternal(data);
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
        // fullname = path.join(pathToDirectory, datastore.fullName);
        // fullname = pathToDirectory + filesystemNode.name;
      }

      await this.exportActions.exportDatastoreAction(exportFullName, datastore, data, this.exportFormat);
    }
  }
}


