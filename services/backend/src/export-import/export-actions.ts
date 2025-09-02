
import { DatastoreInfo } from "@dataspecer/git";
import { stringifyDatastoreBasedOnFormat } from "../utils/git-utils.ts";
import { ZipStreamDictionary } from "../utils/zip-stream-dictionary.ts";
import fs from "fs";
import path from "path";



export type AllowedExportResults = void | Buffer<ArrayBufferLike>;

export interface ExportActions<T extends AllowedExportResults> {
  // TODO RadStr: the/path/to/resource/with/nameWithoutSuffix ... put into documentation
  exportDatastoreAction: (exportPath: string, datastoreInfo: DatastoreInfo, data: any) => Promise<void>;

  /**
   * Finishes the export and returns the result
   */
  finishExport(): Promise<T>;
}

export class ExportActionForFilesystem implements ExportActions<void> {
  async exportDatastoreAction(exportPath: string, datastoreInfo: DatastoreInfo, data: any): Promise<void> {
    const fullPath = exportPath + datastoreInfo.afterPrefix;
    const directory = path.dirname(fullPath);
    fs.mkdirSync(directory, { recursive: true });
    const dataAsString = stringifyDatastoreBasedOnFormat(data, datastoreInfo.format, true);
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

  async exportDatastoreAction(exportPath: string, datastoreInfo: DatastoreInfo, data: any): Promise<void> {
    const fullPath = exportPath + datastoreInfo.afterPrefix;
    const stream = this.zipStreamDictionary.writePath(fullPath);
    const dataAsString = stringifyDatastoreBasedOnFormat(data, datastoreInfo.format, true);
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
