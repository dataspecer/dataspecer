/**
 * This file partially matches implementation in packages/core/src/project-model/implementation.ts.
 */

import { LOCAL_PACKAGE, QUERYABLE_MODEL, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { getReusedProjectIds } from "@dataspecer/core/project-model";
import { getModelMetadata, resolveAsyncQueryableModelEntities } from "@dataspecer/model-store/implementation";
import { type ModelRepositoryType } from "../models/model-repository.ts";
import { PROJECT_MODEL_ID } from "../models/model-id.ts";
import { createProjectPackageEntity, createRegularResourceEntity } from "../models/project-model-entities.ts";

/**
 * Asynchronously resolves entities that are not part of the model's
 * serialization. For the queryable (SGOV) model it fetches the semantic
 * entities the query entities resolve to; other models are returned as-is.
 */
async function resolveModelEntities(modelType: string, entities: EntityRecord): Promise<EntityRecord> {
  if (modelType === QUERYABLE_MODEL) {
    return await resolveAsyncQueryableModelEntities(entities, httpFetch);
  }

  return entities;
}

/**
 * Loads all models and sub-models for a given package and returns them as a map
 * of model id to model record. The goal of this function is to be equivalent to
 * the function on frontend where all models are similarly loaded as a set of
 * entities.
 *
 * @todo Add project revision id (branch or commit) parameter
 * @todo Add model type filter parameter
 */
export async function getModelsForPackage(
  packageId: ModelIdentifier,
  modelRepository: Pick<ModelRepositoryType, "getPackage" | "getModelEntities">,
): Promise<Record<ModelIdentifier, EntityRecord>> {
  const models: Record<string, EntityRecord> = {};
  const projectModelEntities: EntityRecord = {};
  const visitedPackages = new Set<string>();

  /**
   * Returns whether the package became part of the structure, i.e. false when
   * it does not exist or was already collected.
   *
   * @param projectId Project the package belongs to.
   */
  async function loadPackageRecursively(id: string, projectId: string): Promise<boolean> {
    if (visitedPackages.has(id)) {
      return false;
    }
    visitedPackages.add(id);

    const pkg = await modelRepository.getPackage(id);
    if (!pkg) {
      return false;
    }

    models[pkg.iri] = (await modelRepository.getModelEntities(pkg.iri))!;

    // Reused projects are not part of the resource tree, they are referenced by
    // the package's own model. They are listed among the sub-packages so that
    // clients that do not know about reuse treat them as any other sub-package.
    const reusedProjects: string[] = [];
    for (const reusedProjectId of getReusedProjectIds(models[pkg.iri]?.[pkg.iri])) {
      if (await loadPackageRecursively(reusedProjectId, reusedProjectId)) {
        reusedProjects.push(reusedProjectId);
      }
    }

    for (const subResource of pkg.subResources ?? []) {
      const subModelType = subResource.types[0] ?? "";

      if (subModelType === LOCAL_PACKAGE) {
        await loadPackageRecursively(subResource.iri, projectId);
      } else {
        models[subResource.iri] = await resolveModelEntities(subModelType, (await modelRepository.getModelEntities(subResource.iri))!);

        if (subModelType === VISUAL_MODEL) {
          const svgEntities = await modelRepository.getModelEntities(`${subResource.iri}#svg`);
          if (svgEntities) {
            models[`${subResource.iri}#svg`] = svgEntities;
          }
        }
      }

      if (subModelType !== LOCAL_PACKAGE) {
        const projectEntity = createRegularResourceEntity(subResource, projectId);

        // The metadata stored inside the model take precedence over the
        // resource's user metadata.
        const metadata = getModelMetadata(subModelType, models[subResource.iri] ?? {}, subResource.iri);
        if (metadata) {
          projectEntity.label = metadata.label;
          projectEntity.description = metadata.description;
        }

        projectModelEntities[projectEntity.id] = projectEntity;
      }
    }

    const packageEntity = createProjectPackageEntity(pkg, projectId, reusedProjects);
    projectModelEntities[packageEntity.id] = packageEntity;

    return true;
  }

  await loadPackageRecursively(packageId, packageId);
  models[PROJECT_MODEL_ID] = projectModelEntities;

  return models;
}
