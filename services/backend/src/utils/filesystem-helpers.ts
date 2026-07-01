import { DsFsConstructorParams, DsFsConstructorParamsWithStrongerResourceModel, ResourceModelForFilesystemRepresentation } from "@dataspecer/git-node";
import { currentVersion } from "../tools/migrations/index.ts";
import { deleteBlob, deleteResource } from "../routes/resource.ts";
import configuration from "../configuration.ts";
import { resourceModel } from "../main.ts";



export function createFilesystemFactoryParams(isDataspecerFilesystem: boolean): DsFsConstructorParamsWithStrongerResourceModel {
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

export function createFilesystemFactoryParamsObject(providedResourceModel: ResourceModelForFilesystemRepresentation): DsFsConstructorParams {
  return {
    resourceModel: providedResourceModel,
    deleteBlob: deleteBlob,
    deleteResource: deleteResource,
    exportedBy: configuration.host ?? null,
    databaseMigrationVersion: currentVersion,
  };
}
