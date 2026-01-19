import { AvailableFilesystems, GitIgnore, MergeStateCause, resourceTypeToTypeDirectoryMapping } from "@dataspecer/git";
import { AvailableExports, AllowedExportResults } from "./export-actions.ts";
import { BaseResource, LoadedPackage } from "../models/resource-model.ts";
import { LocalStoreModelGetter } from "../models/local-store-model.ts";
import { ResourceModelForImport } from "./import.ts";
import { ResourceChangeType } from "../models/resource-change-observer.ts";


/**
 * Use the {@link PackageExporterBase} as base class for implementation of new exporters.
 *  Note that there are some quirks in implementation. The biggest (and maybe only) one being setting "_exportVersion" in the meta of root resource.
 *  For simplicity and consistency we update the value for each exported meta file.
 */
export interface PackageExporterInterface {
  /**
   * @param gitIgnore can be null for DS-filesystem
   */
  doExportFromIRI(
    iri: string,
    directory: string,
    pathToExportStartDirectory: string,
    importFilesystem: AvailableFilesystems,
    exportType: AvailableExports,
    exportFormat: string,
    resourceModel: ResourceModelForImportExport | null,
    gitIgnore: GitIgnore | null,
  ): Promise<AllowedExportResults>;

  getExportVersion(): number;
}

const typeExportArtificialDirectories = Object.values(resourceTypeToTypeDirectoryMapping);

export function isArtificialExportDirectory(directoryName: string): boolean {
  return typeExportArtificialDirectories.includes(directoryName);
}


export interface ResourceModelForExport {
  readonly storeModel: LocalStoreModelGetter;

  getPackage(iri: string, deep?: boolean): Promise<LoadedPackage | null>;
  getResource(iri: string): Promise<BaseResource | null>;

  updateResourceMetadata(iri: string, userMetadata: {}, mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined): Promise<void>;
  updateModificationTime(
    iri: string, updatedModel: string | null, updateReason: ResourceChangeType,
    shouldModifyHasUncommittedChanges: boolean, shouldNotifyListeners: boolean,
    mergeStateUUIDsToIgnoreInUpdating?: string[]
  ): Promise<void>
}

export interface ResourceModelForImportExport extends ResourceModelForImport, ResourceModelForExport {
  // EMPTY
}

export interface ResourceModelForFilesystemRepresentation extends ResourceModelForImportExport {
  deleteModelStore(iri: string, storeName?: string, mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined): Promise<void>;
}

/**
 * @todo Maybe better name
 */
export interface ResourceModelForPull extends ResourceModelForFilesystemRepresentation {
  updateLastCommitHash(iri: string, lastCommitHash: string, updateCause: MergeStateCause): Promise<void>
}