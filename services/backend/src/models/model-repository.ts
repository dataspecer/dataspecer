import { LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { semanticModelEntitiesToSerialization, serializationToSemanticModelEntities } from "@dataspecer/core-v2/semantic-model";
import { serializationToPimModelEntities } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import type { CoreResourceAndEntity } from "@dataspecer/core/core";
import { serializationToStructureModelEntities, structureModelEntitiesToSerialization } from "@dataspecer/core/data-psm";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { serializationToBlobModelEntities } from "@dataspecer/core/entity-model/utils";
import type { Operation, Transaction } from "@dataspecer/core/operation";
import {
  asyncQueryableModelEntitiesToSerialization,
  pimModelEntitiesToSerialization,
  serializationToAsyncQueryableModelEntities,
} from "@dataspecer/model-store/implementation";
import { serializationToVisualModelEntities, visualModelEntitiesToSerialization } from "@dataspecer/visual-model";
import { v4 as uuidv4 } from "uuid";
import { applyOperationsToModelEntities, diffModelEntitiesToOperations } from "../utils/model-operations.ts";
import type { ResourceModel } from "./resource-model.ts";
import type { TransactionModel } from "./transaction-model.ts";

/**
 * Id of the virtual project model that lists the models of a project. It has
 * no backing resource; operations targeting it are only recorded.
 */
export const PROJECT_MODEL_ID = "_project_model";

/**
 * Synthetic model type for named, non-default storage blobs of a resource
 * (e.g. the "svg" blob of a visual model). Such blobs are treated as their own
 * blob models with id `${resourceIri}#${storeName}`, analogous to how the
 * frontend model store tracks them.
 */
const NAMED_BLOB_STORE_TYPE = "#blob";

function splitModelId(modelId: string): { iri: string; storeName: string } {
  const hashIndex = modelId.indexOf("#");
  if (hashIndex === -1) {
    return { iri: modelId, storeName: "model" };
  }
  return { iri: modelId.slice(0, hashIndex), storeName: modelId.slice(hashIndex + 1) };
}

function composeModelId(iri: string, storeName: string): string {
  return storeName === "model" ? iri : `${iri}#${storeName}`;
}

/**
 * Converts the JSON serialization of a model of the given type to a set of
 * entities. If the serialization is missing (null or undefined), the initial
 * state of a freshly created model of that type is returned instead,
 * mirroring how models are initialized on the frontend.
 */
function deserializeModelEntities(modelId: string, modelType: string, data: unknown): EntityRecord {
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

/**
 * Converts a set of entities of a model of the given type back to its JSON
 * serialization. Inverse of {@link deserializeModelEntities}.
 *
 * @param previousSerialization The serialization the entities were loaded
 * from, if any. It is used to carry over parts of the serialization that are
 * not represented as entities (currently the legacy embedded operation log of
 * the structure model).
 */
function serializeModelEntities(modelId: string, modelType: string, entities: EntityRecord, previousSerialization?: unknown): unknown {
  if (modelType === LOCAL_SEMANTIC_MODEL) {
    return semanticModelEntitiesToSerialization(entities);
  }

  if (modelType === VISUAL_MODEL) {
    return visualModelEntitiesToSerialization(entities);
  }

  if (modelType === V1.PSM) {
    return structureModelEntitiesToSerialization({
      operations: ((previousSerialization as { operations?: Operation[] })?.operations) ?? [],
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
 * Manages the content of models, understood as sets of entities that are
 * modified by operations. It combines the two underlying storages:
 * {@link ResourceModel}, which stores the current state of each model as a
 * JSON snapshot, and {@link TransactionModel}, which stores the history of
 * operations. The rest of the backend is expected to access resources and
 * models only through this class.
 *
 * The operation history is the primary representation of a model - the JSON
 * snapshots are only a cache of the current state that will eventually be
 * removed. Therefore both write interfaces keep the history complete:
 *  - {@link applyTransactions} is the new interface: it records the given
 *    operations and updates the JSON snapshots accordingly.
 *  - {@link setModelJson} supports the old interface where clients upload the
 *    whole JSON snapshot: the snapshot is stored as before, and operations
 *    describing the change are derived by diffing the old and new state.
 *
 * The lifecycle of models (creation and deletion of resources) is not handled
 * by the history yet; the resource tree operations are plain delegates to
 * {@link ResourceModel}.
 */
export class ModelRepository {
  private readonly resourceModel: ResourceModel;
  private readonly transactionModel: TransactionModel;

  constructor(resourceModel: ResourceModel, transactionModel: TransactionModel) {
    this.resourceModel = resourceModel;
    this.transactionModel = transactionModel;
  }

  /**
   * Returns the content of the model as a set of entities, or null if the
   * resource does not exist. If the model has no data stored yet, the initial
   * state of a freshly created model of its type is returned.
   *
   * The model id may address a named, non-default storage blob of a resource
   * as `${resourceIri}#${storeName}`; for those, null is returned if the blob
   * does not exist.
   */
  async getModelEntities(modelId: string): Promise<EntityRecord | null> {
    const { iri, storeName } = splitModelId(modelId);

    const resource = await this.resourceModel.getResource(iri);
    if (resource === null) {
      return null;
    }

    const data = await this.resourceModel.getResourceStoreJson(iri, storeName);

    if (storeName === "model") {
      return deserializeModelEntities(iri, resource.types[0] ?? "", data);
    }

    if (data === null) {
      return null;
    }
    return deserializeModelEntities(modelId, NAMED_BLOB_STORE_TYPE, data);
  }

  /**
   * Overwrites the JSON snapshot of the model as the old interface did, but
   * additionally derives operations that transform the previous state of the
   * model into the new one and records them as a transaction in the operation
   * history of the model's project.
   *
   * The derivation of the history is best-effort: if it fails (e.g. because
   * the stored data cannot be interpreted as entities), the snapshot is still
   * written to keep the old interface working.
   */
  async setModelJson(iri: string, data: unknown, storeName: string = "model"): Promise<void> {
    const resource = await this.resourceModel.getResource(iri);
    if (resource === null) {
      throw new Error("Resource not found.");
    }

    const modelId = composeModelId(iri, storeName);
    const modelType = storeName === "model" ? (resource.types[0] ?? "") : NAMED_BLOB_STORE_TYPE;

    try {
      // The history is recorded before the snapshot is written: if the write
      // fails and the request is retried, the same operations are derived
      // again and their replay converges to the same state, whereas recording
      // after the write would lose the operations on retry.
      const previousData = await this.resourceModel.getResourceStoreJson(iri, storeName);
      const previousEntities = deserializeModelEntities(modelId, modelType, previousData);
      const nextEntities = deserializeModelEntities(modelId, modelType, data);

      const operations = diffModelEntitiesToOperations(modelId, modelType, previousEntities, nextEntities);
      if (operations.length > 0) {
        const projectIri = await this.resourceModel.getProjectIri(iri);
        await this.transactionModel.createTransactions(projectIri!, [{ id: uuidv4(), operations }]);
      }
    } catch (error) {
      console.error(`Failed to derive operation history for model "${modelId}". The snapshot is written without it.`, error);
    }

    await this.resourceModel.setResourceStoreJson(iri, data, storeName);
  }

  /**
   * The new interface for writing models: records the given transactions (in
   * order) in the operation history of the project and applies their
   * operations to the stored models, updating the JSON snapshots.
   *
   * Operations targeting the virtual project model, or models whose resource
   * does not exist, are only recorded - the lifecycle of models is not
   * handled here.
   */
  async applyTransactions(projectIri: string, transactions: Transaction[]): Promise<void> {
    // The operation history is the source of truth and is written first; the
    // JSON snapshots below are only a cache derived from it.
    await this.transactionModel.createTransactions(projectIri, transactions);

    // Group operations by model, preserving their relative order.
    const operationsByModel = new Map<string, Operation[]>();
    for (const transaction of transactions) {
      for (const { modelId, operation } of transaction.operations) {
        if (!operationsByModel.has(modelId)) {
          operationsByModel.set(modelId, []);
        }
        operationsByModel.get(modelId)!.push(operation);
      }
    }

    for (const [modelId, operations] of operationsByModel) {
      await this.applyOperationsToStoredModel(modelId, operations);
    }
  }

  /**
   * Applies operations to a single stored model and updates its JSON snapshot.
   */
  private async applyOperationsToStoredModel(modelId: string, operations: Operation[]): Promise<void> {
    if (modelId === PROJECT_MODEL_ID) {
      return;
    }

    const { iri, storeName } = splitModelId(modelId);

    const resource = await this.resourceModel.getResource(iri);
    if (resource === null) {
      console.warn(`Cannot apply operations to model "${modelId}" because its resource does not exist. The operations are only recorded.`);
      return;
    }

    const modelType = storeName === "model" ? (resource.types[0] ?? "") : NAMED_BLOB_STORE_TYPE;

    const previousData = await this.resourceModel.getResourceStoreJson(iri, storeName);
    const entities = deserializeModelEntities(modelId, modelType, previousData);
    const nextEntities = applyOperationsToModelEntities(modelId, modelType, entities, operations);
    const nextData = serializeModelEntities(modelId, modelType, nextEntities, previousData ?? undefined);
    await this.resourceModel.setResourceStoreJson(iri, nextData, storeName);
  }

  // The methods below delegate to the underlying storages so that the rest of
  // the backend does not need to access them directly.

  /**
   * Returns a single resource or null if the resource does not exist.
   */
  getResource(iri: string) {
    return this.resourceModel.getResource(iri);
  }

  /**
   * Returns data about the package and its sub-resources.
   */
  getPackage(iri: string) {
    return this.resourceModel.getPackage(iri);
  }

  getRootResources() {
    return this.resourceModel.getRootResources();
  }

  /**
   * Low level function to create a resource.
   * If parent IRI is null, the resource is created as root resource.
   */
  createResource(parentIri: string | null, iri: string, type: string, userMetadata: {}) {
    return this.resourceModel.createResource(parentIri, iri, type, userMetadata);
  }

  /**
   * Creates resource of type LOCAL_PACKAGE.
   */
  createPackage(parentIri: string | null, iri: string, userMetadata: {}) {
    return this.resourceModel.createPackage(parentIri, iri, userMetadata);
  }

  /**
   * Updates user metadata of the resource.
   */
  updateResource(iri: string, userMetadata: {}) {
    return this.resourceModel.updateResource(iri, userMetadata);
  }

  /**
   * Deletes the resource and if the resource is a package, all sub-resources.
   */
  deleteResource(iri: string) {
    return this.resourceModel.deleteResource(iri);
  }

  /**
   * Returns the serialized JSON snapshot of the model as stored, or null if
   * the resource has no such store.
   */
  getResourceStoreJson(iri: string, storeName: string = "model") {
    return this.resourceModel.getResourceStoreJson(iri, storeName);
  }

  /**
   * Overwrites the JSON snapshot of the model WITHOUT recording the change in
   * the operation history. Only for flows that record the history themselves
   * (e.g. reload on an evolution branch) or whose content is intentionally
   * outside the history (bootstrap, migrations, backup import). Everything
   * else must use {@link setModelJson} or {@link applyTransactions}.
   */
  setResourceStoreJson(iri: string, data: unknown, storeName: string = "model") {
    return this.resourceModel.setResourceStoreJson(iri, data, storeName);
  }

  /**
   * Returns the raw buffer contents of the named store attached to the
   * resource, or null if the resource has no such store.
   */
  getResourceStoreBuffer(iri: string, storeName: string = "model") {
    return this.resourceModel.getResourceStoreBuffer(iri, storeName);
  }

  deleteResourceStore(iri: string, storeName: string = "model") {
    return this.resourceModel.deleteResourceStore(iri, storeName);
  }
}
