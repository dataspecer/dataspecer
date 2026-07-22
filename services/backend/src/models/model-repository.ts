import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { diffEntities, type EntityRecord } from "@dataspecer/core/entity-model";
import { isUndoOperation, type Operation, type Transaction } from "@dataspecer/core/operation";
import { createCreateModelOperation, createRemoveModelOperation, isCreateModelOperation, isRemoveModelOperation } from "@dataspecer/project-model";
import { v4 as uuidv4 } from "uuid";
import configuration from "../configuration.ts";
import { composeModelId, PROJECT_MODEL_ID, splitModelId } from "./model-id.ts";
import {
  applyOperationsToModelEntities,
  applyUndoOperationToModelEntities,
  diffModelEntitiesToOperations,
  entityChangesToEvents,
  type UndoHistoryEntry,
} from "./model-operations.ts";
import { deserializeModelEntities, deserializeStoredModel, isBlobModelType, NAMED_BLOB_STORE_TYPE, resolveStoreModelType, serializeModelEntities } from "./model-types.ts";
import type { BaseResource, Package, ResourceModel } from "./resource-model.ts";
import type { HistoryTransaction, TransactionEvents, TransactionModel, TransactionWithEvents } from "./transaction-model.ts";
import type { ModelIdentifier } from "@dataspecer/core/model";

export interface ModelRepositoryType {
  getResource(iri: string): Promise<BaseResource | null>;
  getPackage(iri: string): Promise<Package | null>;
  getModelEntities(modelId: string): Promise<EntityRecord | null>;
  createResource(parentIri: string | null, iri: string, type: string, userMetadata: object): Promise<void>;
  createPackage(parentIri: string | null, iri: string, userMetadata: object): Promise<void>;
  updateResource(iri: string, userMetadata: object): Promise<void>;
  deleteResource(iri: string): Promise<void>;
  setResourceStoreJson(iri: string, data: unknown, storeName?: string): Promise<void>;
}

/**
 * Entity states of one model before and after a transaction's operations, as
 * needed to derive the transaction's up/down events for that model. See
 * ModelRepository.buildTransactionsWithEvents.
 */
interface ModelEventsContribution {
  modelId: string;
  previousEntities: EntityRecord;
  nextEntities: EntityRecord;
  isBlob: boolean;
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
 * The lifecycle of models (creation and deletion of resources) is part of the
 * history as well: {@link applyTransactions} interprets operations targeting
 * the virtual project model by creating/deleting the backing resources. The
 * direct resource tree methods ({@link createResource},
 * {@link deleteResource}, ...), kept for old clients, only synthesize the
 * equivalent project model operation and execute it the same way, analogous
 * to how {@link setModelJson} derives operations by diffing.
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
   * resource does not exist.
   */
  async getModelEntities(modelIdentifier: ModelIdentifier): Promise<EntityRecord | null> {
    const { iri, storeName } = splitModelId(modelIdentifier);

    const resource = await this.resourceModel.getResource(iri);
    if (resource === null) {
      return null;
    }

    const data = await this.resourceModel.getResourceStoreJson(iri, storeName);
    return deserializeStoredModel(modelIdentifier, resource.types[0] ?? "", data);
  }

  /**
   * Sets the new content of the model JSON serialization, overwriting the
   * previous content. This is a legacy method before there was support for
   * entities and operations.
   *
   * Models JSON serialization is deprecated.
   *
   * @deprecated
   */
  async setModelJson(modelIdentifier: ModelIdentifier, data: unknown, storeName: string = "model"): Promise<void> {
    const resource = await this.resourceModel.getResource(modelIdentifier);
    if (resource === null) {
      throw new Error("Resource not found.");
    }

    const modelId = composeModelId(modelIdentifier, storeName);
    const modelType = resolveStoreModelType(resource.types[0] ?? "", storeName);

    try {
      // The history is recorded before the snapshot is written: if the write
      // fails and the request is retried, the same operations are derived
      // again and their replay converges to the same state, whereas recording
      // after the write would lose the operations on retry.
      const previousData = await this.resourceModel.getResourceStoreJson(modelIdentifier, storeName);
      const previousEntities = deserializeModelEntities(modelId, modelType, previousData);
      const nextEntities = deserializeModelEntities(modelId, modelType, data);

      const operations = diffModelEntitiesToOperations(modelId, modelType, previousEntities, nextEntities);
      if (operations.length > 0) {
        const { up, down } = entityChangesToEvents(diffEntities(previousEntities, nextEntities));
        const upEvents: TransactionEvents = isBlobModelType(modelType) ? {} : { [modelId]: up };
        const downEvents: TransactionEvents = { [modelId]: down };
        const projectIri = await this.resourceModel.getProjectIri(modelIdentifier);
        await this.transactionModel.createTransactions(projectIri!, [{ id: uuidv4(), operations, upEvents, downEvents }]);
      }
    } catch (error) {
      console.error(`Failed to derive operation history for model "${modelId}". The snapshot is written without it.`, error);
    }

    await this.resourceModel.setResourceStoreJson(modelIdentifier, data, storeName);
  }

