import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { type PackageService } from "@dataspecer/core-v2/project";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation, OperationInModel } from "@dataspecer/core/operation";
import type { ModelEntity } from "@dataspecer/project-model";
import type { ObservableEntityModelStoreChangeEvent } from "../interfaces/observable.ts";
import type { ConnectionStatus, RemoteModelStore } from "../interfaces/remote.ts";
import type { TransactionMetadata, TransactionResult } from "../interfaces/writable.ts";
import { createAsyncQueryableModel } from "./async-queryable-model.ts";
import { createPimModel } from "./pim-model.ts";
import { createProjectModel } from "./project-model.ts";
import { createSemanticModel } from "./semantic-model.ts";
import { createVisualModelInModelStore } from "./visual-model.ts";
import { createStructureModel } from "./structure-model.ts";
import { createBlobModel } from "./blob-model.ts";
import { v4 as uuidv4 } from "uuid";
import { UNDO_OPERATION_TYPE, type UndoOperation } from "./base.ts";
import type { UndoRedoState } from "../interfaces/undo-redo.ts";

/**
 * Synthetic model type used to register {@link createBlobModel} as the
 * builder for a visual model's companion "svg" blob (id `${visualModelId}#svg`).
 * It is not a real model type stored anywhere.
 */
const VISUAL_MODEL_SVG_BLOB_TYPE = "#svg";

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

  load(): Promise<void>;

  save(): Promise<void>;

  /**
   * Immutable object (record) containing entities.
   */
  getAllEntities(): EntityRecord;

  //subscribeForReadinessChange(): () => void;
}

