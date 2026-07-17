import { LOCAL_PACKAGE, QUERYABLE_MODEL, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { getModelMetadata, resolveAsyncQueryableModelEntities } from "@dataspecer/model-store/implementation";
import { PROJECT_MODEL_MODEL_ENTITY, type PackageEntity, type ProjectModelEntity } from "@dataspecer/project-model";
import { type ModelRepositoryType } from "../models/model-repository.ts";
import { PROJECT_MODEL_ID } from "../models/model-id.ts";
import type { BaseResource, Package } from "../models/resource-model.ts";

function createRegularResourceEntity(resource: BaseResource): ProjectModelEntity {
  return {
    // Resources may carry arbitrary extra metadata fields (e.g. documentBaseUrl,
    // importedFromUrl) beyond label/description, which callers rely on.
    ...((resource.userMetadata as object) ?? {}),
    id: resource.iri,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: resource.userMetadata?.label ?? {},
    description: resource.userMetadata?.description ?? {},
    modelType: resource.types[0] ?? "",
  };
}

function createProjectPackageEntity(resource: Package): PackageEntity {
  return {
    ...((resource.userMetadata as object) ?? {}),
    id: resource.iri,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: resource.userMetadata?.label ?? {},
    description: resource.userMetadata?.description ?? {},
    modelType: LOCAL_PACKAGE,
    subModels: resource.subResources?.map((subResource) => subResource.iri) ?? [],
  };
}

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
