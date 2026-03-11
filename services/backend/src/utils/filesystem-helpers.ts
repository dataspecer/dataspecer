import { DataspecerFilesystemConstructorParams, ResourceModelForFilesystemRepresentation } from "@dataspecer/git-node";
import { currentVersion } from "../tools/migrations/index.ts";
import { deleteBlob, deleteResource } from "../routes/resource.ts";
import configuration from "../configuration.ts";
import { resourceModel } from "../main.ts";

export function createFilesystemFactoryParams(isDataspecerFilesystem: boolean): DataspecerFilesystemConstructorParams {
  if (!isDataspecerFilesystem) {
    return {
      databaseMigrationVersion: null,
      deleteBlob: null,
      deleteResource: null,
      exportedBy: null,
      resourceModel: null,
    };
  }

  return {
    databaseMigrationVersion: currentVersion,
    deleteBlob: deleteBlob,
    deleteResource: deleteResource,
    exportedBy: configuration.host ?? null,
    resourceModel: resourceModel,
  };
}

/**
 * TODO RadStr: Move elsewhere
 */
export function createFilesystemFactoryParamsObject(
  databaseMigrationVersion: number,
  deleteBlob: (iri: string, datastoreType: string) => Promise<void>,
  deleteResource: (iri: string) => Promise<void>,
  exportedBy: string,
  resourceModel: ResourceModelForFilesystemRepresentation,
): DataspecerFilesystemConstructorParams {
  return {
    databaseMigrationVersion,
    deleteBlob,
    deleteResource,
    exportedBy,
    resourceModel,
  };
}

/**
 * TODO RadStr: ... just for now until I move the pull stuff elsewhere
 */
export function createFilesystemFactoryParamsObjectForResourceModel(providedResourceModel: ResourceModelForFilesystemRepresentation): DataspecerFilesystemConstructorParams {
  return {
    resourceModel: providedResourceModel,
    deleteBlob: deleteBlob,
    deleteResource: deleteResource,
    exportedBy: configuration.host ?? null,
    databaseMigrationVersion: currentVersion,
  };
}
