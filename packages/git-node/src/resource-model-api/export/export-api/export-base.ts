import { DirectoryNode, FilesystemAbstraction, AvailableFilesystems } from "@dataspecer/git";
import { AllowedExportResults, AvailableExports, ExportActionForFilesystem, ExportActionForZip, ExportActions } from "./export-actions.ts";
import { ZipStreamDictionary } from "../../utils/zip-stream-dictionary.ts";
import { FilesystemFactoryMethodParams, FilesystemFactory } from "../../../filesystem-abstractions/backend-filesystem-abstraction-factory.ts";
import { PackageExporterInterface } from "./package-export.ts";


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
    filesystemFactoryParams: FilesystemFactoryMethodParams,
    pathToExportStartDirectory: string,
    importFilesystem: AvailableFilesystems,
    exportType: AvailableExports,
    exportFormat: string,
  ): Promise<AllowedExportResults> {
    const filesystem = await FilesystemFactory.createFileSystem(importFilesystem, filesystemFactoryParams);
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
