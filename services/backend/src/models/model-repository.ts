import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, RDFS_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import { diffEntities, type Entity, type EntityRecord } from "@dataspecer/core/entity-model";
import {
  createUpdateEntityOperation,
  isSetEntityOperation,
  isUpdateEntityOperation,
  type Operation,
  type OperationInModel,
  type Transaction,
  type UndoOperation,
} from "@dataspecer/core/operation";
import type { MainEntity } from "@dataspecer/model-store/implementation";
import {
  createCreateModelOperation,
  createCreateProjectOperation,
  createRemoveModelOperation,
  isCreateModelOperation,
  isCreateProjectOperation,
  isRemoveModelOperation,
  type PackageEntity,
} from "@dataspecer/core/project-model";
import { v4 as uuidv4 } from "uuid";
import configuration from "../configuration.ts";
import { composeModelId, PROJECT_MODEL_ID, splitModelId } from "./model-id.ts";
import {
  applyOperationsToModelEntities,
  applyUndoOperationToModels,
  diffModelEntitiesToOperations,
  entityChangesToEvents,
  groupTransactionOperations,
  type UndoHistoryTransaction,
} from "./model-operations.ts";
import { buildProjectModelEntities } from "./project-model-entities.ts";
import { deserializeModelEntities, deserializeStoredModel, isBlobModelType, NAMED_BLOB_STORE_TYPE, resolveStoreModelType, serializeModelEntities } from "./model-types.ts";
import type { BaseResource, Package, ResourceModel } from "./resource-model.ts";
import type { HistoryTransaction, TransactionEvents, TransactionModel, TransactionWithEvents } from "./transaction-model.ts";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { deepEqual } from "@dataspecer/utilities";

/** Package that all projects are created directly under. */
const PROJECT_ROOT_IRI = configuration.localRootIri;

