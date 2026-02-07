
import { DatastoreInfo, stringifyDatastoreContentBasedOnFormat } from "@dataspecer/git";
import { ZipStreamDictionary } from "../utils/zip-stream-dictionary.ts";
import fs from "fs";
import path from "path";



export type AllowedExportResults = void | Buffer<ArrayBufferLike>;

export interface ExportActions<T extends AllowedExportResults> {
  /**
   * @param exportPath The path is in format the/path/to/resource/with/nameWithoutSuffix
   *  ... where the suffix is the .meta.json for example - that is type and format of datastore
   *  In case of directories, they should end with /
   */
  exportDatastoreAction: (exportPath: string, datastoreInfo: DatastoreInfo, data: any, exportFormat: string) => Promise<void>;

  /**
   * Finishes the export and returns the result
   */
  finishExport(): Promise<T>;
}

export class ExportActionForFilesystem implements ExportActions<void> {
  async exportDatastoreAction(
    exportPath: string,
    datastoreInfo: DatastoreInfo,
    data: any,
    exportFormat: string,
  ): Promise<void> {
    const afterPrefixForExport = datastoreInfo.format === null ?
      datastoreInfo.format :
      datastoreInfo.afterPrefix.replace(datastoreInfo.format, exportFormat);
    const fullPath = exportPath + afterPrefixForExport;
    const directory = path.dirname(fullPath);
    fs.mkdirSync(directory, { recursive: true });
    const dataAsString = stringifyDatastoreContentBasedOnFormat(data, exportFormat, true);
    fs.writeFileSync(fullPath, dataAsString);
  }

  async finishExport(): Promise<void> {
    // Do nothing
  }
}

export class ExportActionForZip implements ExportActions<Buffer<ArrayBufferLike>> {
  zipStreamDictionary!: ZipStreamDictionary;

  constructor(zipStreamDictionary: ZipStreamDictionary) {
    this.zipStreamDictionary = zipStreamDictionary;
  }

  async exportDatastoreAction(
    exportPath: string,
    datastoreInfo: DatastoreInfo,
    data: any,
    exportFormat: string,
  ): Promise<void> {
    const afterPrefixForExport = datastoreInfo.format === null ?
      datastoreInfo.format :
      datastoreInfo.afterPrefix.replace(datastoreInfo.format, exportFormat);
    const fullPath = exportPath + afterPrefixForExport;
    const stream = this.zipStreamDictionary.writePath(fullPath);
    const dataAsString = stringifyDatastoreContentBasedOnFormat(data, exportFormat, true);
    await stream.write(dataAsString);
    stream.close();
  }

  async finishExport(): Promise<Buffer<ArrayBufferLike>> {
    return await this.zipStreamDictionary.save();
  }
}

export enum AvailableExports {
  Zip,
  Filesystem,
}
