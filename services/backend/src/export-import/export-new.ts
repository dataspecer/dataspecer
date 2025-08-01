import { DirectoryNode, FileNode, FilesystemMappingType, FilesystemNode, MetadataCacheType, DatastoreInfo, FilesystemNodeLocation } from "./export-import-data-api.ts";
import { AvailableFilesystems, createEmptyFilesystemMapping, createFilesystemMappingRoot, createMetaPrefixName, FilesystemAbstraction, FilesystemFactory, getMetaPrefixType } from "./filesystem-abstractions/filesystem-abstraction.ts";

import path from "path";
import { dsPathJoin } from "../utils/git-utils.ts";
import { AllowedExportResults, AvailableExports, ExportActions } from "./export-actions.ts";
import { PackageExporterByResourceType } from "./export-by-resource-type.ts";
import { GitHubProvider } from "../git-providers/git-provider-instances/github.ts";


// TODO RadStr: Put this method into some separate file
export function isDatastoreForMetadata(datastoreType: string): boolean {
  return datastoreType === getMetaPrefixType();
}


// TODO RadStr: Trying new API for exporters and importers - so this should in future substitute the PackageExporter and PackageImporter (in the import case)
export class PackageExporterNew {
  exportActions!: ExportActions<AllowedExportResults>;      // TODO RadStr: !
  importFilesystem!: FilesystemAbstraction;                 // TODO RadStr: !

  // TODO RadStr: Copy-pasted from the PackageExporterByResourceType ... so maybe we could somehow share the doExportFromIRI and doExportFromRootDirectory through inheritance or composition
  async doExportFromIRI(
    iri: string,
    directory: string,
    pathToExportStartDirectory: string,
    importFilesystem: AvailableFilesystems,
    exportType: AvailableExports
  ): Promise<AllowedExportResults> {
    const filesystemLocationToIri: FilesystemNodeLocation = {
      iri,
      fullPath: directory,
      fullTreePath: ""
    };
    // TODO RadStr: the createFileSystem just needs methods for ignore directory/file, nothing else ... so remove the hardcoded GitHubProvier
    const filesystem = await FilesystemFactory.createFileSystem([filesystemLocationToIri], importFilesystem, new GitHubProvider());
    const fakeRoot = filesystem.getRoot();

    const root = Object.values(fakeRoot.content)[0] as DirectoryNode;
    const rootDirectoryName = root.name;
    const rootDirectory = root;

    this.importFilesystem = filesystem;
    this.exportActions = PackageExporterByResourceType.createExportActionsForFilesystem(exportType);


    // const mapping = await this.createFilesystemMapping(iri, true);


    // // TODO RadStr: Same as handle-webhook
    // const filesystemNodeEntries = Object.entries(mapping);
    // if (!(filesystemNodeEntries.length === 1 && filesystemNodeEntries[0][1].type === "directory")) {
    //   console.error("The mapping does not have root directory or the root is not a directory");
    //   throw new Error("Could not perform export, since the mapping does not have root directory or the root is not a directory.");
    // }
    // const [rootDirectoryName2, rootDirectory2] = filesystemNodeEntries[0];

    pathToExportStartDirectory = pathToExportStartDirectory.length === 0 ? rootDirectoryName : `${pathToExportStartDirectory}/${rootDirectoryName}`
    await this.doExportFromRootDirectory(rootDirectoryName, rootDirectory, pathToExportStartDirectory);
    return await this.exportActions.finishExport();      // TODO RadStr: I already do this inside the doExportFromRootDirectory
  }

  async doExportFromRootDirectory(
      rootDirectoryName: string,
      rootDirectory: DirectoryNode,
      pathToExportStartDirectory: string,
    ): Promise<AllowedExportResults> {
      await this.exportDirectory(rootDirectory, rootDirectoryName + "/", pathToExportStartDirectory + "/");
      return await this.exportActions.finishExport();
    }

  private async exportDirectory(directory: DirectoryNode, pathToDirectory: string, pathToExportDirectory: string) {
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

      await this.exportActions.exportDatastoreAction(exportFullName, datastore, data);
    }
  }
}
