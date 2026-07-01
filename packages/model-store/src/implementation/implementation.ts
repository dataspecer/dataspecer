import { LOCAL_PACKAGE, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { type PackageService } from "@dataspecer/core-v2/project";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Transaction as CoreTransaction, Operation, OperationInModel } from "@dataspecer/core/operation";
import type { ModelEntity } from "@dataspecer/project-model";
import type { ObservableEntityModelStoreChangeEvent } from "../interfaces/observable.ts";
import type { ConnectionStatus, RemoteModelStore } from "../interfaces/remote.ts";
import type { TransactionMetadata, TransactionResult } from "../interfaces/writable.ts";
import { v4 as uuidv4 } from "uuid";
import { UNDO_OPERATION_TYPE, type UndoOperation } from "./base.ts";
import type { UndoRedoState } from "../interfaces/undo-redo.ts";
import type { ProjectModelInModelStore } from "./project-model.ts";

/**
 * Synthetic model type used to register {@link createBlobModel} as the
 * builder for a visual model's companion "svg" blob (id `${visualModelId}#svg`).
 * It is not a real model type stored anywhere.
 */
export const VISUAL_MODEL_SVG_BLOB_TYPE = "#svg";
export interface ApplyOperationResult {
  entityChanges: EntityChange[];
  transactionId: string;
}

/**
 * @internal Interface for communication between DefaultFrontendModelStore and individual models.
 */
export interface ModelInDefaultFrontendModelStore {
  /**
   * Synchronously applies operations to the model and returns what has changed.
   *
   * It is also used for applying undo redo operations.
   */
  applyOperations(transactionId: string, operations: Operation[]): ApplyOperationResult;

  /**
   * Subscribes for asynchronous changes that did not come synchronously from applying operations in this model.
   */
  subscribeForAsyncChanges(listener: (changeEvent: EntityChange[]) => void): () => void;

  /**
   * Instructs model to load. Currently there are two options for loading:
   * - load from backend (set to false)
   * - initialize as empty (set to true)
   * @default false (load from backend)
   */
  load(doNotFetch?: boolean): Promise<void>;

  save(): Promise<void>;

  /**
   * Immutable object (record) containing entities.
   */
  getAllEntities(): EntityRecord;

  //subscribeForReadinessChange(): () => void;
}

export type ModelInModelStoreBuilder = (modelId: ModelIdentifier, context: {
  service: PackageService;
  httpFetch: HttpFetch;
  rootProjectId: ModelIdentifier;
}) => Model & ModelInDefaultFrontendModelStore;

export interface DefaultFrontendModelStoreParams {
  projectId: ModelIdentifier;

  /**
   * Builder of the main project model that reads the project structure and
   * based on that creates other models.
   */
  projectModelBuilder: ModelInModelStoreBuilder;

  /**
   * Individual builders for each model type. If there is no builder for given
   * model type, the model store will not subscribe to that model.
   */
  modelBuilders: Record<string, ModelInModelStoreBuilder>;

  packageService: PackageService;

  httpFetch: HttpFetch;
}

/**
 * Transaction that is executed on the model store.
 */
interface Transaction extends CoreTransaction {
  metadata: TransactionMetadata;

  /**
   * Whether this transaction contains an operation on the project model (i.e.
   * it creates or removes a model). Such transactions are not added to the
   * undo/redo stack for simplicity of implementation.
   */
  touchesProjectModel: boolean;
}

/**
 * This wont store data of individual models.
 * This will only manage synchronization via operations and model readiness.
 * The clearest implementation should simply do writing and ignore the actual entities.
 */
export class DefaultFrontendModelStore implements RemoteModelStore {
  /**
   * As all models, also the project model has to have some id. Unfortunately,
   * the ID of the project model cannot be set to the projectId because the
   * project is model itself and thus it would conflict. In some sense, the
   * project model must have some fixed id because this, together with the
   * project ID, are the only two information you need to get the rest of data.
   */
  public readonly projectModelId: ModelIdentifier = "_project_model";

  /**
   * Main project id (root package id) that this model store is connected to.
   */
  protected rootProjectId: ModelIdentifier;

  protected service: PackageService;

  protected projectModelBuilder: ModelInModelStoreBuilder;
  protected modelBuilders: Record<string, ModelInModelStoreBuilder>;

  protected subscribers: ((event: ObservableEntityModelStoreChangeEvent) => void)[] = [];

  /**
   * All models that are subscribed to. This includes the main project model
   * that this model store is subscribed to and create other models.
   */
  protected models: Record<string, ModelInDefaultFrontendModelStore> = {};
  protected httpFetch: HttpFetch;

