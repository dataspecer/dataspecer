import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { createVisualModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { PimStoreWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import type { ResourceModel } from "../models/resource-model.ts";
import type { CoreResource } from "@dataspecer/core/core/core-resource";

const PROJECT_MODEL_ID = "_project_model";

/**
 * Todo this function will be part of the new adapter on backend.
 */
function coreResourceToEntity(resource: CoreResource): Entity {
  return {
    ...resource,
    id: resource.iri!,
    type: resource.types!,
  };
}

interface ResourceLike {
  iri: string;
  types: string[];
  userMetadata?: {
    label?: Record<string, string>;
    description?: Record<string, string>;
  };
}

interface PackageLike extends ResourceLike {
  subResources?: ResourceLike[];
}

interface ProjectModelEntity extends Entity {
  label: Record<string, string>;
  description: Record<string, string>;
  modelType: string;
}

interface ProjectPackageEntity extends ProjectModelEntity {
  subModels: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asEntityRecord(value: unknown): EntityRecord {
  if (!isRecord(value)) {
    return {};
  }

  return value as EntityRecord;
}

function createProjectEntity(resource: ResourceLike): ProjectModelEntity {
  return {
    id: resource.iri,
    type: [],
    label: resource.userMetadata?.label ?? {},
    description: resource.userMetadata?.description ?? {},
    modelType: resource.types[0] ?? "",
  };
}

function createProjectPackageEntity(resource: PackageLike): ProjectPackageEntity {
  return {
    id: resource.iri,
    type: [],
    label: resource.userMetadata?.label ?? {},
    description: resource.userMetadata?.description ?? {},
    modelType: LOCAL_PACKAGE,
    subModels: resource.subResources?.map((subResource) => subResource.iri) ?? [],
  };
}

function addMainEntity(entities: EntityRecord, modelId: string): EntityRecord {
  return {
    [modelId]: {
      id: modelId,
      type: ["main-entity"],
    },
    ...entities,
  };
}

function loadBlobModelEntities(modelId: string, modelData: unknown): EntityRecord {
  const data = isRecord(modelData) ? { ...modelData } : {};
  const type = Array.isArray(data.type) ? data.type.filter((item): item is string => typeof item === "string") : [];

  return {
    [modelId]: {
      ...data,
      id: modelId,
      type,
    },
  };
}

function loadSemanticModelEntities(modelId: string, modelData: unknown): EntityRecord {
  const model = new InMemorySemanticModel();
  if (isRecord(modelData)) {
    model.deserializeModel(modelData);
  }
  return addMainEntity(model.getEntities(), modelId);
}

function toVisualEntity(entity: unknown): Entity | null {
  if (!isRecord(entity)) {
    return null;
  }

  const id = typeof entity.id === "string" ? entity.id : typeof entity.identifier === "string" ? entity.identifier : null;

  if (id === null) {
    return null;
  }

  const type = Array.isArray(entity.type) ? entity.type.filter((item): item is string => typeof item === "string") : [];

  return {
    ...entity,
    id,
    type,
  } as Entity;
}

function loadVisualModelEntities(modelId: string, modelData: unknown): EntityRecord {
  const model = createVisualModel(modelId);

  if (isRecord(modelData)) {
    model.deserializeModel(modelData);
  }

  const entities: EntityRecord = {};
  for (const visualEntity of model.getVisualEntities().values()) {
    const entity = toVisualEntity(visualEntity);
    if (entity !== null) {
      entities[entity.id] = entity;
    }
  }

  return addMainEntity(entities, modelId);
}

function loadStructureModelEntities(modelData: unknown): EntityRecord {
  if (!isRecord(modelData)) {
    return {};
  }

  const record = asEntityRecord(modelData.resources);
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, coreResourceToEntity(value as unknown as CoreResource)]));
}

function loadPimModelEntities(modelId: string, modelData: unknown): EntityRecord {
  if (!isRecord(modelData) || !isRecord(modelData.pimStore)) {
    return {};
  }

  const urls = Array.isArray(modelData.urls) ? modelData.urls.filter((url): url is string => typeof url === "string") : undefined;

  const model = new PimStoreWrapper(modelData.pimStore as unknown as ConstructorParameters<typeof PimStoreWrapper>[0], modelId, "model", urls);
  model.fetchFromPimStore();
  return model.getEntities();
}

function loadFallbackEntities(modelId: string, modelData: unknown): EntityRecord {
  if (isRecord(modelData) && isRecord(modelData.resources)) {
    return asEntityRecord(modelData.resources);
  }

  if (isRecord(modelData) && isRecord(modelData.entities)) {
    return asEntityRecord(modelData.entities);
  }

  return loadBlobModelEntities(modelId, modelData);
}

async function loadModelEntities(modelId: string, modelType: string, resourceModel: ResourceModel): Promise<EntityRecord> {
  const store = await resourceModel.getResourceModelStore(modelId);
  const modelData = store ? await store.getJson() : null;

  if (modelType === LOCAL_PACKAGE) {
    return loadBlobModelEntities(modelId, modelData);
  }

  if (modelType === LOCAL_SEMANTIC_MODEL) {
    return loadSemanticModelEntities(modelId, modelData);
  }

  if (modelType === LOCAL_VISUAL_MODEL) {
    return loadVisualModelEntities(modelId, modelData);
  }

  if (modelType === V1.PSM) {
    return loadStructureModelEntities(modelData);
  }

  if (modelType === V1.PIM) {
    return loadPimModelEntities(modelId, modelData);
  }

  return loadFallbackEntities(modelId, modelData);
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
export async function getModelsForPackage(packageId: string, resourceModel: ResourceModel): Promise<Record<string, EntityRecord>> {
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
      }

      if (subModelType !== LOCAL_PACKAGE) {
        const projectEntity = createProjectEntity(subResource);
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
