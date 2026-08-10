import { VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { type PackageService } from "@dataspecer/core-v2/project";
import { type Entity, type EntityChange, type EntityIdentifier, type EntityRecord } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { createUndoOperation, type Transaction as CoreTransaction, type Operation, type OperationInModel } from "@dataspecer/core/operation";
import { getReusedProjectIds, isCreateModelOperation, isPackageEntity, type CreateModelOperation, type ProjectModelEntity } from "@dataspecer/core/project-model";
import { v4 as uuidv4 } from "uuid";
import type { ObservableEntityModelStoreChangeEvent } from "../interfaces/observable.ts";
import type { ConnectionStatus, RemoteModelStore } from "../interfaces/remote.ts";
import type { UndoRedoState } from "../interfaces/undo-redo.ts";
import type { TransactionMetadata, TransactionResult } from "../interfaces/writable.ts";
import type { ModelInModelStore, StateResult } from "./interface.ts";
import { getModelMetadata } from "./metadata.ts";
import type { ProjectModelInModelStore } from "./project-model.ts";

/**
 * Synthetic model type used to register {@link createBlobModel} as the
 * builder for a visual model's companion "svg" blob (id `${visualModelId}#svg`).
 * It is not a real model type stored anywhere.
 */
export const VISUAL_MODEL_SVG_BLOB_TYPE = "#svg";

export interface ModelInModelStoreContext {
  service: PackageService;
  httpFetch: HttpFetch;
  rootProjectId: ModelIdentifier;
}

export type ModelInModelStoreBuilder = (modelId: ModelIdentifier, context: ModelInModelStoreContext) => ModelInModelStore;

export interface DefaultFrontendModelStoreParams {
  projectId: ModelIdentifier;

  /**
   * Builder of the main project model that reads the project structure and
   * based on that creates other models.
   */
  projectModelBuilder: (modelId: ModelIdentifier, context: ModelInModelStoreContext) => ProjectModelInModelStore;

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
}

/**
 * Model tracked by the model store together with the state the store manages
 * for it.
 */
interface TrackedModel {
  model: ModelInModelStore;

  coreState: EntityRecord;
  outputState: EntityRecord;

  /**
   * Models that were removed from the project structure are inactive. Such a
   * model is intentionally kept (together with its state) so that bringing it
   * back by undo or redo restores its exact previous state.
   */
  active: boolean;
}

/**
 * Core states of the models a transaction changed, as they were before the
 * transaction. Restoring them cancels the transaction.
 */
interface StateSnapshot {
  /**
   * Transaction that is cancelled by restoring the states.
   */
  transactionId: string;

  states: Record<ModelIdentifier, EntityRecord>;
}

/**
 * Models that are created by the operations of the transaction that is
 * currently being applied. Initial operations of such models are merged into
 * the operations of the transaction, so that they are recorded and applied with
 * it.
 */
interface LocalCreation {
  createOperations: Map<ModelIdentifier, CreateModelOperation>;
  operations: Record<ModelIdentifier, Operation[]>;
}

/**
 * Adds entity changes to the existing entity changes per model record. Takes
 * the ownership of the given array.
 */
function appendEntityChanges(entityChanges: Record<ModelIdentifier, EntityChange[]>, modelId: ModelIdentifier, changes: EntityChange[]): void {
  if (changes.length === 0) {
    return;
  }
  const existingChanges = entityChanges[modelId];
  if (existingChanges === undefined) {
    entityChanges[modelId] = changes;
  } else {
    existingChanges.push(...changes);
  }
}

function entitiesAsCreated(entities: EntityRecord): EntityChange[] {
  return Object.values(entities).map((entity) => ({ previous: null, next: entity }));
}

function entitiesAsRemoved(entities: EntityRecord): EntityChange[] {
  return Object.values(entities).map((entity) => ({ previous: entity, next: null }));
}

/**
 * Model store that owns the state of all models in the project. Individual
 * models only interpret operations and compute their state. The store then
 * manages synchronization via operations, undo/redo and change notifications.
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

  protected service: PackageService;

  protected projectModelBuilder: DefaultFrontendModelStoreParams["projectModelBuilder"];
  protected modelBuilders: Record<string, ModelInModelStoreBuilder>;

  protected modelContext: ModelInModelStoreContext;

  protected subscribers: ((event: ObservableEntityModelStoreChangeEvent) => void)[] = [];

  /**
   * Used for initialization only. This contains all promises of models that are being loaded.
   */
  protected modelPromises: Promise<void>[] = [];

  /**
   * All models that are tracked. This includes the main project model that
   * creates the other models.
   */
  protected models: Record<ModelIdentifier, TrackedModel> = {};

  /**
   * Main project model, available after {@link initialize}.
   */
  protected projectModel!: ProjectModelInModelStore;

  /**
   * Output states of active models, i.e. what is reported to the user.
   */
  private activeEntities: Record<ModelIdentifier, EntityRecord> = {};

  /**
   * Immutable snapshot of {@link activeEntities}, invalidated on every change.
   */
  private activeEntitiesSnapshot: Record<ModelIdentifier, EntityRecord> | null = null;

  private undoStack: StateSnapshot[] = [];
  private redoStack: StateSnapshot[] = [];

  /**
   * Creates a model store that is connected to the backend to the specific
   * package by its id. It subscribes to the following models.
   */
  constructor(params: DefaultFrontendModelStoreParams) {
    this.service = params.packageService;
    this.projectModelBuilder = params.projectModelBuilder;
    this.modelBuilders = { ...params.modelBuilders };
    this.modelContext = {
      service: params.packageService,
      httpFetch: params.httpFetch,
      rootProjectId: params.projectId,
    };
  }

  async loadByOverride(): Promise<void> {
    await this.initialize();
    await this.waitForModelsToLoad();
  }

  getAllEntities(): Record<ModelIdentifier, EntityRecord> {
    return (this.activeEntitiesSnapshot ??= { ...this.activeEntities });
  }

  getEntity(modelId: ModelIdentifier, entityId: EntityIdentifier): Entity | null {
    return this.activeEntities[modelId]?.[entityId] ?? null;
  }

  /**
   * Loads everything
   */
  async initialize(): Promise<void> {
    this.projectModel = this.projectModelBuilder(this.projectModelId, this.modelContext);
    this.trackModel(this.projectModelId, this.projectModel);
    this.updateModelState(this.projectModelId, this.projectModel.setState(await this.projectModel.getRemoteState()));
  }

  async waitForModelsToLoad(): Promise<void> {
    await Promise.all(this.modelPromises);
  }

  /**
   * Starts tracking the model, with an empty state.
   */
  private trackModel(modelId: ModelIdentifier, model: ModelInModelStore): void {
    this.models[modelId] = {
      model,
      coreState: {},
      outputState: {},
      active: true,
    };
    this.activeEntities[modelId] = {};
    this.activeEntitiesSnapshot = null;

    model.subscribeForAsyncChanges((stateResult) => this.updateModelState(modelId, stateResult));
  }

  /**
   * Helper method to build an internal model as part of this Model Store that
   * tracks one of the project's model. Returns null if there is no builder for
   * the given model type, i.e. the model is not meant to be tracked.
   */
  protected buildModel(modelId: ModelIdentifier, modelType: string): ModelInModelStore | null {
    const builder = this.modelBuilders[modelType];
    if (!builder) {
      return null;
    }
    const model = builder(modelId, this.modelContext);
    model.modelStore = this;
    this.trackModel(modelId, model);
    return model;
  }

  /**
   * Records the new state of the model, reacts to project structure changes and
   * notifies subscribers.
   */
  private updateModelState(modelId: ModelIdentifier, stateResult: StateResult): void {
    const entityChanges: Record<ModelIdentifier, EntityChange[]> = {};
    this.setModelState(modelId, stateResult, entityChanges);
    if (modelId === this.projectModelId) {
      this.applyProjectStructureChanges(stateResult.diff, entityChanges, null);
    }
    this.notifyEntityChanges(entityChanges);
  }

  /**
   * Records the new state of the model and collects the reported changes.
   * Changes of inactive models are not reported as their entities are hidden.
   */
  private setModelState(modelId: ModelIdentifier, stateResult: StateResult, entityChanges: Record<ModelIdentifier, EntityChange[]>): void {
    const tracked = this.models[modelId];
    tracked.coreState = stateResult.coreState;
    tracked.outputState = stateResult.outputState;

    if (!tracked.active) {
      return;
    }
    this.activeEntities[modelId] = stateResult.outputState;
    this.activeEntitiesSnapshot = null;
    appendEntityChanges(entityChanges, modelId, stateResult.diff);
  }

  /**
   * Loads the state of the model from the backend and reports it.
   */
  private async loadModel(modelId: ModelIdentifier): Promise<void> {
    const model = this.models[modelId].model;
    const state = await model.getRemoteState();
    this.updateModelState(modelId, model.setState(state));
  }

  /**
   * Reacts to changes in project structure and activates or deactivates the
   * models accordingly.
   *
   * @param localCreation Models created by the current transaction, null if the
   * change does not come from operations applied right now.
   */
  protected applyProjectStructureChanges(
    structuralChanges: EntityChange[],
    entityChanges: Record<ModelIdentifier, EntityChange[]>,
    localCreation: LocalCreation | null,
  ): void {
    for (const change of structuralChanges) {
      if (change.previous === null) {
        // New model was created
        const modelEntity = change.next as ProjectModelEntity;
        this.activateModel(modelEntity.id, modelEntity.modelType, localCreation, entityChanges);

        if (modelEntity.modelType === VISUAL_MODEL) {
          // A visual model may have an additional "svg" blob attached to it.
          // It is tracked as its own companion model, analogous to how the
          // default "model" blob is tracked. It is created by the very same
          // operation as the visual model itself.
          const svgModelId = `${modelEntity.id}${VISUAL_MODEL_SVG_BLOB_TYPE}`;
          const createOperation = localCreation?.createOperations.get(modelEntity.id);
          if (createOperation) {
            localCreation!.createOperations.set(svgModelId, { ...createOperation, modelId: svgModelId, modelType: VISUAL_MODEL_SVG_BLOB_TYPE });
          }
          this.activateModel(svgModelId, VISUAL_MODEL_SVG_BLOB_TYPE, localCreation, entityChanges);
        }
      } else if (change.next === null) {
        // Model was deleted
        const modelEntity = change.previous as ProjectModelEntity;
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
   * Ensures the model with the given id is tracked and active, and reports its
   * entities as appeared. A model that is created by the current transaction
   * starts empty and gets its initial operations recorded, any other model is
   * loaded from the backend.
   */
  private activateModel(
    modelId: ModelIdentifier,
    modelType: string,
    localCreation: LocalCreation | null,
    entityChanges: Record<ModelIdentifier, EntityChange[]>,
  ): void {
    const tracked = this.models[modelId];

    if (tracked) {
      if (tracked.active) {
        return;
      }
      tracked.active = true;
      this.activeEntities[modelId] = tracked.outputState;
      this.activeEntitiesSnapshot = null;
      appendEntityChanges(entityChanges, modelId, entitiesAsCreated(tracked.outputState));
      return;
    }

    const model = this.buildModel(modelId, modelType);
    if (!model) {
      // This model is not meant to be tracked, ignore it.
      return;
    }

    const createOperation = localCreation?.createOperations.get(modelId);
    if (!createOperation) {
      this.modelPromises.push(this.loadModel(modelId));
    }
  }

  /**
   * Deactivates the model with the given id (if it is tracked and currently
   * active) and reports its entities as gone. The state of the model is
   * preserved.
   */
  private deactivateModel(modelId: ModelIdentifier, entityChanges: Record<ModelIdentifier, EntityChange[]>): void {
    const tracked = this.models[modelId];
    if (!tracked || !tracked.active) {
      return;
    }

    tracked.active = false;
    delete this.activeEntities[modelId];
    this.activeEntitiesSnapshot = null;
    appendEntityChanges(entityChanges, modelId, entitiesAsRemoved(tracked.outputState));
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
   * Number of leading entries of {@link transactions} whose operations were
   * already uploaded to the backend.
   */
  private uploadedTransactionCount: number = 0;

  /**
   * Current transaction that is being executed. null if there is no transaction.
   *
   * @see addOperationForTransaction
   */
  protected currentTransaction: Transaction | null = null;

  /**
   * Core states of the models before the current transaction changed them.
   *
   * @see StateSnapshot
   */
  private currentTransactionStates: Record<ModelIdentifier, EntityRecord> = {};

  /**
   * Allows executing a set of operations by calling this method multiple times
   * and then committing them all at once.
   *
   * @deprecated This method is intended to be used only by legacy clients.
   * Please use {@link transaction} instead.
   */
  addOperationForTransaction(operations: OperationInModel[]): void {
    // Start transaction if there is no transaction yet.
    const transaction = (this.currentTransaction ??= {
      id: uuidv4(),
      time: new Date().toISOString(),
      metadata: {},
      operations: [],
    });

    const operationsByModel: Record<ModelIdentifier, Operation[]> = {};
    for (const operationInModel of operations) {
      (operationsByModel[operationInModel.modelId] ??= []).push(operationInModel.operation);
    }

    // Changes made in this transaction
    const entityChanges: Record<ModelIdentifier, EntityChange[]> = {};

    // The project model is processed first so that models it creates (or
    // removes) within this same transaction are already active (or
    // deactivated) by the time operations targeting them directly are
    // processed below.
    const projectOperations = operationsByModel[this.projectModelId];
    if (projectOperations) {
      delete operationsByModel[this.projectModelId];

      const localCreation: LocalCreation = { createOperations: new Map(), operations: operationsByModel };
      for (const operation of projectOperations) {
        if (isCreateModelOperation(operation)) {
          localCreation.createOperations.set(operation.modelId, operation);
        }
      }

      const stateResult = this.applyOperations(this.projectModelId, projectOperations, transaction, entityChanges);
      if (stateResult) {
        // React to models being created/removed in the project structure.
        this.applyProjectStructureChanges(stateResult.diff, entityChanges, localCreation);
      }
    }

    // The operations are recorded in the order they are applied, so that the
    // initial operations of models created by the project model are recorded
    // before operations targeting them.
    for (const modelId in operationsByModel) {
      this.applyOperations(modelId, operationsByModel[modelId], transaction, entityChanges);
    }

    this.notifyEntityChanges(entityChanges);
  }

  /**
   * Records the operations as a part of the transaction and applies them to the
   * model. Returns null when the model is not tracked or is not active, in
   * which case the operations are only recorded.
   */
  private applyOperations(
    modelId: ModelIdentifier,
    operations: Operation[],
    transaction: Transaction,
    entityChanges: Record<ModelIdentifier, EntityChange[]>,
  ): StateResult | null {
    if (operations.length === 0) {
      return null;
    }
    transaction.operations.push(...operations.map((operation) => ({ modelId, operation })));

    const tracked = this.models[modelId];
    if (!tracked || !tracked.active) {
      console.warn(`Model ${modelId} does not exist locally or is not active. Its operations are only recorded, not applied locally.`);
      return null;
    }

    this.currentTransactionStates[modelId] ??= tracked.coreState;

    const stateResult = tracked.model.applyOperationAndSetState(operations);
    this.setModelState(modelId, stateResult, entityChanges);
    return stateResult;
  }

  undo(): TransactionResult | null {
    return this.undoRedo(true);
  }

  redo(): TransactionResult | null {
    return this.undoRedo(false);
  }

  getUndoRedoState(): UndoRedoState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
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

    const snapshot = (isUndoNotRedo ? this.undoStack : this.redoStack).pop();
    if (!snapshot) {
      // There is nothing to undo, just return.
      return null;
    }

    // This undo transaction
    const transactionId = uuidv4();

    // The current states are what the opposite operation (redo of this undo,
    // or undo of this redo) restores.
    const states: Record<ModelIdentifier, EntityRecord> = {};
    for (const modelId in snapshot.states) {
      states[modelId] = this.models[modelId].coreState;
    }
    (isUndoNotRedo ? this.redoStack : this.undoStack).push({ transactionId, states });

    this.transactions.push({
      id: transactionId,
      time: new Date().toISOString(),
      metadata: {},
      // The undo cancels the transaction as a whole, in every model it
      // touched, so it is recorded once and dispatched to the project model.
      // The backend interprets it using the recorded history.
      operations: [{ modelId: this.projectModelId, operation: createUndoOperation(snapshot.transactionId) }],
    });

    this.notifyEntityChanges(this.restoreStates(snapshot.states));

    this.notifyUndoRedoSubscribers();
    this.notifyTransactionCommitSubscribers();
    // The undo transaction is uploaded on the next save like any other
    // transaction, so its confirmation goes through the same queue.
    return {
      transactionId,
      confirmation: this.createConfirmation(),
    };
  }

  /**
   * Sets the given core states back to the models. The project model goes first
   * so that models it brings back (or hides) are handled before their own state
   * is restored.
   */
  private restoreStates(states: Record<ModelIdentifier, EntityRecord>): Record<ModelIdentifier, EntityChange[]> {
    const entityChanges: Record<ModelIdentifier, EntityChange[]> = {};

    const projectState = states[this.projectModelId];
    if (projectState) {
      const stateResult = this.projectModel.setState(projectState);
      this.setModelState(this.projectModelId, stateResult, entityChanges);
      this.applyProjectStructureChanges(stateResult.diff, entityChanges, null);
    }

    for (const modelId in states) {
      if (modelId === this.projectModelId) {
        continue;
      }
      const tracked = this.models[modelId];
      if (!tracked.active) {
        // The model is not part of the project structure anymore - possibly
        // because the project model was just restored, which already reported
        // its entities as gone. Its state is kept as it is so that the opposite
        // operation can bring the model back with its content intact.
        continue;
      }
      this.setModelState(modelId, tracked.model.setState(states[modelId]), entityChanges);
    }

    return entityChanges;
  }

  protected transactionConfirmations: ((value: {}) => void)[] = [];

  private createConfirmation(): Promise<{}> {
    return new Promise<{}>((resolve) => this.transactionConfirmations.push(resolve));
  }

  /**
   * Commits all operations added via {@link addOperationForTransaction}.
   *
   * @deprecated This method is intended to be used only by legacy clients.
   * Please use {@link transaction} instead.
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
    this.undoStack.push({ transactionId: transaction.id, states: this.currentTransactionStates });
    this.currentTransactionStates = {};
    this.redoStack = [];
    this.notifyUndoRedoSubscribers();
    this.notifyTransactionCommitSubscribers();

    return {
      transactionId: transaction.id,
      confirmation: this.createConfirmation(),
    };
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

  protected notifyEntityChanges(entityChanges: Record<ModelIdentifier, EntityChange[]>): void {
    if (Object.keys(entityChanges).length === 0) {
      return;
    }

    // Modifies entityChanges in place
    this.updateProjectModelMetadata(entityChanges);

    const event: ObservableEntityModelStoreChangeEvent = { entityChanges };
    for (const listener of this.subscribers) {
      listener(event);
    }

    // Reported last, as it reports changes of the project structure on its own.
    this.updateProjectModelReuse();
  }

  /**
   * Reused projects are declared by the content of the package models, which
   * the project model itself does not see. The declaration is therefore
   * recomputed after every change and handed over to it.
   */
  protected updateProjectModelReuse(): void {
    const projectTracked = this.models[this.projectModelId];
    if (!projectTracked) {
      return;
    }

    const reusedProjectIds: Record<ModelIdentifier, ModelIdentifier[]> = {};
    for (const entity of Object.values(projectTracked.outputState)) {
      if (!isPackageEntity(entity)) {
        continue;
      }
      const packageModel = this.activeEntities[entity.id]?.[entity.id];
      if (packageModel === undefined) {
        // The content of the package is not known yet, which must not be
        // mistaken for the package reusing nothing.
        continue;
      }
      reusedProjectIds[entity.id] = getReusedProjectIds(packageModel);
    }

    const loading = this.projectModel.synchronizeReusedProjects(reusedProjectIds);
    if (loading !== null) {
      this.modelPromises.push(loading.catch((error) => console.error("Failed to load reused projects.", error)));
    }
  }

  /**
   * Updates the metadata of project entities based on the changed entities of
   * individual models. For every changed model, the new or updated entities
   * (the main entity cannot be removed) are passed to the metadata extraction
   * and the result is handed over to the project model. Any resulting change
   * of the project entity is appended to `entityChanges`, so it is reported
   * in the same batch as the changes that caused it.
   */
  protected updateProjectModelMetadata(entityChanges: Record<ModelIdentifier, EntityChange[]>): void {
    const projectTracked = this.models[this.projectModelId];
    if (!projectTracked) {
      return;
    }
    const projectEntities = projectTracked.outputState;
    let metadata: Record<ModelIdentifier, ModelMetadata> | null = null;

    for (const modelId in entityChanges) {
      if (modelId === this.projectModelId) {
        continue;
      }
      const projectEntity = projectEntities[modelId] as ProjectModelEntity | undefined;
      if (!projectEntity) {
        continue;
      }

      const changedEntities: EntityRecord = {};
      for (const change of entityChanges[modelId]) {
        if (change.next) {
          changedEntities[change.next.id] = change.next;
        }
      }

      const modelMetadata = getModelMetadata(projectEntity.modelType, changedEntities, modelId);
      if (modelMetadata === null) {
        continue;
      }
      (metadata ??= {})[modelId] = modelMetadata;
    }

    if (metadata === null) {
      return;
    }
    this.setModelState(this.projectModelId, this.projectModel.setModelsMetadata(metadata), entityChanges);
  }

  subscribeToEntityChanges(listener: (entityChaneEvent: ObservableEntityModelStoreChangeEvent) => void): () => void {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter((l) => l !== listener);
    };
  }

  /**
   * Chain of pending {@link saveByOverride} uploads, so that concurrent saves
   * run one after another. Overlapping saves would slice the pending
   * transactions from the same {@link uploadedTransactionCount} and upload
   * them twice, duplicating the recorded history.
   */
  private saveLock: Promise<void> = Promise.resolve();

  /**
   * Applies all operations that happened since the last successful save to the backend.
   *
   * @todo Rename this method, it is not "by override" anymore
   */
  saveByOverride(): Promise<void> {
    const result = this.saveLock.then(() => this.uploadPendingTransactions());
    this.saveLock = result.catch(() => {});
    return result;
  }

  private async uploadPendingTransactions(): Promise<void> {
    const pendingTransactions = this.transactions.slice(this.uploadedTransactionCount).filter((transaction) => transaction.operations.length > 0);
    const transactionCount = this.transactions.length;
    // Transactions committed while the upload below is in flight are not part
    // of it; their confirmations must wait for the next upload.
    const confirmationCount = this.transactionConfirmations.length;

    if (pendingTransactions.length > 0) {
      await this.service.applyTransactions(this.modelContext.rootProjectId, pendingTransactions);
    }

    this.uploadedTransactionCount = transactionCount;

    this.transactionConfirmations.splice(0, confirmationCount).forEach((resolve) => resolve({}));
  }
}
