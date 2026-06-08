import type { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { Entity } from "@dataspecer/core/entity-model";

/**
 * Every entity in the project model must implement this interface.
 */
export interface ProjectModelEntity extends Entity {}

/**
 * Package, Model or Project.
 */
export interface ModelEntity extends ProjectModelEntity {
  label: LanguageString;
  description: LanguageString;

  modelType: string;
}

export interface PackageEntity extends ModelEntity {
  /**
   * IDs of {@link ModelEntity}s contained in this package in no particular order.
   */
  subModels: string[];

  modelType: typeof LOCAL_PACKAGE;
}

/**
 * Represents the root package in the project model.
 */
export interface ProjectModel extends PackageEntity {}