export interface ModelRepositoryType {
  getResource(iri: string): Promise<BaseResource | null>;
  getPackage(iri: string): Promise<Package | null>;
  getModelEntities(modelId: string): Promise<EntityRecord | null>;
  /** @deprecated Use operations, see {@link ModelRepository.createResource}. */
  createResource(parentIri: string | null, iri: string, type: string, userMetadata: object): Promise<void>;
  /** @deprecated Use operations, see {@link ModelRepository.createPackage}. */
  createPackage(parentIri: string | null, iri: string, userMetadata: object): Promise<void>;
  /** @deprecated Use operations, see {@link ModelRepository.updateResource}. */
  updateResource(iri: string, userMetadata: object): Promise<void>;
  /** @deprecated Use operations, see {@link ModelRepository.deleteResource}. */
  deleteResource(iri: string): Promise<void>;
  /** @deprecated Use operations, see {@link ModelRepository.setResourceStoreJson}. */
  setResourceStoreJson(iri: string, data: unknown, storeName?: string): Promise<void>;
  /** @deprecated Use operations, see {@link ModelRepository.setModelJson}. */
  setModelJson(iri: string, data: unknown, storeName?: string): Promise<void>;
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
 * The lifecycle of models (creation and deletion of resources) and their
 * metadata is part of the history as well: {@link applyTransactions}
 * interprets operations targeting the virtual project model by
 * creating/deleting the backing resources and updating their user metadata.
 * The direct resource tree methods ({@link createResource},
 * {@link updateResource}, {@link deleteResource}), kept for old clients, only
 * synthesize the equivalent project model operations and execute them the same
 * way, analogous to how {@link setModelJson} derives operations by diffing.
 * Only resources outside any project (the roots) and a project deleted as a
 * whole are written directly, as there is no history to record them in.
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
   * @deprecated Use operations to modify models
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
   *
   * The project does not have to exist yet if the first operation is a create
   * project operation.
   */
  async applyTransactions(projectId: ModelIdentifier, transactions: Transaction[]): Promise<void> {
    // Models the transactions modify: their stored serialization and the state
    // the operations are applied to. A model is loaded only to apply
    // operations to it, hence every entry is written back at the end.
    const models: Record<ModelIdentifier, { modelType: string; storedData: unknown; entities: EntityRecord }> = {};

    // Loads a model on first use. Returns null if the model has no resource,
    // in which case its operations can only be recorded.
    const loadModel = async (modelId: ModelIdentifier, warnIfMissing: boolean = true) => {
      const loaded = models[modelId];
      if (loaded !== undefined) {
        return loaded;
      }

      const { iri, storeName } = splitModelId(modelId);
      const resource = await this.resourceModel.getResource(iri);
      if (resource === null) {
        if (warnIfMissing) {
          console.warn(`Cannot apply operations to model "${modelId}" because its resource does not exist. The operations are only recorded.`);
        }
        return null;
      }

      const modelType = resolveStoreModelType(resource.types[0] ?? "", storeName);
      const storedData = await this.resourceModel.getResourceStoreJson(iri, storeName);
      const model = { modelType, storedData, entities: deserializeModelEntities(modelId, modelType, storedData) };
      models[modelId] = model;
      return model;
    };

    // Structure of the project as the project model sees it, loaded lazily on
    // the first operation targeting it. It is kept in sync with the resource
    // tree below, so that changes of the structure are recorded as events of
    // the project model and can therefore be undone.
    let projectEntities: EntityRecord | null = null;
    const getProjectEntities = async () => (projectEntities ??= await buildProjectModelEntities(projectId, (iri) => this.resourceModel.getPackage(iri)));

    // History of the branch the transactions are appended to, loaded lazily
    // when the first undo operation has to be interpreted.
    let storedHistory: HistoryTransaction[] | null = null;
    const getStoredHistory = async () => (storedHistory ??= await this.transactionModel.getBranchHistory(projectId));

    // The history the current state reflects - the stored transactions
    // followed by the ones of this batch already applied - as needed to
    // interpret an undo operation.
    const getHistory = async (processedTransactions: TransactionWithEvents[]): Promise<UndoHistoryTransaction[]> => [
      ...(await getStoredHistory()).map((transaction) => ({
        clientId: transaction.clientId,
        operations: transaction.operations,
        downEvents: transaction.downEvents,
      })),
      ...processedTransactions.map((transaction) => ({
        clientId: transaction.id,
        operations: transaction.operations,
        downEvents: transaction.downEvents ?? {},
      })),
    ];

    const applyProjectModelOperations = async (operations: Operation[]): Promise<ModelEventsContribution[]> => {
      const previousProjectEntities = await getProjectEntities();
      let workingProjectEntities = previousProjectEntities;

      // Mirrors a change just made to the resources in the project structure.
      const project = (operation: Operation) => {
        workingProjectEntities = applyOperationsToModelEntities(PROJECT_MODEL_ID, "", workingProjectEntities, [operation]);
      };

      const contributions: ModelEventsContribution[] = [];

      for (const operation of operations) {
        if (isCreateProjectOperation(operation)) {
          if (operation.projectId !== projectId) {
            throw new Error(`Cannot create project "${operation.projectId}" from the history of project "${projectId}".`);
          }
          if ((await this.resourceModel.getResource(operation.projectId)) !== null) {
            // The project already exists, the operation ensures nothing more.
            continue;
          }
          // Label and description of a resource are stored as its user metadata.
          await this.resourceModel.createResource(PROJECT_ROOT_IRI, operation.projectId, LOCAL_PACKAGE, { label: operation.label, description: operation.description });
          project(operation);
        } else if (isCreateModelOperation(operation)) {
          if ((await this.resourceModel.getResource(operation.modelId)) !== null) {
            // The model already exists, the operation ensures nothing more.
            continue;
          }
          const parent = await this.resourceModel.getResource(operation.parentPackageId);
          if (parent === null || parent.types[0] !== LOCAL_PACKAGE) {
            console.warn(`Cannot create model "${operation.modelId}" because its parent package does not exist. The operation is only recorded.`);
            continue;
          }
          await this.resourceModel.createResource(operation.parentPackageId, operation.modelId, operation.modelType, { label: operation.label, description: operation.description });
          project(operation);
        } else if (isRemoveModelOperation(operation)) {
          if ((await this.resourceModel.getResource(operation.modelId)) === null) {
            // The model does not exist (anymore), the operation ensures nothing more.
            continue;
          }

          // The state a removed model is deleted with may already differ from
          // its snapshot due to earlier operations of this batch.
          const inMemoryStates: Record<ModelIdentifier, EntityRecord> = {};
          for (const [modelId, model] of Object.entries(models)) {
            inMemoryStates[modelId] = model.entities;
          }
          const { states, iris } = await this.collectSubtreeModelStates(operation.modelId, inMemoryStates);
          for (const [removedModelId, entities] of Object.entries(states)) {
            contributions.push({ modelId: removedModelId, previousEntities: entities, nextEntities: {}, isBlob: false });
          }

          // Forget the removed models so that no snapshot is written for them
          // and later operations of this batch are only recorded.
          const removedIris = new Set(iris);
          for (const modelId of Object.keys(models)) {
            if (removedIris.has(splitModelId(modelId).iri)) {
              delete models[modelId];
            }
          }

          await this.resourceModel.deleteResource(operation.modelId);
          project(operation);
        } else if (isUpdateEntityOperation(operation) || isSetEntityOperation(operation)) {
          // A generic entity operation changing a resource's projection in
          // the project model - currently only used for label/description
          // changes (e.g. a package renamed on reload, see
          // diffModelStates/reloadResource). The structural fields of a
          // ProjectModelEntity (id, type, modelType, subModels) are derived
          // from the resource tree elsewhere and are not themselves settable
          // user metadata, so they are dropped here.
          const entityId = isUpdateEntityOperation(operation) ? operation.entityId : operation.entity.id;
          const { id, type, modelType, subModels, ...userMetadata } = (isUpdateEntityOperation(operation) ? operation.update : operation.entity) as Record<string, unknown>;
          if ((await this.resourceModel.getResource(entityId)) === null) {
            console.warn(`Cannot update metadata of resource "${entityId}" via the project model because it does not exist. The operation is only recorded.`);
            continue;
          }
          await this.resourceModel.updateResource(entityId, userMetadata);
          // Only the user metadata reaches the resource, so that is also all
          // the project structure takes over from the operation.
          project(createUpdateEntityOperation(entityId, userMetadata));
        } else {
          // Other operations (e.g. project structure metadata changes not
          // covered above) are not interpreted yet, only recorded.
          console.warn(`Unsupported operation "${operation.type}" for the project model. The operation is only recorded.`);
        }
      }

      projectEntities = workingProjectEntities;
      contributions.push({ modelId: PROJECT_MODEL_ID, previousEntities: previousProjectEntities, nextEntities: workingProjectEntities, isBlob: false });

      return contributions;
    };

    // An undo cancels a whole transaction across all models it touched, so it
    // is interpreted against the recorded history of the whole project, see
    // applyUndoOperationToModels. The resulting states replace the states of
    // all models involved, including the project structure.
    const applyUndoOperations = async (undoOperations: UndoOperation[], processedTransactions: TransactionWithEvents[]): Promise<ModelEventsContribution[]> => {
      const contributions: ModelEventsContribution[] = [];

      for (const undoOperation of undoOperations) {
        const previousStates: Record<ModelIdentifier, EntityRecord> = {};
        const nextStates = await applyUndoOperationToModels(undoOperation, await getHistory(processedTransactions), async (modelId) => {
          const entities = modelId === PROJECT_MODEL_ID ? await getProjectEntities() : ((await loadModel(modelId, false))?.entities ?? {});
          previousStates[modelId] = entities;
          return entities;
        });

        if (nextStates === null) {
          console.warn(`Cannot interpret undo of transaction "${undoOperation.cancelTransactionId}" in project "${projectId}". The operation is only recorded.`);
          continue;
        }

        const nextProjectEntities = nextStates[PROJECT_MODEL_ID]!;
        // The project structure is rewound like any other model, so the
        // resources it describes have to be brought in line with it.
        await this.applyProjectStructure(projectId, previousStates[PROJECT_MODEL_ID] ?? {}, nextProjectEntities);
        projectEntities = nextProjectEntities;
        contributions.push({ modelId: PROJECT_MODEL_ID, previousEntities: previousStates[PROJECT_MODEL_ID] ?? {}, nextEntities: nextProjectEntities, isBlob: false });

        for (const [modelId, entities] of Object.entries(nextStates)) {
          if (modelId === PROJECT_MODEL_ID) {
            continue;
          }
          // The resource behind the model may have just been created or
          // deleted by the reconciliation above, so whether the model still
          // exists is decided by the resource, not by what was loaded before.
          if ((await this.resourceModel.getResource(splitModelId(modelId).iri)) === null) {
            // The model does not exist anymore, its content is not written.
            delete models[modelId];
            contributions.push({ modelId, previousEntities: previousStates[modelId] ?? {}, nextEntities: entities, isBlob: false });
            continue;
          }

          // Models the undo restored load (and are written back) like any other.
          const model = (await loadModel(modelId, false))!;
          model.entities = entities;
          contributions.push({ modelId, previousEntities: previousStates[modelId] ?? {}, nextEntities: entities, isBlob: isBlobModelType(model.modelType) });
        }
      }

      return contributions;
    };

    // Apply the transactions to the models in memory one by one, recording
    // for each transaction its up/down events. Models whose operations are
    // only recorded (see loadModel above) have no events.
    const transactionsWithEvents = await this.buildTransactionsWithEvents(
      transactions,
      async (modelId, operations) => {
        if (modelId === PROJECT_MODEL_ID) {
          return await applyProjectModelOperations(operations);
        }

        const model = await loadModel(modelId);
        if (model === null) {
          return null;
        }

        const previousEntities = model.entities;
        model.entities = applyOperationsToModelEntities(modelId, model.modelType, previousEntities, operations);

        return [{ modelId, previousEntities, nextEntities: model.entities, isBlob: isBlobModelType(model.modelType) }];
      },
      applyUndoOperations,
    );

    // A project removed by its own transactions is deleted together with its
    // history, so there is nothing left to record the transactions in.
    const projectRemoved = transactions.some((transaction) =>
      transaction.operations.some(({ modelId, operation }) => modelId === PROJECT_MODEL_ID && isRemoveModelOperation(operation) && operation.modelId === projectId),
    );

    // The operation history is the source of truth and is written first; the
    // JSON snapshots below are only a cache derived from it.
    if (!projectRemoved) {
      await this.transactionModel.createTransactions(projectId, transactionsWithEvents);
    }

    for (const [modelId, model] of Object.entries(models)) {
      const { iri, storeName } = splitModelId(modelId);
      const nextData = serializeModelEntities(modelId, model.modelType, model.entities, model.storedData ?? undefined);
      await this.resourceModel.setResourceStoreJson(iri, nextData, storeName);
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
   * The `applyToModel` callback applies the operations of one transaction
   * targeting one model (in order) and returns the entity states before and
   * after them as event contributions; null means the model's events are not
   * recorded. Usually the contributions concern only the targeted model
   * itself, but project model operations contribute the content of the models
   * they remove. It is invoked for the project model up to twice per
   * transaction, see {@link groupTransactionOperations}.
   *
   * The `applyUndo` callback interprets the undo operations of a transaction,
   * which concern all models at once and are therefore applied before the rest
   * of the transaction. It also receives the transactions of this batch
   * processed so far, with their events, as the undo is interpreted against
   * the history. When it is not given, undo operations are only recorded.
   */
  private async buildTransactionsWithEvents(
    transactions: Transaction[],
    applyToModel: (modelId: string, operations: Operation[]) => Promise<ModelEventsContribution[] | null>,
    applyUndo?: (undoOperations: UndoOperation[], processedTransactions: TransactionWithEvents[]) => Promise<ModelEventsContribution[]>,
  ): Promise<TransactionWithEvents[]> {
    const transactionsWithEvents: TransactionWithEvents[] = [];

    for (const transaction of transactions) {
      const upEvents: TransactionEvents = {};
      const downEvents: TransactionEvents = {};

      const collect = (contributions: ModelEventsContribution[] | null) => {
        for (const contribution of contributions ?? []) {
          const changes = diffEntities(contribution.previousEntities, contribution.nextEntities);
          if (changes.length === 0) {
            continue;
          }
          const { up, down } = entityChangesToEvents(changes);
          downEvents[contribution.modelId] = { ...down, ...downEvents[contribution.modelId] };
          if (!contribution.isBlob) {
            upEvents[contribution.modelId] = { ...upEvents[contribution.modelId], ...up };
          }
        }
      };

      const { undoOperations, groups } = groupTransactionOperations(transaction.operations);

      if (undoOperations.length > 0 && applyUndo !== undefined) {
        collect(await applyUndo(undoOperations, transactionsWithEvents));
      }

      for (const [modelId, operations] of groups) {
        collect(await applyToModel(modelId, operations));
      }

      transactionsWithEvents.push({ ...transaction, upEvents, downEvents });
    }

    return transactionsWithEvents;
  }

  /**
   * Brings the resource tree in line with a new state of the project model:
   * resources that are gone from it are deleted, resources it newly lists are
   * created (parents before their children) and changed user metadata is
   * written. Used when the project structure is recomputed rather than reached
   * by operations, i.e. when an undo rewinds it.
   *
   * Restoring the content of the models whose resources are (re)created is up
   * to the caller.
   */
  private async applyProjectStructure(projectId: ModelIdentifier, previous: EntityRecord, next: EntityRecord): Promise<void> {
    // Structural fields follow from the resource tree itself, everything else
    // of a project model entity is the resource's user metadata.
    const userMetadataOf = (entity: Entity): Record<string, unknown> => {
      const { id, type, modelType, subModels, ...userMetadata } = entity as Record<string, unknown> & Entity;
      return userMetadata;
    };

    for (const modelId of Object.keys(previous)) {
      if (next[modelId] === undefined && (await this.resourceModel.getResource(modelId)) !== null) {
        // Deleting a package deletes its sub-resources as well, so a resource
        // may already be gone by the time it is visited.
        await this.resourceModel.deleteResource(modelId);
      }
    }

    const create = async (modelId: ModelIdentifier, parentIri: string): Promise<void> => {
      const entity = next[modelId] as PackageEntity | undefined;
      if (entity === undefined) {
        return;
      }
      if ((await this.resourceModel.getResource(modelId)) === null) {
        await this.resourceModel.createResource(parentIri, modelId, entity.modelType, userMetadataOf(entity));
      }
      for (const subModelId of entity.subModels ?? []) {
        await create(subModelId, modelId);
      }
    };
    await create(projectId, PROJECT_ROOT_IRI);

    for (const [modelId, entity] of Object.entries(next)) {
      const previousEntity = previous[modelId];
      if (previousEntity === undefined) {
        // The resource was created above, with its metadata.
        continue;
      }
      const previousMetadata = userMetadataOf(previousEntity);
      const nextMetadata = userMetadataOf(entity);
      if (deepEqual(previousMetadata, nextMetadata)) {
        continue;
      }
      // The update merges into the stored metadata, so keys that are gone have
      // to be listed as undefined to be dropped.
      const droppedKeys = Object.fromEntries(Object.keys(previousMetadata).map((key) => [key, undefined]));
      await this.resourceModel.updateResource(modelId, { ...droppedKeys, ...nextMetadata });
    }
  }

  /**
   * Collects the current content of every model stored in the subtree of the
   * given resource - for each resource its default "model" store (whose
   * effective content exists even before any data is written, see
   * {@link deserializeModelEntities}) and all named stores. Used to record
   * down events when the subtree is deleted.
   *
   * The `inMemoryStates` (model id to entities) override the stored snapshots
   * with states already modified in memory and may list models whose stores
   * are not persisted yet.
   *
   * Returns the collected non-empty states by model id, and the IRIs of all
   * visited resources.
   */
  private async collectSubtreeModelStates(
    rootIri: string,
    inMemoryStates: Record<ModelIdentifier, EntityRecord>,
  ): Promise<{ states: Record<ModelIdentifier, EntityRecord>; iris: string[] }> {
    const states: Record<ModelIdentifier, EntityRecord> = {};
    const iris: string[] = [];

    const visit = async (iri: string): Promise<void> => {
      const resource = await this.resourceModel.getResource(iri);
      if (resource === null) {
        return;
      }
      iris.push(iri);

      const storeNames = new Set(["model", ...Object.keys(resource.dataStores)]);
      for (const modelId of Object.keys(inMemoryStates)) {
        const split = splitModelId(modelId);
        if (split.iri === iri) {
          storeNames.add(split.storeName);
        }
      }

      for (const storeName of storeNames) {
        const modelId = composeModelId(iri, storeName);
        let entities = inMemoryStates[modelId];
        if (entities === undefined) {
          const data = await this.resourceModel.getResourceStoreJson(iri, storeName);
          entities = deserializeStoredModel(modelId, resource.types[0] ?? "", data) ?? {};
        }
        if (Object.keys(entities).length > 0) {
          states[modelId] = entities;
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

    if (projectId === PROJECT_ROOT_IRI) {
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
   * Whether the resource is a root resource. Root resources belong to no
   * project, so there is no history their changes could be recorded in.
   */
  private async isRootResource(iri: string): Promise<boolean> {
    return (await this.resourceModel.getRootResources()).some((root) => root.iri === iri);
  }

  /**
   * Creates a resource, kept for old clients that manage the resource tree
   * directly. The creation is expressed as the equivalent project model
   * operations executed via {@link applyTransactions} - creating the resource
   * and setting its metadata is interpreted (and recorded in the history) in a
   * single place.
   *
   * A resource created directly under a root is a project, so its creation
   * starts its own history. Only a root resource itself (parent IRI is null)
   * is created directly, as there is no history to record it in.
   *
   * @deprecated Use operations such as {@link CreateModelOperation} or
   * {@link CreateProjectOperation} to create resources instead of this method.
   */
  async createResource(parentIri: string | null, iri: string, type: string, userMetadata: object): Promise<void> {
    if (parentIri === null) {
      return this.resourceModel.createResource(parentIri, iri, type, userMetadata);
    }

    // Preserve the old interface's errors - the operations themselves would
    // treat both cases as "nothing to ensure" and silently skip.
    if ((await this.resourceModel.getResource(iri)) !== null) {
      throw new Error("Cannot create resource because it already exists.");
    }
    const parent = await this.resourceModel.getResource(parentIri);
    if (parent === null || parent.types[0] !== LOCAL_PACKAGE) {
      throw new Error("Cannot create resource because the parent package was not found or is not a package.");
    }

    const { label, description, ...otherMetadata } = userMetadata as Record<string, unknown> & { label?: LanguageString; description?: LanguageString };

    const isProject = await this.isRootResource(parentIri);
    const projectIri = isProject ? iri : (await this.resourceModel.getProjectIri(parentIri))!;

    // A package created directly under the project root is a project and is
    // created the same way new clients create one. Resources under the other
    // roots cannot be expressed by that operation, as it implies the location,
    // so they are created as ordinary models of their own project.
    const createOperation =
      parentIri === PROJECT_ROOT_IRI && type === LOCAL_PACKAGE ? createCreateProjectOperation(iri) : createCreateModelOperation(parentIri, type, iri);
    createOperation.label = label;
    createOperation.description = description;

    const operations: OperationInModel[] = [{ modelId: PROJECT_MODEL_ID, operation: createOperation }];
    if (Object.keys(otherMetadata).length > 0) {
      // Only the label and description are part of the creation operation, the
      // rest of the user metadata is set by a following update.
      // TODO: The project model's own entities (project structure and
      // metadata) have no operations/events recorded yet.
      operations.push({ modelId: PROJECT_MODEL_ID, operation: createUpdateEntityOperation(iri, otherMetadata) });
    }

    await this.applyTransactions(projectIri, [{ id: uuidv4(), operations }]);
  }

  /**
   * Creates resource of type LOCAL_PACKAGE. See {@link createResource}.
   *
   * @deprecated Use operations such as {@link CreateModelOperation} or
   * {@link CreateProjectOperation} applied via {@link applyTransactions}.
   */
  createPackage(parentIri: string | null, iri: string, userMetadata: object): Promise<void> {
    return this.createResource(parentIri, iri, LOCAL_PACKAGE, userMetadata);
  }

  /**
   * Updates user metadata of the resource by merging in the given properties,
   * kept for old clients that manage the resource tree directly. The change is
   * expressed as an update operation on the resource's entry in the project
   * model and executed via {@link applyTransactions}.
   *
   * For model types keeping their label in the model itself rather than in the
   * user metadata, the label is turned into an update operation on that model
   * and removed from the metadata.
   *
   * A root resource has no history its change could be recorded in and is
   * updated directly.
   *
   * @deprecated Use {@link UpdateEntityOperation} applied via
   * {@link applyTransactions} to change a model's metadata.
   */
  async updateResource(resourceId: string, userMetadata: object): Promise<void> {
    // We need to strip userMetadata of properties that do not change.

    const resource = await this.resourceModel.getResource(resourceId);
    if (resource === null) {
      throw new Error(`Resource "${resourceId}" not found.`);
    }

    const projectIri = await this.resourceModel.getProjectIri(resourceId);
    if (projectIri === null) {
      return;
    }

    const currentMetadata: Record<string, unknown> = {...resource.userMetadata};
    const toUpdateOperation = { ...userMetadata };
    const toLegacyResourceMetadata: Record<string, unknown> = { ...userMetadata };

    const operations: OperationInModel[] = [];

    if ("label" in toLegacyResourceMetadata && "label" in toUpdateOperation) {
      const currentModel = await this.getModelEntities(resourceId);
      const labelChanged = !deepEqual((currentModel?.[resourceId] as MainEntity)?.label, toLegacyResourceMetadata.label);

      if (resource.types[0] === RDFS_MODEL) {
        if (labelChanged) {
          const update: Partial<Omit<MainEntity, "id" | "type">> = { label: (toLegacyResourceMetadata.label as LanguageString | undefined) ?? {} };
          operations.push({ modelId: resourceId, operation: createUpdateEntityOperation(resourceId, update) });
        }
        // Label never goes to the resource metadata
        toLegacyResourceMetadata.label = undefined;
        currentMetadata.label = undefined;
      }

      if (!labelChanged) {
        // Label is unchanged, so it won't be updated in the model
        delete toUpdateOperation.label;
      }
    }

    for (const key of Object.keys(toLegacyResourceMetadata)) {
      if (deepEqual(currentMetadata[key], toLegacyResourceMetadata[key])) {
        delete toLegacyResourceMetadata[key];
      }
    }

    if (Object.keys(toLegacyResourceMetadata).length > 0) {
      operations.push({ modelId: PROJECT_MODEL_ID, operation: createUpdateEntityOperation(resourceId, toLegacyResourceMetadata) });
    }

    if (operations.length > 0) {
      await this.applyTransactions(projectIri, [{ id: uuidv4(), operations }]);
    }
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
   *
   * @deprecated Use {@link RemoveModelOperation} applied via
   * {@link applyTransactions} to remove a model.
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
   *
   * @deprecated Use {@link applyTransactions}. The remaining callers are the
   * flows listed above, which have no operations to record.
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

  /**
   * Deletes the named store of the resource WITHOUT recording the change in
   * the operation history.
   *
   * @deprecated Use {@link applyTransactions} to remove the content of a
   * model, or {@link RemoveModelOperation} to remove the model itself.
   */
  deleteResourceStore(iri: string, storeName: string = "model") {
    return this.resourceModel.deleteResourceStore(iri, storeName);
  }
}
