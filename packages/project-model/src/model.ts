import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { Entity } from "@dataspecer/core/entity-model";

export const PROJECT_MODEL_MODEL_ENTITY = "project-model-entity";

/**
 * Package, Model or Project.
 */
export interface ProjectModelEntity extends Entity {
  type: [typeof PROJECT_MODEL_MODEL_ENTITY];

  label: LanguageString;
  description: LanguageString;

  modelType: string;
}

export function isProjectModelEntity(entity: Entity): entity is ProjectModelEntity {
  return entity.type.includes(PROJECT_MODEL_MODEL_ENTITY);
}

export interface PackageEntity extends ProjectModelEntity {
  /**
   * IDs of {@link ProjectModelEntity}s contained in this package in no particular order.
   */
  subModels: string[];

  modelType: typeof LOCAL_PACKAGE;
}

export function isPackageEntity(entity: Entity): entity is PackageEntity {
  return isProjectModelEntity(entity) && entity.modelType === LOCAL_PACKAGE;
}

/**
 * Represents the root package in the project model.
 */
export interface ProjectModel extends PackageEntity {}