  /**
   * Applies transactions (containing operations) to a given project and updates
   * the project. This is the method that should be used to modify models.
   */
  async applyTransactions(projectId: ModelIdentifier, transactions: Transaction[]): Promise<void> {
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

    // null marks models whose operations are only recorded and whose snapshot
    // must not be written: models whose resource does not exist, including
    // models removed by a project model operation of this batch.
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
          const modelType = resolveStoreModelType(resource.types[0] ?? "", storeName);
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
    const getStoredHistory = async () => (storedHistory ??= await this.transactionModel.getBranchHistory(projectId));

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

    // Executes operations targeting the virtual project model by modifying
    // the resource tree: models are created/deleted as resources. Returns
    // event contributions capturing the content of the removed models (their
    // state before the removal), so it stays reconstructible from the
    // history.
    // TODO: The project model's own entities (project structure and metadata)
    // have no up/down events recorded yet.
    const applyProjectModelOperations = async (operations: Operation[]): Promise<ModelEventsContribution[]> => {
      const contributions: ModelEventsContribution[] = [];

      for (const operation of operations) {
        if (isCreateModelOperation(operation)) {
          if ((await this.resourceModel.getResource(operation.modelId)) !== null) {
            // The model already exists, the operation ensures nothing more.
            continue;
          }
          const parent = await this.resourceModel.getResource(operation.parentPackageId);
          if (parent === null || parent.types[0] !== LOCAL_PACKAGE) {
            console.warn(`Cannot create model "${operation.modelId}" because its parent package does not exist. The operation is only recorded.`);
            continue;
          }
          await this.resourceModel.createResource(operation.parentPackageId, operation.modelId, operation.modelType, {});
          // Operations dispatched to this model before its creation cached it
          // as non-existing; drop those entries so that later operations of
          // this batch are applied to the fresh resource.
          for (const modelId of [...workingModels.keys()]) {
            if (splitModelId(modelId).iri === operation.modelId && workingModels.get(modelId) === null) {
              workingModels.delete(modelId);
            }
          }
        } else if (isRemoveModelOperation(operation)) {
          if ((await this.resourceModel.getResource(operation.modelId)) === null) {
            // The model does not exist (anymore), the operation ensures nothing more.
            continue;
          }

          // The state a removed model is deleted with may already differ from
          // its snapshot due to earlier operations of this batch.
          const inMemoryStates = new Map<string, EntityRecord>();
          for (const [modelId, model] of workingModels) {
            if (model !== null) {
              inMemoryStates.set(modelId, model.entities);
            }
          }
          const { states, iris } = await this.collectSubtreeModelStates(operation.modelId, inMemoryStates);
          for (const [removedModelId, entities] of states) {
            contributions.push({ modelId: removedModelId, previousEntities: entities, nextEntities: {}, isBlob: false });
          }

          // The resources are gone: later operations of this batch targeting
          // them are only recorded, and no snapshot may be written for them.
          const removedIris = new Set(iris);
          for (const modelId of workingModels.keys()) {
            if (removedIris.has(splitModelId(modelId).iri)) {
              workingModels.set(modelId, null);
            }
          }

          await this.resourceModel.deleteResource(operation.modelId);
        } else {
          // Other operations (e.g. generic entity operations changing the
          // project structure metadata) are not interpreted yet, only recorded.
          console.warn(`Unsupported operation "${operation.type}" for the project model. The operation is only recorded.`);
        }
      }

      return contributions;
    };

    // Apply the transactions to the models in memory one by one, recording
    // for each transaction its up/down events. Models whose operations are
    // only recorded (see getWorkingModel above) have no events.
    const transactionsWithEvents = await this.buildTransactionsWithEvents(transactions, async (modelId, operations, processedTransactions) => {
      if (modelId === PROJECT_MODEL_ID) {
        return await applyProjectModelOperations(operations);
      }

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

      return [{ modelId, previousEntities, nextEntities: model.entities, isBlob: isBlobModelType(model.modelType) }];
    });

    // The operation history is the source of truth and is written first; the
    // JSON snapshots below are only a cache derived from it.
    await this.transactionModel.createTransactions(projectId, transactionsWithEvents);

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
   *
   * Returns the id of the evolution branch the transactions were recorded on,
   * or null if there was nothing to record.
   */
  async recordEvolutionTransactions(projectIri: string, resourceIri: string, transactions: Transaction[], baseStates: Record<string, EntityRecord>): Promise<number | null> {
    if (transactions.every((transaction) => transaction.operations.length === 0)) {
      return null;
    }

    const workingStates: Record<string, EntityRecord> = {};
    const transactionsWithEvents = await this.buildTransactionsWithEvents(transactions, async (modelId, operations) => {
      if (modelId === PROJECT_MODEL_ID) {
        // TODO: Project model operations (model creation/removal) are only
        // recorded on the evolution branch without events; whatever applies
        // or merges the evolution must interpret them itself.
        return null;
      }

      const { modelType, isBlob } = await this.getEventModelType(modelId);
      const previousEntities = workingStates[modelId] ?? baseStates[modelId] ?? {};
      const nextEntities = applyOperationsToModelEntities(modelId, modelType, previousEntities, operations);
      workingStates[modelId] = nextEntities;

      return [{ modelId, previousEntities, nextEntities, isBlob }];
    });

    const branchId = await this.transactionModel.getOrCreateEvolutionBranch(projectIri, resourceIri);
    await this.transactionModel.createTransactions(projectIri, transactionsWithEvents, branchId);
    return branchId;
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
   * one model (in order) and returns the entity states before and after them
   * as event contributions; null means the model's events are not recorded.
   * Usually the contributions concern only the targeted model itself, but
   * project model operations contribute the content of the models they
   * remove. It also receives the transactions of this batch processed so
   * far, with their events.
   */
  private async buildTransactionsWithEvents(
    transactions: Transaction[],
    applyToModel: (modelId: string, operations: Operation[], processedTransactions: TransactionWithEvents[]) => Promise<ModelEventsContribution[] | null>,
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
        const contributions = await applyToModel(modelId, operations, transactionsWithEvents);
        if (contributions === null) {
          continue;
        }

        for (const contribution of contributions) {
          const changes = diffEntities(contribution.previousEntities, contribution.nextEntities);
          if (changes.length === 0) {
            continue;
          }
          const { up, down } = entityChangesToEvents(changes);
          // A model may receive several contributions within one transaction
          // (its own operations, then its removal): for each entity, the down
          // state of the first contribution and the up state of the last one
          // describe the transaction as a whole.
          downEvents[contribution.modelId] = { ...down, ...downEvents[contribution.modelId] };
          if (!contribution.isBlob) {
            upEvents[contribution.modelId] = { ...upEvents[contribution.modelId], ...up };
          }
        }
      }

      transactionsWithEvents.push({ ...transaction, upEvents, downEvents });
    }

    return transactionsWithEvents;
  }