type ModelInModelStoreBuilder = (modelId: ModelIdentifier, context: {
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
interface Transaction {
  id: string;
  metadata: any;
  operations: OperationInModel[];
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
   * Creates a model store that is connected to the backend to the specific
   * package by its id. It subscribes to the following models.
   */
  constructor(params: DefaultFrontendModelStoreParams) {
    this.service = params.packageService;
    this.rootProjectId = params.projectId;
    this.projectModelBuilder = params.projectModelBuilder;
    this.modelBuilders = params.modelBuilders;
    this.httpFetch = params.httpFetch;
  }
  loadByOverride(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getAllEntities(): Record<ModelIdentifier, EntityRecord> {
    const allEntities: Record<ModelIdentifier, EntityRecord> = {};
    for (const modelId in this.models) {
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
    for (const change of changedEntities) {
      if (change.previous === null) {
        // New model was created
        const modelEntity = change.next as ModelEntity;

        const modelType = modelEntity.modelType;
        this.buildModelAndSubscribe(modelEntity.id, modelType);

        if (modelType === LOCAL_VISUAL_MODEL) {
          // A visual model may have an additional "svg" blob attached to it.
          // It is tracked as its own companion model, analogous to how the
          // default "model" blob is tracked.
          this.buildModelAndSubscribe(`${modelEntity.id}${VISUAL_MODEL_SVG_BLOB_TYPE}`, VISUAL_MODEL_SVG_BLOB_TYPE);
        }
      } else if (change.next === null) {
        // Model was deleted
        // todo
      } else {
        // Model changes are ignored, there is no need to react on them.
      }
    }
  }

  /**
   * Builds a model of the given type (if there is a builder registered for
   * it), subscribes to its async changes and starts loading it. No-op if
   * there is no builder for the given model type.
   */
  private buildModelAndSubscribe(modelId: ModelIdentifier, modelType: string): void {
    const createdModel = this.buildModel(modelId, modelType);

    if (!createdModel) {
      // This model is not meant to be subscribed to, ignore it.
      return;
    }

    createdModel.subscribeForAsyncChanges(modelChanges => {
      this.internalNotifyEntityChange({ entityChanges: { [modelId]: modelChanges } });
    });

    this.modelPromises.push(createdModel.load());
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
      };
    }
    this.currentTransaction.operations.push(...operations);
    const transactionId = this.currentTransaction.id;

    // Changes made in this transaction
    const entityChanges: Record<ModelIdentifier, EntityChange[]> = {};

    // Todo maybe group by is not ideal because in one transaction, we might need to create new model or delete model after/before applying some operations.
    const groupedOperations = Object.groupBy(operations, (operation) => operation.modelId);

    for (const modelId in groupedOperations) {
      const thisModelOperations = groupedOperations[modelId]!;
      const pureOperations = thisModelOperations.map((operation) => operation.operation);

      const model = this.models[modelId];
      if (!model) {
        console.error(`Model ${modelId} does not exist. Operations will be ignored!`);
        continue;
      }

      const changes = model.applyOperations(transactionId, pureOperations);
      if (changes.entityChanges.length !== 0) {
        entityChanges[modelId] = changes.entityChanges;
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

    const affectedModels = new Set(transactionToRevert.operations.map((operation) => operation.modelId));

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
    }

    // Handle undo/redo stacks
    (isUndoNotRedo ? this.transactionIdsToRedoStack : this.transactionIdsToUndoStack).push(transactionId);

    this.transactions.push({
      id: transactionId,
      metadata: {},
      operations: allOperations,
    });

    this.internalNotifyEntityChange({ entityChanges });

    this.notifyUndoRedoSubscribers();
    this.notifyTransactionCommitSubscribers();
    return {
      transactionId,
      confirmation: Promise.resolve({}),
    };
  }

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

    this.transactionIdsToUndoStack.push(transaction.id);
    this.transactionIdsToRedoStack = [];
    this.notifyUndoRedoSubscribers();
    this.notifyTransactionCommitSubscribers();

    return {
      transactionId: transaction.id,
      confirmation: Promise.resolve({}),
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
    const savePromises: Promise<void>[] = [];
    for (const modelId in this.models) {
      if (modelId === this.projectModelId) {
        // The project model is virtual and does not support saving yet.
        continue;
      }
      savePromises.push(this.models[modelId]!.save());
    }
    await Promise.all(savePromises);
  }
}

/**
 * Configures and creates a remote model store that is intended to be used by CME.
 * It skips all unsupported models and only subscribes to those that CME needs.
 */
export function createCMEModelStore(params: {
  projectId: ModelIdentifier,
  packageService: PackageService,
  httpFetch: HttpFetch,
}): RemoteModelStore {
  return new DefaultFrontendModelStore({
    projectId: params.projectId,
    projectModelBuilder: createProjectModel,
    modelBuilders: {
      [LOCAL_SEMANTIC_MODEL]: createSemanticModel,
      [LOCAL_VISUAL_MODEL]: createVisualModelInModelStore,
      ["https://dataspecer.com/core/model-descriptor/sgov"]: createAsyncQueryableModel,
      ["https://dataspecer.com/core/model-descriptor/pim-store-wrapper"]: createPimModel,
    },
    packageService: params.packageService,
    httpFetch: params.httpFetch,
  });
}

/**
 * @todo we need mode for manager that will show only the project model and maybe the package model and the configuration model.
 */
export function createDSEModelStore(params: {
  projectId: ModelIdentifier,
  packageService: PackageService,
  httpFetch: HttpFetch,
}): DefaultFrontendModelStore {
  return new DefaultFrontendModelStore({
    projectId: params.projectId,
    projectModelBuilder: createProjectModel,
    modelBuilders: {
      [LOCAL_SEMANTIC_MODEL]: createSemanticModel,
      [LOCAL_VISUAL_MODEL]: createVisualModelInModelStore,
      [VISUAL_MODEL_SVG_BLOB_TYPE]: createBlobModel,
      [LOCAL_PACKAGE]: createBlobModel,
      ["https://dataspecer.com/core/model-descriptor/sgov"]: createAsyncQueryableModel,
      ["https://dataspecer.com/core/model-descriptor/pim-store-wrapper"]: createPimModel,
      [V1.PSM]: createStructureModel,
      [V1.GENERATOR_CONFIGURATION]: createBlobModel,
    },
    packageService: params.packageService,
    httpFetch: params.httpFetch,
  });
}
