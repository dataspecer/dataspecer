import { LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { semanticModelEntitiesToSerialization, serializationToSemanticModelEntities } from "@dataspecer/core-v2/semantic-model";
import { serializationToPimModelEntities } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import type { CoreResourceAndEntity } from "@dataspecer/core/core/core-resource";
import { serializationToStructureModelEntities, structureModelEntitiesToSerialization } from "@dataspecer/core/data-psm";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { serializationToBlobModelEntities } from "@dataspecer/core/entity-model/utils";
import type { Operation } from "@dataspecer/core/operation";
import { asyncQueryableModelEntitiesToSerialization, pimModelEntitiesToSerialization, serializationToAsyncQueryableModelEntities } from "@dataspecer/model-store/implementation";
import { serializationToVisualModelEntities, visualModelEntitiesToSerialization } from "@dataspecer/visual-model";

/**
 * Converts a set of entities of a model of the given type back to its JSON
 * serialization. Inverse of {@link deserializeModelEntities}.
 *
 * @param previousSerialization The serialization the entities were loaded
 * from, if any. It is used to carry over parts of the serialization that are
 * not represented as entities (currently the legacy embedded operation log of
 * the structure model).
 */
export function serializeModelEntities(modelId: string, modelType: string, entities: EntityRecord, previousSerialization?: unknown): unknown {
  if (modelType === LOCAL_SEMANTIC_MODEL) {
    return semanticModelEntitiesToSerialization(entities);
  }

  if (modelType === VISUAL_MODEL) {
    return visualModelEntitiesToSerialization(entities);
  }

  if (modelType === V1.PSM) {
    return structureModelEntitiesToSerialization({
      operations: (previousSerialization as { operations?: Operation[] })?.operations ?? [],
      entities: entities as EntityRecord<CoreResourceAndEntity>,
    });
  }

  if (modelType === QUERYABLE_MODEL) {
    return asyncQueryableModelEntitiesToSerialization(modelId, entities);
  }

  if (modelType === RDFS_MODEL) {
    return pimModelEntitiesToSerialization(modelId, entities);
  }

  // Blob model is a single entity with the whole blob as its data.
  return entities[modelId] ?? {};
}

/**
 * Converts the JSON serialization of a model of the given type to a set of
 * entities. If the serialization is missing (null or undefined), the initial
 * state of a freshly created model of that type is returned instead,
 * mirroring how models are initialized on the frontend.
 */
export function deserializeModelEntities(modelId: string, modelType: string, data: unknown): EntityRecord {
  if (modelType === LOCAL_SEMANTIC_MODEL) {
    // A semantic model must always contain an entity representing the model itself.
    return serializationToSemanticModelEntities(data ?? { modelId });
  }

  if (modelType === VISUAL_MODEL) {
    return data ? serializationToVisualModelEntities(data) : {};
  }

  if (modelType === V1.PSM) {
    // A model with no data yet starts empty, mirroring the frontend: the main
    // schema entity is created by a create-schema operation that is recorded
    // when the model is created, so replaying the operations produces it.
    return data ? serializationToStructureModelEntities(data).entities : {};
  }

  if (modelType === QUERYABLE_MODEL) {
    return data ? serializationToAsyncQueryableModelEntities(data) : {};
  }

  if (modelType === RDFS_MODEL) {
    return serializationToPimModelEntities((data as object) ?? { id: modelId, pimStore: { resources: {} } }).entities;
  }

  // LOCAL_PACKAGE, V1.GENERATOR_CONFIGURATION and everything else is treated as a blob model.
  return serializationToBlobModelEntities(modelId, (data as object) ?? {});
}

export function composeModelId(iri: string, storeName: string): string {
  return storeName === "model" ? iri : `${iri}#${storeName}`;
}

export function splitModelId(modelId: string): { iri: string; storeName: string } {
  const hashIndex = modelId.indexOf("#");
  if (hashIndex === -1) {
    return { iri: modelId, storeName: "model" };
  }
  return { iri: modelId.slice(0, hashIndex), storeName: modelId.slice(hashIndex + 1) };
}

/**
 * Model type that is not used anywhere and thus fallbacks to the blob type.
 */
export const NAMED_BLOB_STORE_TYPE = "#blob";

export const PROJECT_MODEL_ID = "_project_model";
