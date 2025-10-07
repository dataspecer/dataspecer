import { DirectoryNode, FilesystemNodeLocation, FilesystemAbstraction, AvailableFilesystems } from "@dataspecer/git";
import { GitHubProvider } from "../git-providers/git-provider-instances/github.ts";
import { ZipStreamDictionary } from "../utils/zip-stream-dictionary.ts";
import { AllowedExportResults, AvailableExports, ExportActionForFilesystem, ExportActionForZip, ExportActions } from "./export-actions.ts";
import { FilesystemFactory } from "./filesystem-abstractions/backend-filesystem-abstraction-factory.ts";
import { PackageExporterInterface } from "./export.ts";

export abstract class PackageExporterBase implements PackageExporterInterface {
  protected exportActions!: ExportActions<AllowedExportResults>;
  protected importFilesystem!: FilesystemAbstraction;
  protected exportFormat!: string;

  public static setExportVersion(metaObject: any, exportVersion: number) {
    metaObject._exportVersion = exportVersion;
  }

  protected setExportVersionInternal(metaObject: any) {
    PackageExporterBase.setExportVersion(metaObject, this.getExportVersion());
  }

  public static createExportActionsForFilesystem(exportType: AvailableExports): ExportActions<AllowedExportResults> {
    switch(exportType) {
      case AvailableExports.Zip:
        const zipStreamDictionary = new ZipStreamDictionary();
        return new ExportActionForZip(zipStreamDictionary)
      case AvailableExports.Filesystem:
        return new ExportActionForFilesystem();
      default:
        throw new Error(`Invalid export type ${exportType}, most-likely programmer error. Forgot to extend factory switch`);
    }
  }

  // Note that this is the only public export method
  public async doExportFromIRI(
    iri: string,
    directory: string,
    pathToExportStartDirectory: string,
    importFilesystem: AvailableFilesystems,
    exportType: AvailableExports,
    exportFormat: string,
  ): Promise<AllowedExportResults> {
    const filesystemLocationToIri: FilesystemNodeLocation = {
      iri,
      fullPath: directory,
      irisTreePath: "",
      projectIrisTreePath: "",
    };
    // TODO RadStr: the createFileSystem just needs methods for ignore directory/file, nothing else ... so remove the hardcoded GitHubProvier
    const filesystem = await FilesystemFactory.createFileSystem([filesystemLocationToIri], importFilesystem, new GitHubProvider());
    const fakeRoot = filesystem.getRoot();

    const root = Object.values(fakeRoot.content)[0] as DirectoryNode;
    const rootDirectoryName = root.name;
    const rootDirectory = root;

    this.importFilesystem = filesystem;
    this.exportActions = PackageExporterBase.createExportActionsForFilesystem(exportType);
    this.exportFormat = exportFormat;


    pathToExportStartDirectory = pathToExportStartDirectory.length === 0 ? rootDirectoryName : `${pathToExportStartDirectory}/${rootDirectoryName}`
    return await this.doExportFromRootDirectory(rootDirectoryName, rootDirectory, pathToExportStartDirectory);
  }

  abstract getExportVersion(): number;

  private async doExportFromRootDirectory(
    rootDirectoryName: string,
    rootDirectory: DirectoryNode,
    pathToExportStartDirectory: string,
  ): Promise<AllowedExportResults> {
    await this.exportDirectory(rootDirectory, rootDirectoryName + "/", pathToExportStartDirectory + "/");
    return await this.exportActions.finishExport();
  }

  protected abstract exportDirectory(directory: DirectoryNode, pathToDirectory: string, pathToExportDirectory: string): Promise<void>;
}
