/**
 * This file partially matches implementation in packages/project-model/src/implementation.ts.
 */

import { LOCAL_PACKAGE, QUERYABLE_MODEL, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import type { ModelIdentifier } from "@dataspecer/core/model";
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

  async function loadPackageRecursively(id: string): Promise<void> {
    if (visitedPackages.has(id)) {
      return;
    }
    visitedPackages.add(id);

    const pkg = await modelRepository.getPackage(id);
    if (!pkg) {
      return;
    }

    models[pkg.iri] = (await modelRepository.getModelEntities(pkg.iri))!;

    // The package's own model entity may reference other, unrelated packages
    // via `dataStructuresImportPackages` (used for data structure reuse across
    // specifications). These are not part of the sub-resource hierarchy, so
    // they must be loaded explicitly as well.
    const rawPackageData = models[pkg.iri]?.[pkg.iri] as { dataStructuresImportPackages?: string[] } | undefined;
    for (const importedPackageId of rawPackageData?.dataStructuresImportPackages ?? []) {
      await loadPackageRecursively(importedPackageId);
    }

    for (const subResource of pkg.subResources ?? []) {
      const subModelType = subResource.types[0] ?? "";

      if (subModelType === LOCAL_PACKAGE) {
        await loadPackageRecursively(subResource.iri);
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
        const projectEntity = createRegularResourceEntity(subResource);

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

    const packageEntity = createProjectPackageEntity(pkg);
    projectModelEntities[packageEntity.id] = packageEntity;
  }

  await loadPackageRecursively(packageId);
  models[PROJECT_MODEL_ID] = projectModelEntities;

  return models;
}
