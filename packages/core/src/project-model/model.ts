import type { LanguageString } from "../core/core-resource.ts";
import type { Entity } from "../entity-model/entity.ts";
import type { ModelIdentifier } from "../model/model.ts";

export const PROJECT_MODEL_MODEL_ENTITY = "project-model-entity";

export const PACKAGE_MODEL = "http://dataspecer.com/resources/local/package";

export const PROJECT_MODEL_ID = "_project_model" as const satisfies ModelIdentifier;

/**
 * Package, Model or Project.
 */
export interface ProjectModelEntity extends Entity {
  type: [typeof PROJECT_MODEL_MODEL_ENTITY];

  label: LanguageString;
  description: LanguageString;

  modelType: string;

  /**
   * Identifier of the project (the root package) this model belongs to.
   *
   * A project model may describe models of several projects at once, as a
   * project can reuse other projects. Models of one project therefore share
   * the same value, which tells the projects apart.
   *
   * @see PackageEntity.reusedProjects
   */
  projectId: ModelIdentifier;
}

export function isProjectModelEntity(entity: Entity): entity is ProjectModelEntity {
  return entity.type.includes(PROJECT_MODEL_MODEL_ENTITY);
}

/**
 * Additional metadata about a {@link ProjectModelEntity}. Every property is
 * optional since not all sources that produce project model entities are able
 * to provide it.
 *
 * Intended to be used as extension of {@link ProjectModelEntity} via
 * intersection type.
 */
export interface ProjectModelEntityMeta {
  /**
   * Whether the entity has pending evolution updates recorded on an
   * evolution branch, awaiting review and merge.
   *
   * If undefined, the information is not available.
   */
  hasPendingEvolution?: boolean;
}

export interface PackageEntity extends ProjectModelEntity {
  /**
   * IDs of {@link ProjectModelEntity}s contained in this package in no particular order.
   */
  subModels: string[];

  modelType: typeof PACKAGE_MODEL;

  /**
   * IDs of projects this package reuses, as a subset of {@link subModels}: a
   * reused project is listed as an ordinary sub-package as well, so that
   * clients unaware of reuse treat it as any other sub-package, while clients
   * that do care can tell the two apart.
   */
  reusedProjects: ModelIdentifier[];
}

export function isPackageEntity(entity: Entity): entity is PackageEntity {
  return isProjectModelEntity(entity) && entity.modelType === PACKAGE_MODEL;
}

/**
 * Represents the root package in the project model.
 */
export interface ProjectModel extends PackageEntity {}
