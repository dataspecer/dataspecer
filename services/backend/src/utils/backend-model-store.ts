import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, VISUAL_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { serializationToSemanticModelEntities } from "@dataspecer/core-v2/semantic-model";
import { serializationToPimModelEntities } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import { serializationToStructureModelEntities } from "@dataspecer/core/data-psm";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { serializationToBlobModelEntities } from "@dataspecer/core/entity-model/utils";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { resolveAsyncQueryableModelEntities } from "@dataspecer/model-store/implementation";
import type { ModelEntity, PackageEntity } from "@dataspecer/project-model";
import { serializationToVisualModelEntities } from "@dataspecer/visual-model";
import type { BaseResource, Package, ResourceModel } from "../models/resource-model.ts";
import type { ModelIdentifier } from "@dataspecer/core/model";

const PROJECT_MODEL_ID = "_project_model";

function createRegularResourceEntity(resource: BaseResource): ModelEntity {
  return {
    // Resources may carry arbitrary extra metadata fields (e.g. documentBaseUrl,
    // importedFromUrl) beyond label/description, which callers rely on.
    ...(resource.userMetadata as object ?? {}),
    id: resource.iri,
    type: [],
    label: resource.userMetadata?.label ?? {},
    description: resource.userMetadata?.description ?? {},
    modelType: resource.types[0] ?? "",
  };
}

function createProjectPackageEntity(resource: Package): PackageEntity {
  return {
    ...(resource.userMetadata as object ?? {}),
    id: resource.iri,
    type: [],
    label: resource.userMetadata?.label ?? {},
    description: resource.userMetadata?.description ?? {},
    modelType: LOCAL_PACKAGE,
    subModels: resource.subResources?.map((subResource) => subResource.iri) ?? [],
  };
}

/**
 * Loads a named, non-default storage blob of a model (e.g. the "svg" blob of
 * a visual model) and returns it as its own top-level blob model entry, keyed
 * by `${modelId}#${blobName}`. Returns null if the blob does not exist.
 */
async function loadNamedBlobEntities(modelId: string, blobName: string, resourceModel: ResourceModel): Promise<EntityRecord | null> {
  const store = await resourceModel.getResourceModelStore(modelId, blobName);
  const blobData = store ? await store.getJson() : null;
  if (!blobData) {
    return null;
  }
  return serializationToBlobModelEntities(`${modelId}#${blobName}`, blobData);
}

export async function loadModelEntities(modelId: string, modelType: string, resourceModel: ResourceModel): Promise<EntityRecord> {
  const store = await resourceModel.getResourceModelStore(modelId);
  const modelData = store ? await store.getJson() : null;

  if (modelType === LOCAL_PACKAGE) {
    return serializationToBlobModelEntities(modelId, modelData);
  }

  if (modelType === LOCAL_SEMANTIC_MODEL) {
    return serializationToSemanticModelEntities(modelData);
  }

  if (modelType === VISUAL_MODEL) {
    return serializationToVisualModelEntities(modelData);
  }

  if (modelType === V1.PSM) {
    return serializationToStructureModelEntities(modelData).entities;
  }

  if (modelType === QUERYABLE_MODEL) {
    return await resolveAsyncQueryableModelEntities(modelData, httpFetch);
  }

  if (modelType === RDFS_MODEL) {
    return serializationToPimModelEntities(modelData as object).entities;
  }

  if (modelType === V1.GENERATOR_CONFIGURATION) {
    return serializationToBlobModelEntities(modelId, modelData);
  }

  // Fallback to blob model
  return serializationToBlobModelEntities(modelId, modelData);
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
export async function getModelsForPackage(packageId: ModelIdentifier, resourceModel: ResourceModel): Promise<Record<ModelIdentifier, EntityRecord>> {
  const models: Record<string, EntityRecord> = {};
  const projectModelEntities: EntityRecord = {};
  const visitedPackages = new Set<string>();

  async function loadPackageRecursively(id: string): Promise<void> {
    if (visitedPackages.has(id)) {
      return;
    }
    visitedPackages.add(id);

    const pkg = await resourceModel.getPackage(id);
    if (!pkg) {
      return;
    }

    models[pkg.iri] = await loadModelEntities(pkg.iri, LOCAL_PACKAGE, resourceModel);

    for (const subResource of pkg.subResources ?? []) {
      const subModelType = subResource.types[0] ?? "";

      if (subModelType === LOCAL_PACKAGE) {
        await loadPackageRecursively(subResource.iri);
      } else {
        models[subResource.iri] = await loadModelEntities(subResource.iri, subModelType, resourceModel);

        if (subModelType === VISUAL_MODEL) {
          const svgEntities = await loadNamedBlobEntities(subResource.iri, "svg", resourceModel);
          if (svgEntities) {
            models[`${subResource.iri}#svg`] = svgEntities;
          }
        }
      }

      if (subModelType !== LOCAL_PACKAGE) {
        const projectEntity = createRegularResourceEntity(subResource);
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
