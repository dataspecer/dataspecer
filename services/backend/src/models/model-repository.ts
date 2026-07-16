import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { diffEntities, type EntityRecord } from "@dataspecer/core/entity-model";
import { isUndoOperation, type Operation, type Transaction } from "@dataspecer/core/operation";
import { v4 as uuidv4 } from "uuid";
import {
  applyOperationsToModelEntities,
  applyUndoOperationToModelEntities,
  diffModelEntitiesToOperations,
  entityChangesToEvents,
  isBlobModelType,
  type UndoHistoryEntry,
} from "../utils/model-operations.ts";
import { composeModelId, deserializeModelEntities, NAMED_BLOB_STORE_TYPE, PROJECT_MODEL_ID, serializeModelEntities, splitModelId } from "./model-repository-utils.ts";
import type { BaseResource, Package, ResourceModel } from "./resource-model.ts";
import type { HistoryTransaction, TransactionEvents, TransactionModel, TransactionWithEvents } from "./transaction-model.ts";

export interface ModelRepositoryType {
  getResource(iri: string): Promise<BaseResource | null>;
  getPackage(iri: string): Promise<Package | null>;
  getModelEntities(modelId: string): Promise<EntityRecord | null>;
  createResource(parentIri: string | null, iri: string, type: string, userMetadata: {}): Promise<void>;
  createPackage(parentIri: string | null, iri: string, userMetadata: {}): Promise<void>;
  updateResource(iri: string, userMetadata: {}): Promise<void>;
  deleteResource(iri: string): Promise<void>;
  setResourceStoreJson(iri: string, data: unknown, storeName?: string): Promise<void>;
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
export class ModelRepository implements ModelRepositoryType {
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
        const { up, down } = entityChangesToEvents(diffEntities(previousEntities, nextEntities));
        const upEvents: TransactionEvents = isBlobModelType(modelType) ? {} : { [modelId]: up };
        const downEvents: TransactionEvents = { [modelId]: down };
        const projectIri = await this.resourceModel.getProjectIri(iri);
        await this.transactionModel.createTransactions(projectIri!, [{ id: uuidv4(), operations, upEvents, downEvents }]);
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
    // In-memory state of a model the transactions operate on, loaded once and
    // updated as the transactions are applied to it one by one.
    interface WorkingModel {
      iri: string;
      storeName: string;
      modelType: string;
      previousData: unknown;
      entities: EntityRecord;
      hadOperations: boolean;
    }

    // null marks models whose operations are only recorded: the virtual
    // project model and models whose resource does not exist.
    const workingModels = new Map<string, WorkingModel | null>();

    const getWorkingModel = async (modelId: string): Promise<WorkingModel | null> => {
      let model = workingModels.get(modelId);
      if (model !== undefined) {
        return model;
      }
      model = null;
      if (modelId !== PROJECT_MODEL_ID) {
        const { iri, storeName } = splitModelId(modelId);
        const resource = await this.resourceModel.getResource(iri);
        if (resource === null) {
          console.warn(`Cannot apply operations to model "${modelId}" because its resource does not exist. The operations are only recorded.`);
        } else {
          const modelType = storeName === "model" ? (resource.types[0] ?? "") : NAMED_BLOB_STORE_TYPE;
          const previousData = await this.resourceModel.getResourceStoreJson(iri, storeName);
          model = { iri, storeName, modelType, previousData, entities: deserializeModelEntities(modelId, modelType, previousData), hadOperations: false };
        }
      }
      workingModels.set(modelId, model);
      return model;
    };

    // History of the branch the transactions are appended to, loaded lazily
    // when the first undo operation has to be interpreted.
    let storedHistory: HistoryTransaction[] | null = null;
    const getStoredHistory = async () => (storedHistory ??= await this.transactionModel.getBranchHistory(projectIri));

    // Projects the history a model's current state reflects - the stored
    // transactions followed by the ones of this batch already applied - onto
    // the given model, as needed to interpret an undo operation dispatched
    // to it.
    const getModelHistory = async (modelId: string, processedTransactions: TransactionWithEvents[]): Promise<UndoHistoryEntry[]> => {
      const stored = (await getStoredHistory()).map((transaction) => ({
        clientId: transaction.clientId,
        downEvents: transaction.downEvents,
        operations: transaction.operations,
      }));
      const processed = processedTransactions.map((transaction) => ({
        clientId: transaction.id,
        downEvents: transaction.downEvents ?? {},
        operations: transaction.operations,
      }));
      return [...stored, ...processed].map((transaction) => ({
        clientId: transaction.clientId,
        operations: transaction.operations.filter((operation) => operation.modelId === modelId).map((operation) => operation.operation),
        downEvents: transaction.downEvents === null ? null : (transaction.downEvents[modelId] ?? {}),
      }));
    };

    // Apply the transactions to the models in memory one by one, recording
    // for each transaction its up/down events. Models whose operations are
    // only recorded (see getWorkingModel above) have no events.
    const transactionsWithEvents = await this.buildTransactionsWithEvents(transactions, async (modelId, operations, processedTransactions) => {
      const model = await getWorkingModel(modelId);
      if (model === null) {
        return null;
      }

      const previousEntities = model.entities;

      let working = previousEntities;
      if (operations.some(isUndoOperation)) {
        // An undo operation cancels a whole transaction, which may span
        // several models; it arrives dispatched to each of them and is
        // interpreted here against the recorded history of this model, see
        // applyUndoOperationToModelEntities.
        const modelHistory = await getModelHistory(modelId, processedTransactions);
        for (const operation of operations) {
          if (isUndoOperation(operation)) {
            const undone = applyUndoOperationToModelEntities(modelId, model.modelType, working, operation, modelHistory);
            if (undone === null) {
              console.warn(`Cannot interpret undo of transaction "${operation.cancelTransactionId}" in model "${modelId}". The operation is only recorded.`);
            } else {
              working = undone;
            }
          } else {
            working = applyOperationsToModelEntities(modelId, model.modelType, working, [operation]);
          }
        }
      } else {
        working = applyOperationsToModelEntities(modelId, model.modelType, working, operations);
      }

      model.entities = working;
      model.hadOperations = true;

      return { previousEntities, nextEntities: model.entities, isBlob: isBlobModelType(model.modelType) };
    });