  /**
   * Ids of regular transactions that can be undone.
   */
  private transactionIdsToUndoStack: string[] = [];

  /**
   * Ids of undo operations that can be undone, thus redone.
   */
  private transactionIdsToRedoStack: string[] = [];

  /**
   * Ids of models in {@link models} that were removed from the project
   * structure (via {@link RemoveModelOperation}, or by undoing the operation
   * that created them) and are thus currently inactive.
   *
   * The model instance itself is intentionally never removed from
   * {@link models} - it is kept around (together with its undo/redo snapshots)
   * so that re-creating it (by undoing its removal, or redoing its creation)
   * can restore its exact previous state instead of starting over from an empty
   * model.
   */
  protected inactiveModelIds: Set<ModelIdentifier> = new Set();

  /**
   * Creates a model store that is connected to the backend to the specific
   * package by its id. It subscribes to the following models.
   */
  constructor(params: DefaultFrontendModelStoreParams) {
    this.service = params.packageService;
    this.rootProjectId = params.projectId;
    this.projectModelBuilder = params.projectModelBuilder;
    this.modelBuilders = { ...params.modelBuilders };
    this.httpFetch = params.httpFetch;
  }
  loadByOverride(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getAllEntities(): Record<ModelIdentifier, EntityRecord> {
    const allEntities: Record<ModelIdentifier, EntityRecord> = {};
    for (const modelId in this.models) {
      if (this.inactiveModelIds.has(modelId)) {
        // Model was removed from the project structure, ignore it.
        continue;
      }
      const model = this.models[modelId]!;
      allEntities[modelId] = model.getAllEntities();
    }
    return allEntities;
  }

  /**
   * Helper method to build an internal model as part of this Model Store that
   * tracks one of the project's model.
   * @param modelType null for project model
   */
  protected buildModel(modelId: ModelIdentifier, modelType: string | null) {
    const context = {
      service: this.service,
      httpFetch: this.httpFetch,
      rootProjectId: this.rootProjectId,
    };
    const builder = modelType === null
      ? this.projectModelBuilder
      : this.modelBuilders[modelType];
    if (!builder) {
      return null;
    }
    const model = builder(modelId, context);
    this.models[modelId] = model;
    return model;
  }

  /**
   * Loads everything
   */
  async initialize(): Promise<void> {
    const projectModel = this.buildModel(this.projectModelId, null)!;
    projectModel.subscribeForAsyncChanges((changes) => this.onProjectModelEntityChange(changes));
    await projectModel.load();
  }

  protected modelPromises: Promise<void>[] = [];

  async waitForModelsToLoad(): Promise<void> {
    await Promise.all(this.modelPromises);
  }

  /**
   * This method listens on changes in the project model and create/deletes
   * other models based on that.
   */
  protected onProjectModelEntityChange(changedEntities: EntityChange[]): void {
    const entityChanges: Record<ModelIdentifier, EntityChange[]> = {};
    this.applyProjectStructureChanges(changedEntities, entityChanges, false);
    if (Object.keys(entityChanges).length > 0) {
      this.internalNotifyEntityChange({ entityChanges });
    }
  }

  /**
   * Reacts to changes in project structure and updates the models and their
   * data.
   *
   * @param entityChanges Mutable object of entities in individual models that
   * were changed.
   * @param isLocalChange Set to true if the change is local and thus potential
   * models do not exist on backend.
   */
  protected applyProjectStructureChanges(
    structuralChanges: EntityChange[],
    entityChanges: Record<ModelIdentifier, EntityChange[]>,
    isLocalChange: boolean,
  ): void {
    for (const change of structuralChanges) {
      if (change.previous === null) {
        // New model was created
        const modelEntity = change.next as ModelEntity;
        this.activateModel(modelEntity.id, modelEntity.modelType, isLocalChange, entityChanges);
        if (modelEntity.modelType === VISUAL_MODEL) {
          // A visual model may have an additional "svg" blob attached to it.
          // It is tracked as its own companion model, analogous to how the
          // default "model" blob is tracked.
          this.activateModel(`${modelEntity.id}${VISUAL_MODEL_SVG_BLOB_TYPE}`, VISUAL_MODEL_SVG_BLOB_TYPE, isLocalChange, entityChanges);
        }
      } else if (change.next === null) {
        // Model was deleted
        const modelEntity = change.previous as ModelEntity;
        this.deactivateModel(modelEntity.id, entityChanges);

        if (modelEntity.modelType === VISUAL_MODEL) {
          this.deactivateModel(`${modelEntity.id}${VISUAL_MODEL_SVG_BLOB_TYPE}`, entityChanges);
        }
      } else {
        // Model metadata changes (e.g. label) are ignored, there is no need to react on them.
      }
    }
  }

  /**
   * Ensures the model with the given id is active, building (or reusing) and
   * subscribing to it as needed, and records its appearance into
   * `entityChanges`.
   */
  private activateModel(
    modelId: ModelIdentifier,
    modelType: string,
    createFresh: boolean,
    entityChanges: Record<ModelIdentifier, EntityChange[]>,
  ): void {
    let model = this.models[modelId];

    if (!model) {
      // First time we see this model - build and subscribe to it.
      const createdModel = this.buildModel(modelId, modelType);
      if (!createdModel) {
        // This model is not meant to be subscribed to, ignore it.
        return;
      }
      model = createdModel;

      model.subscribeForAsyncChanges(modelChanges => {
        this.internalNotifyEntityChange({ entityChanges: { [modelId]: modelChanges } });
      });

      this.modelPromises.push(model.load(createFresh));

      return;
    }

    if (!this.inactiveModelIds.has(modelId)) {
      // The model is already active, nothing to do.
      return;
    }

    // The model already existed (it was previously deactivated) - reactivate
    // it. It already retains its previous entities (and undo/redo history),
    // so we only need to report them as visible again.
    this.inactiveModelIds.delete(modelId);
    this.appendEntityChanges(
      entityChanges,
      modelId,
      Object.values(model.getAllEntities()).map((entity) => ({ previous: null, next: entity }))
    );
  }

  /**
   * Deactivates the model with the given id (if it exists and is currently
   * active) and records the disappearance of all of its entities into
   * `entityChanges`. The model instance itself is preserved.
   */
  private deactivateModel(modelId: ModelIdentifier, entityChanges: Record<ModelIdentifier, EntityChange[]>): void {
    const model = this.models[modelId];
    if (!model || this.inactiveModelIds.has(modelId)) {
      return;
    }

    this.inactiveModelIds.add(modelId);
    this.appendEntityChanges(
      entityChanges,
      modelId,
      Object.values(model.getAllEntities()).map((entity) => ({ previous: entity, next: null }))
    );
  }

  /**
   * Appends `changes` to the entries already recorded for `modelId` in
   * `entityChanges`, if any.
   */
  private appendEntityChanges(
    entityChanges: Record<ModelIdentifier, EntityChange[]>,
    modelId: ModelIdentifier,
    changes: EntityChange[],
  ): void {
    if (changes.length > 0) {
      entityChanges[modelId] = [...(entityChanges[modelId] ?? []), ...changes];
    }
  }

  getModel(id: ModelIdentifier | null | undefined): Model | null {
    throw new Error("Method not implemented.");
  }
  getConnectionStatus(): ConnectionStatus {
    throw new Error("Method not implemented.");
  }
  subscribeToConnectionStatus(update: (status: ConnectionStatus) => void): () => void {
    throw new Error("Method not implemented.");
  }

  /**
   * List of operations (grouped into transactions) that were executed on
   * models.
   */
  protected transactions: Transaction[] = [];

  /**
   * Current transaction that is being executed. null if there is no transaction.
   *
   * @see addOperationForTransaction
   */
  protected currentTransaction: Transaction | null = null;

  /**
   * Comparator that sorts the project model's id first, leaving the relative
   * order of all other ids unchanged. Used so that the project model's
   * operations are always processed first within a transaction, see
   * {@link addOperationForTransaction} and {@link undoRedo}.
   */
  private compareProjectModelFirst = (a: ModelIdentifier, b: ModelIdentifier): number =>
    a === this.projectModelId ? -1 : b === this.projectModelId ? 1 : 0;

  /**
   * Allows executing a set of operations by calling this method multiple times
   * and then committing them all at once.
   */
  addOperationForTransaction(operations: OperationInModel[]): void {
    // Start transaction if there is no transaction yet.
    if (!this.currentTransaction) {
      this.currentTransaction = {
        id: uuidv4(),
        metadata: {},
        operations: [],
        touchesProjectModel: false,
      };
    }
    this.currentTransaction.operations.push(...operations);
    if (operations.some((operation) => operation.modelId === this.projectModelId)) {
      this.currentTransaction.touchesProjectModel = true;
    }
    const transactionId = this.currentTransaction.id;

    // Changes made in this transaction
    const entityChanges: Record<ModelIdentifier, EntityChange[]> = {};

    // Todo maybe group by is not ideal because in one transaction, we might need to create new model or delete model after/before applying some operations.
    const groupedOperations = Object.groupBy(operations, (operation) => operation.modelId);

    // The project model is processed first so that models it creates (or
    // removes) within this same transaction are already active (or
    // deactivated) by the time operations targeting them directly are
    // processed below.
    const modelIds = Object.keys(groupedOperations).sort(this.compareProjectModelFirst);

    for (const modelId of modelIds) {
      const thisModelOperations = groupedOperations[modelId]!;
      const pureOperations = thisModelOperations.map((operation) => operation.operation);

      const model = this.models[modelId];
      if (!model || this.inactiveModelIds.has(modelId)) {
        console.error(`Model ${modelId} does not exist or is not active. Operations will be ignored!`);
        continue;
      }

      const changes = model.applyOperations(transactionId, pureOperations);
      if (changes.entityChanges.length !== 0) {
        entityChanges[modelId] = changes.entityChanges;
      }

      if (modelId === this.projectModelId) {
        // React to models being created/removed in the project structure.
        this.applyProjectStructureChanges(changes.entityChanges, entityChanges, true);
      }
    }

    this.internalNotifyEntityChange({ entityChanges });
  }

  undo(): TransactionResult | null {
    return this.undoRedo(true);
  }

  redo(): TransactionResult | null {
    return this.undoRedo(false);
  }

  getUndoRedoState(): UndoRedoState {
    return {
      canUndo: this.transactionIdsToUndoStack.length > 0,
      canRedo: this.transactionIdsToRedoStack.length > 0,
    };
  }

  protected undoRedoSubscribers: Set<(state: UndoRedoState) => void> = new Set();

  subscribeToUndoRedoState(listener: (state: UndoRedoState) => void): () => void {
    this.undoRedoSubscribers.add(listener);
    return () => this.undoRedoSubscribers.delete(listener);
  }

  protected lastUndoRedoState: UndoRedoState | null = null;
  protected notifyUndoRedoSubscribers(): void {
    const newState = this.getUndoRedoState();
    if (this.lastUndoRedoState === null || this.lastUndoRedoState.canUndo !== newState.canUndo || this.lastUndoRedoState.canRedo !== newState.canRedo) {
      this.lastUndoRedoState = newState;
      for (const listener of this.undoRedoSubscribers) {
        listener(newState);
      }
    }
  }

  private undoRedo(isUndoNotRedo: boolean): TransactionResult | null {
    if (this.currentTransaction) {
      throw new Error("Cannot undo/redo while there is an ongoing transaction!");
    }

    const transactionIdToUndo = (isUndoNotRedo ? this.transactionIdsToUndoStack : this.transactionIdsToRedoStack).pop();
    if (!transactionIdToUndo) {
      // There is nothing to undo, just return.
      return null;
    }
    const transactionToRevert = this.transactions.find((transaction) => transaction.id === transactionIdToUndo)!;

    // This undo transaction
    const transactionId = uuidv4();

    // Changes made in this transaction
    const entityChanges: Record<ModelIdentifier, EntityChange[]> = {};

    // The project model is processed first, analogous to addOperationForTransaction.
    const affectedModels = [...new Set(transactionToRevert.operations.map((operation) => operation.modelId))].sort(this.compareProjectModelFirst);

    const allOperations: OperationInModel<UndoOperation>[] = [];
    for (const modelId of affectedModels) {
      const model = this.models[modelId];
      if (!model) {
        // Model may not be present here, this is absolutely ok.
        continue;
      }

      const undoOperation = {
        id: uuidv4(),
        type: UNDO_OPERATION_TYPE,
        cancelTransactionId: transactionToRevert.id,
      } satisfies UndoOperation;
      allOperations.push({
        modelId,
        operation: undoOperation,
      });

      const changes = model.applyOperations(transactionId, [undoOperation]);
      entityChanges[modelId] = changes.entityChanges;

      if (modelId === this.projectModelId) {
        // React to models being created/removed in the project structure (e.g.
        // undoing the creation of a model deactivates it, undoing the removal
        // of a model reactivates it with its previous state intact).
        this.applyProjectStructureChanges(changes.entityChanges, entityChanges, true);
      }
    }

    // Handle undo/redo stacks
    (isUndoNotRedo ? this.transactionIdsToRedoStack : this.transactionIdsToUndoStack).push(transactionId);

    this.transactions.push({
      id: transactionId,
      metadata: {},
      operations: allOperations,
      // Transactions reachable from the undo/redo stacks never touch the
      // project model, see commitTransaction.
      touchesProjectModel: false,
    });

    this.internalNotifyEntityChange({ entityChanges });

    this.notifyUndoRedoSubscribers();
    this.notifyTransactionCommitSubscribers();
    return {
      transactionId,
      confirmation: Promise.resolve({}),
    };
  }

  protected transactionConfirmations: ((value: {}) => void)[] = [];

  /**
   * Commits all operations added via {@link addOperationForTransaction}.
   */
  commitTransaction(metadata: TransactionMetadata): TransactionResult {
    if (!this.currentTransaction) {
      throw new Error("There is no transaction to commit!");
    }

    const transaction = this.currentTransaction;
    transaction.metadata = metadata;

    this.transactions.push(transaction);
    this.currentTransaction = null;

    // Handle undo/redo stacks

    if (transaction.touchesProjectModel) {
      // Undoing/redoing the creation or removal of a model would require
      // un-creating/un-removing the corresponding resource on the backend,
      // which is not supported yet. Invalidate the whole undo/redo history
      // instead, so the project model is never asked to undo/redo such a
      // change.
      this.transactionIdsToUndoStack = [];
    } else {
      this.transactionIdsToUndoStack.push(transaction.id);
    }
    this.transactionIdsToRedoStack = [];
    this.notifyUndoRedoSubscribers();
    this.notifyTransactionCommitSubscribers();

    const confirmation = new Promise<{}>(resolve => this.transactionConfirmations.push(resolve));

    return {
      transactionId: transaction.id,
      confirmation,
    }
  }

  protected transactionCommitSubscribers: Set<() => void> = new Set();

  /**
   * Subscribes to be notified every time a transaction is fully applied, i.e.
   * after {@link commitTransaction}, {@link undo} or {@link redo}. This is
   * useful for example to trigger a save of the changed models.
   *
   * Unlike {@link subscribeToEntityChanges}, this does not fire for
   * intermediate calls to {@link addOperationForTransaction} that are part of
   * a not yet committed transaction.
   */
  subscribeToTransactionCommit(listener: () => void): () => void {
    this.transactionCommitSubscribers.add(listener);
    return () => this.transactionCommitSubscribers.delete(listener);
  }

  protected notifyTransactionCommitSubscribers(): void {
    for (const listener of this.transactionCommitSubscribers) {
      listener();
    }
  }

  /**
   * Use this to perform operations.
   */
  transaction(operations: OperationInModel[], metadata: TransactionMetadata): TransactionResult {
    this.addOperationForTransaction(operations);
    return this.commitTransaction(metadata);
  }

  protected internalNotifyEntityChange(entityChaneEvent: ObservableEntityModelStoreChangeEvent): void {
    for (const listener of this.subscribers) {
      listener(entityChaneEvent);
    }
  }

  subscribeToEntityChanges(listener: (entityChaneEvent: ObservableEntityModelStoreChangeEvent) => void): () => void {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter((l) => l !== listener);
    }
  }

