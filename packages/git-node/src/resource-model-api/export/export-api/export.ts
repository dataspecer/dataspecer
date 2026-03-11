import { MergeStateCause, resourceTypeToTypeDirectoryMapping } from "@dataspecer/git";
import { ResourceChangeType } from "../../resource-change-observer.ts";
import { BaseResource, LoadedPackage } from "../../resource-model-api.ts";
import { LocalStoreModelGetter, ModelStore } from "../../model-store-api.ts";


// TODO RadStr PR: This file probably does not use node specifics, it can be in some "non-node" package
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

export interface ResourceModelForImport {
  createPackage(
    parentIri: string | null,
    iri: string,
    userMetadata: {},
    projectIri?: string,
  ): Promise<void>;

  createResource(
    parentIri: string | null,
    iri: string,
    type: string,
    userMetadata: {},
    projectIri?: string,
    mergeStateUUIDsToIgnoreInUpdating?: string[],
  ): Promise<void>;

  getOrCreateResourceModelStore(
    iri: string,
    storeName?: string,
    mergeStateUUIDsToIgnoreInUpdating?: string[]
  ): Promise<ModelStore>;
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
  updateLastCommitHash(iri: string, lastCommitHash: string, updateCause: MergeStateCause): Promise<void>;
  setHasUncommittedChanges(iri: string, hasUncommittedChanges: boolean): Promise<void>;
}