    // The operation history is the source of truth and is written first; the
    // JSON snapshots below are only a cache derived from it.
    await this.transactionModel.createTransactions(projectIri, transactionsWithEvents);

    for (const [modelId, model] of workingModels) {
      if (model === null || !model.hadOperations) {
        continue;
      }
      const nextData = serializeModelEntities(modelId, model.modelType, model.entities, model.previousData ?? undefined);
      await this.resourceModel.setResourceStoreJson(model.iri, nextData, model.storeName);
    }
  }

  /**
   * Records the given transactions on the resource's evolution branch as
   * pending updates: unlike {@link applyTransactions}, the operations are only
   * recorded in the history and are NOT applied to the stored models. If none
   * of the transactions contain any operations, nothing is recorded and the
   * evolution branch is left untouched.
   *
   * The caller provides the base states of the models (model id to entities)
   * the transactions apply to; they are used to derive the up/down events of
   * each transaction.
   */
  async recordEvolutionTransactions(projectIri: string, resourceIri: string, transactions: Transaction[], baseStates: Record<string, EntityRecord>): Promise<void> {
    if (transactions.every((transaction) => transaction.operations.length === 0)) {
      return;
    }

    const workingStates: Record<string, EntityRecord> = {};
    const transactionsWithEvents = await this.buildTransactionsWithEvents(transactions, async (modelId, operations) => {
      if (modelId === PROJECT_MODEL_ID) {
        return null;
      }

      const { modelType, isBlob } = await this.getEventModelType(modelId);
      const previousEntities = workingStates[modelId] ?? baseStates[modelId] ?? {};
      const nextEntities = applyOperationsToModelEntities(modelId, modelType, previousEntities, operations);
      workingStates[modelId] = nextEntities;

      return { previousEntities, nextEntities, isBlob };
    });

    const branchId = await this.transactionModel.getOrCreateEvolutionBranch(projectIri, resourceIri);
    await this.transactionModel.createTransactions(projectIri, transactionsWithEvents, branchId);
  }

  /**
   * Resolves how a model is treated when deriving transaction events: the
   * model type its operations are interpreted with, and whether it is a blob
   * model (recording only down events, see {@link isBlobModelType}). Named
   * stores (model ids with a "#" suffix) are always blobs. A model whose
   * resource does not exist (anymore, e.g. it was deleted during reload)
   * cannot be typed: it is treated as a blob, and its operations are
   * interpreted as semantic ones, since diff-derived operations are either
   * generic (understood by every model type) or semantic.
   */
  private async getEventModelType(modelId: string): Promise<{ modelType: string; isBlob: boolean }> {
    const { iri, storeName } = splitModelId(modelId);
    if (storeName !== "model") {
      return { modelType: NAMED_BLOB_STORE_TYPE, isBlob: true };
    }
    const resource = await this.resourceModel.getResource(iri);
    if (resource === null) {
      return { modelType: LOCAL_SEMANTIC_MODEL, isBlob: true };
    }
    const modelType = resource.types[0] ?? "";
    return { modelType, isBlob: isBlobModelType(modelType) };
  }

  /**
   * Computes the up/down events of each transaction: the state of the
   * entities the transaction changed after (up) and before (down) the
   * transaction. Blob models record only down events - their up state is the
   * next transaction's down event, or the current snapshot.
   *
   * The given callback applies the operations of one transaction targeting
   * one model (in order) and returns the model's entity state before and
   * after them, plus whether the model is a blob; null means the model's
   * events are not recorded. It also receives the transactions of this batch
   * processed so far, with their events.
   */
  private async buildTransactionsWithEvents(
    transactions: Transaction[],
    applyToModel: (
      modelId: string,
      operations: Operation[],
      processedTransactions: TransactionWithEvents[],
    ) => Promise<{ previousEntities: EntityRecord; nextEntities: EntityRecord; isBlob: boolean } | null>,
  ): Promise<TransactionWithEvents[]> {
    const transactionsWithEvents: TransactionWithEvents[] = [];

    for (const transaction of transactions) {
      const upEvents: TransactionEvents = {};
      const downEvents: TransactionEvents = {};

      // Group the transaction's operations by model, preserving their relative order.
      const operationsByModel = new Map<string, Operation[]>();
      for (const { modelId, operation } of transaction.operations) {
        if (!operationsByModel.has(modelId)) {
          operationsByModel.set(modelId, []);
        }
        operationsByModel.get(modelId)!.push(operation);
      }

      for (const [modelId, operations] of operationsByModel) {
        const applied = await applyToModel(modelId, operations, transactionsWithEvents);
        if (applied === null) {
          continue;
        }

        const changes = diffEntities(applied.previousEntities, applied.nextEntities);
        if (changes.length === 0) {
          continue;
        }
        const { up, down } = entityChangesToEvents(changes);
        downEvents[modelId] = down;
        if (!applied.isBlob) {
          upEvents[modelId] = up;
        }
      }

      transactionsWithEvents.push({ ...transaction, upEvents, downEvents });
    }

    return transactionsWithEvents;
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
   * Returns the IRI of the direct parent package of a resource, or null if it
   * is a root resource or does not exist.
   */
  getParentIri(iri: string) {
    return this.resourceModel.getParentIri(iri);
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