  /**
   * Saves all models that support saving and were changed since the last
   * save (or load). Models that do not support saving (currently the
   * virtual project model) are skipped.
   */
  async saveByOverride(): Promise<void> {
    await this.synchronizeProjectStructureWithBackend();

    const savePromises: Promise<void>[] = [];
    for (const modelId in this.models) {
      if (modelId === this.projectModelId) {
        // The project model is virtual and does not support saving yet.
        continue;
      }
      if (this.inactiveModelIds.has(modelId)) {
        // Model was removed from the project structure, nothing to save.
        continue;
      }
      savePromises.push(this.models[modelId]!.save());
    }
    await Promise.all(savePromises);
    this.transactionConfirmations.forEach((resolve) => resolve({}));
    this.transactionConfirmations = [];
  }

  /**
   * Creates and removes the backend resources for models that were locally
   * created/removed in the project structure since the last save. Once a
   * model is created on the backend, the regular save loop in
   * {@link saveByOverride} is responsible for storing its actual data.
   */
  protected async synchronizeProjectStructureWithBackend(): Promise<void> {
    const projectModel = this.models[this.projectModelId] as ProjectModelInModelStore;

    const { creations, deletions } = projectModel.takePendingStructuralChanges();

    // Created sequentially (in the order they happened) so that a parent
    // package always exists on the backend before its children are created.
    for (const creation of creations) {
      if (creation.modelType === LOCAL_PACKAGE) {
        await this.service.createPackage(creation.parentPackageId, { iri: creation.modelId, userMetadata: {}, });
      } else {
        await this.service.createResource(creation.parentPackageId, { iri: creation.modelId, type: creation.modelType, userMetadata: {} });
      }
    }

    for (const modelId of deletions) {
      await this.service.deleteResource(modelId);
    }
  }
}
