import { LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { applyOperationsToSemanticModel, semanticModelEntitiesToSerialization, serializationToSemanticModelEntities } from "@dataspecer/core-v2/semantic-model";
import { changesToSemanticModelOperations } from "@dataspecer/core-v2/semantic-model/operations";
import { serializationToPimModelEntities } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import type { CoreOperationAndOperation, CoreResourceAndEntity } from "@dataspecer/core/core";
import { applyOperationsToStructureModel, serializationToStructureModelEntities, structureModelEntitiesToSerialization } from "@dataspecer/core/data-psm";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import { serializationToBlobModelEntities } from "@dataspecer/core/entity-model/utils";
import type { Operation } from "@dataspecer/core/operation";
import {
  applyOperationsToAsyncQueryableModel,
  asyncQueryableModelEntitiesToSerialization,
  pimModelEntitiesToSerialization,
  ReloadModelOperationType,
  serializationToAsyncQueryableModelEntities,
  SetModelUrlsOperationType,
  type SetModelUrl,
} from "@dataspecer/model-store/implementation";
import { SemanticProfileModelOperations } from "@dataspecer/profile-model";
import { changesToVisualModelOperations, serializationToVisualModelEntities, visualModelEntitiesToSerialization } from "@dataspecer/visual-model";
import { applyOperationsToVisualModel } from "@dataspecer/visual-model/executor";
import { splitModelId } from "./model-id.ts";

/**
 * Model type assigned to named blob stores (model ids with a "#" suffix). It
 * is not a real resource type, so it always falls back to the blob handling.
 */
export const NAMED_BLOB_STORE_TYPE = "#blob";

/**
 * Everything the backend needs to know about one model type to treat its
 * models as sets of entities: how to convert between the stored JSON
 * serialization and entities, how to execute its model-type-specific
 * operations, and optionally how to express entity diffs as its richer
 * operations.
 *
 * Model types without an entry here (LOCAL_PACKAGE, generator configurations,
 * named blob stores, ...) are blob models: a single entity holding the whole
 * serialization.
 */
interface ModelTypeSupport {
  /**
   * Converts the JSON serialization to entities. Missing data (null or
   * undefined) yields the initial state of a freshly created model of this
   * type, mirroring how models are initialized on the frontend.
   */
  deserialize(modelId: string, data: unknown): EntityRecord;

  /**
   * Converts entities back to the JSON serialization. Inverse of deserialize.
   *
   * @param previousSerialization The serialization the entities were loaded
   * from, if any. It is used to carry over parts of the serialization that
   * are not represented as entities (currently the legacy embedded operation
   * log of the structure model).
   */
  serialize(modelId: string, entities: EntityRecord, previousSerialization?: unknown): unknown;

  /**
   * Applies a single model-type-specific operation to the mutable entity
   * record. Generic entity operations are handled by the caller and never
   * reach this function. Operations that cannot be executed are ignored, as
   * required by the {@link Operation} contract.
   */
  applyOperation(modelId: string, working: EntityRecord, operation: Operation): void;

  /**
   * Converts entity changes to model-type-specific operations where possible
   * and returns the changes it could not convert; those are expressed as
   * generic entity operations by the caller.
   */
  changesToOperations?(changes: EntityChange[]): { operations: Operation[]; remainingChanges: EntityChange[] };
}

/** Semantic and RDFS models share the semantic and profile operations. */
function changesToSemanticAndProfileOperations(changes: EntityChange[]): { operations: Operation[]; remainingChanges: EntityChange[] } {
  const semantic = changesToSemanticModelOperations(changes);
  const profile = SemanticProfileModelOperations.changesToProfileModelOperations(semantic.remainingChanges);
  return { operations: [...semantic.operations, ...profile.operations], remainingChanges: profile.remainingChanges };
}

const MODEL_TYPES: Record<string, ModelTypeSupport> = {
  [LOCAL_SEMANTIC_MODEL]: {
    // A semantic model must always contain an entity representing the model itself.
    deserialize: (modelId, data) => serializationToSemanticModelEntities(data ?? { modelId }),
    serialize: (_modelId, entities) => semanticModelEntitiesToSerialization(entities),
    applyOperation: (_modelId, working, operation) => applyOperationsToSemanticModel(working, [operation]),
    changesToOperations: changesToSemanticAndProfileOperations,
  },
  [VISUAL_MODEL]: {
    deserialize: (_modelId, data) => (data ? serializationToVisualModelEntities(data) : {}),
    serialize: (_modelId, entities) => visualModelEntitiesToSerialization(entities),
    applyOperation: (_modelId, working, operation) => applyOperationsToVisualModel(working, [operation]),
    changesToOperations: changesToVisualModelOperations,
  },
  [V1.PSM]: {
    // A model with no data yet starts empty, mirroring the frontend: the main
    // schema entity is created by a create-schema operation that is recorded
    // when the model is created, so replaying the operations produces it.
    deserialize: (_modelId, data) => (data ? serializationToStructureModelEntities(data).entities : {}),
    serialize: (_modelId, entities, previousSerialization) =>
      structureModelEntitiesToSerialization({
        operations: (previousSerialization as { operations?: Operation[] })?.operations ?? [],
        entities: entities as EntityRecord<CoreResourceAndEntity>,
      }),
    applyOperation: (_modelId, working, operation) => applyOperationsToStructureModel(working as EntityRecord<CoreResourceAndEntity>, [operation as CoreOperationAndOperation]),
  },
  [QUERYABLE_MODEL]: {
    deserialize: (_modelId, data) => (data ? serializationToAsyncQueryableModelEntities(data) : {}),
    serialize: (modelId, entities) => asyncQueryableModelEntitiesToSerialization(modelId, entities),
    applyOperation: (_modelId, working, operation) => applyOperationsToAsyncQueryableModel(working, [operation]),
  },
  [RDFS_MODEL]: {
    deserialize: (modelId, data) => serializationToPimModelEntities((data as object) ?? { id: modelId, pimStore: { resources: {} } }).entities,
    serialize: (modelId, entities) => pimModelEntitiesToSerialization(modelId, entities),
    applyOperation: (modelId, working, operation) => {
      if (operation.type === SetModelUrlsOperationType) {
        // Only the urls are updated; the cached vocabulary entities are
        // refetched by the reload endpoint, not by applying operations.
        working[modelId] = { ...working[modelId], urls: (operation as SetModelUrl).urls } as EntityRecord[string];
        return;
      }
      if (operation.type === ReloadModelOperationType) {
        return;
      }
      applyOperationsToSemanticModel(working, [operation]);
    },
    changesToOperations: changesToSemanticAndProfileOperations,
  },
};

/**
 * Model types whose model is stored as one blob entity rather than a set of
 * individually addressed entities. For blob models only the down events of a
 * transaction are recorded - the up state is available as the next
 * transaction's down event, or as the current snapshot.
 */
export function isBlobModelType(modelType: string): boolean {
  return MODEL_TYPES[modelType] === undefined;
}

/**
 * The model type a store of a resource is interpreted with: the resource's
 * own type for the default "model" store, blob for any named store.
 */
export function resolveStoreModelType(resourceType: string, storeName: string): string {
  return storeName === "model" ? resourceType : NAMED_BLOB_STORE_TYPE;
}

/**
 * Converts the JSON serialization of a model of the given type to a set of
 * entities. If the serialization is missing (null or undefined), the initial
 * state of a freshly created model of that type is returned instead.
 */
export function deserializeModelEntities(modelId: string, modelType: string, data: unknown): EntityRecord {
  const support = MODEL_TYPES[modelType];
  if (support !== undefined) {
    return support.deserialize(modelId, data);
  }
  return serializationToBlobModelEntities(modelId, (data as object) ?? {});
}

/**
 * Converts a set of entities of a model of the given type back to its JSON
 * serialization. Inverse of {@link deserializeModelEntities}.
 */
export function serializeModelEntities(modelId: string, modelType: string, entities: EntityRecord, previousSerialization?: unknown): unknown {
  const support = MODEL_TYPES[modelType];
  if (support !== undefined) {
    return support.serialize(modelId, entities, previousSerialization);
  }
  // Blob model is a single entity with the whole blob as its data.
  return entities[modelId] ?? {};
}

/**
 * Deserializes the stored content of the model addressed by the model id,
 * given the type of its resource. For the default "model" store, missing data
 * yields the initial state of a fresh model of the resource's type; for named
 * blob stores, missing data yields null.
 */
export function deserializeStoredModel(modelId: string, resourceType: string, data: unknown): EntityRecord | null {
  const { iri, storeName } = splitModelId(modelId);
  if (storeName === "model") {
    return deserializeModelEntities(iri, resourceType, data);
  }
  if (data === null || data === undefined) {
    return null;
  }
  return deserializeModelEntities(modelId, NAMED_BLOB_STORE_TYPE, data);
}

/**
 * Applies a single model-type-specific operation to the mutable entity
 * record. Operations unknown to the model type are ignored with a warning,
 * per the {@link Operation} contract.
 */
export function applyModelTypeOperation(modelId: string, modelType: string, working: EntityRecord, operation: Operation): void {
  const support = MODEL_TYPES[modelType];
  if (support !== undefined) {
    try {
      support.applyOperation(modelId, working, operation);
    } catch (error) {
      // Some executors (e.g. the structure model) throw on operations they do
      // not understand; per the Operation contract such operations are only
      // ignored, and one bad operation must not abort a whole transaction
      // batch.
      console.warn(`Failed to apply operation "${operation.type}" to model "${modelId}" of type "${modelType}". The operation is ignored.`, error);
    }
    return;
  }
  console.warn(`Unsupported operation "${operation.type}" for model "${modelId}" of type "${modelType}". The operation is ignored.`);
}

/**
 * Converts entity changes of a model of the given type to its model-type
 * specific operations where possible; the returned remaining changes must be
 * expressed as generic entity operations by the caller.
 */
export function modelTypeChangesToOperations(modelType: string, changes: EntityChange[]): { operations: Operation[]; remainingChanges: EntityChange[] } {
  const convert = MODEL_TYPES[modelType]?.changesToOperations;
  if (convert === undefined) {
    return { operations: [], remainingChanges: changes };
  }
  return convert(changes);
}