  /**
   * Collects the current content of every model stored in the subtree of the
   * given resource - for each resource its default "model" store (whose
   * effective content exists even before any data is written, see
   * {@link deserializeModelEntities}) and all named stores. Used to record
   * down events when the subtree is deleted.
   *
   * The `inMemoryStates` map (model id to entities) overrides the stored
   * snapshots with states already modified in memory and may list models
   * whose stores are not persisted yet.
   *
   * Returns the collected non-empty states by model id, and the IRIs of all
   * visited resources.
   */
  private async collectSubtreeModelStates(rootIri: string, inMemoryStates: Map<string, EntityRecord>): Promise<{ states: Map<string, EntityRecord>; iris: string[] }> {
    const states = new Map<string, EntityRecord>();
    const iris: string[] = [];

    const visit = async (iri: string): Promise<void> => {
      const resource = await this.resourceModel.getResource(iri);
      if (resource === null) {
        return;
      }
      iris.push(iri);

      const storeNames = new Set(["model", ...Object.keys(resource.dataStores)]);
      for (const modelId of inMemoryStates.keys()) {
        const split = splitModelId(modelId);
        if (split.iri === iri) {
          storeNames.add(split.storeName);
        }
      }

      for (const storeName of storeNames) {
        const modelId = composeModelId(iri, storeName);
        let entities = inMemoryStates.get(modelId);
        if (entities === undefined) {
          const data = await this.resourceModel.getResourceStoreJson(iri, storeName);
          entities = deserializeStoredModel(modelId, resource.types[0] ?? "", data) ?? {};
        }
        if (Object.keys(entities).length > 0) {
          states.set(modelId, entities);
        }
      }

      if (resource.types[0] === LOCAL_PACKAGE) {
        const packageResource = await this.resourceModel.getPackage(iri);
        for (const subResource of packageResource?.subResources ?? []) {
          await visit(subResource.iri);
        }
      }
    };

    await visit(rootIri);
    return { states, iris };
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
   * Returns the IRI of the project the resource belongs to - the package
   * whose history the resource's changes are recorded under - or null if the
   * resource does not exist.
   */
  getProjectIri(iri: string) {
    return this.resourceModel.getProjectIri(iri);
  }

  /**
   * Returns data about the package and its sub-resources.
   *
   * {@link Package.hasPendingEvolution}/{@link BaseResource.hasPendingEvolution}
   * is only meaningful for main packages (projects), not for arbitrary
   * sub-packages, so it is set on the requested package itself - except for
   * the root package, whose direct sub-resources are the actual projects, in
   * which case it is set on each of them instead.
   */
  async getPackage(projectId: ModelIdentifier) {
    const pkg = await this.resourceModel.getPackage(projectId);
    if (pkg === null) {
      return null;
    }

    if (projectId === configuration.localRootIri) {
      return {
        ...pkg,
        subResources: await Promise.all(
          pkg.subResources.map(async (resource) => ({ ...resource, hasPendingEvolution: await this.hasPendingEvolutionBranch(resource.iri) })),
        ),
      };
    }

    return { ...pkg, hasPendingEvolution: await this.hasPendingEvolutionBranch(projectId) };
  }

  /**
   * Whether the resource has a pending evolution branch recorded for it.
   */
  private async hasPendingEvolutionBranch(projectId: ModelIdentifier): Promise<boolean> {
    const projectIri = await this.resourceModel.getProjectIri(projectId);
    if (projectIri === null) {
      return false;
    }

    const branches = await this.transactionModel.listBranches(projectIri);
    return (branches ?? []).some((branch) => branch.name === null);
  }

  getRootResources() {
    return this.resourceModel.getRootResources();
  }

  /**
   * Creates a resource, kept for old clients that manage the resource tree
   * directly. The creation is expressed as an equivalent project model
   * operation executed via {@link applyTransactions} - creation of models is
   * interpreted (and recorded in the history) in a single place.
   *
   * Two bootstrap cases cannot go through a project's history: a root
   * resource (parent IRI is null) has no project at all, and a resource
   * created directly under a root is a project itself, whose history cannot
   * exist before it does. Those are created directly; the project
   * additionally records its own creation into its freshly started history.
   */
  async createResource(parentIri: string | null, iri: string, type: string, userMetadata: object): Promise<void> {
    if (parentIri === null) {
      return this.resourceModel.createResource(parentIri, iri, type, userMetadata);
    }

    // Preserve the old interface's errors - the operation itself would treat
    // both cases as "nothing to ensure" and silently skip.
    if ((await this.resourceModel.getResource(iri)) !== null) {
      throw new Error("Cannot create resource because it already exists.");
    }
    const parent = await this.resourceModel.getResource(parentIri);
    if (parent === null || parent.types[0] !== LOCAL_PACKAGE) {
      throw new Error("Cannot create resource because the parent package was not found or is not a package.");
    }

    const isProject = (await this.resourceModel.getRootResources()).some((root) => root.iri === parentIri);
    if (isProject) {
      await this.resourceModel.createResource(parentIri, iri, type, userMetadata);
    }

    const projectIri = isProject ? iri : (await this.resourceModel.getProjectIri(parentIri))!;
    const operation = createCreateModelOperation(parentIri, type, iri);
    await this.applyTransactions(projectIri, [{ id: uuidv4(), operations: [{ modelId: PROJECT_MODEL_ID, operation }] }]);

    if (!isProject && Object.keys(userMetadata).length > 0) {
      // The user metadata is not part of the operation, set it directly.
      // TODO: The project model's own entities (project structure and
      // metadata) have no operations/events recorded yet.
      await this.resourceModel.updateResource(iri, userMetadata);
    }
  }

  /**
   * Creates resource of type LOCAL_PACKAGE. See {@link createResource}.
   */
  createPackage(parentIri: string | null, iri: string, userMetadata: object): Promise<void> {
    return this.createResource(parentIri, iri, LOCAL_PACKAGE, userMetadata);
  }

  /**
   * Updates user metadata of the resource by merging in the given properties.
   */
  updateResource(iri: string, userMetadata: object) {
    return this.resourceModel.updateResource(iri, userMetadata);
  }

  /**
   * Deletes the resource and if the resource is a package, all sub-resources.
   * Kept for old clients that manage the resource tree directly. The removal
   * is expressed as an equivalent project model operation executed via
   * {@link applyTransactions} - removal of models, including recording the
   * deleted content as down events, is interpreted in a single place.
   *
   * Deleting a root resource or a whole project is done directly, as its
   * history does not exist or is deleted with it.
   */
  async deleteResource(iri: string): Promise<void> {
    const projectIri = await this.resourceModel.getProjectIri(iri);
    if (projectIri === null || projectIri === iri) {
      // Also covers a non-existing resource (projectIri is null), letting the
      // direct deletion throw the old interface's error.
      return this.resourceModel.deleteResource(iri);
    }

    const operation = createRemoveModelOperation(iri);
    await this.applyTransactions(projectIri, [{ id: uuidv4(), operations: [{ modelId: PROJECT_MODEL_ID, operation }] }]);
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
