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
  applyOperations(operations: Operation[]): ApplyOperationResult;

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
        const createdModel = this.buildModel(modelEntity.id, modelType);

        if (!createdModel) {
          // This model is not meant to be subscribed to, ignore it.
          continue;
        }

        createdModel.subscribeForAsyncChanges(modelChanges => {
          this.internalNotifyEntityChange({ entityChanges: {[modelEntity.id]: modelChanges} });
        });

        this.modelPromises.push(createdModel.load());
      } else if (change.next === null) {
        // Model was deleted
        // todo
      } else {
        // Model changes are ignored, there is no need to react on them.
      }
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
   * Allows executing a set of operations by calling this method multiple times
   * and then commiting them all at once.
   */
  addOperationForTransaction(operations: OperationInModel[]): void {
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

      const changes = model.applyOperations(pureOperations);
      if (changes.entityChanges.length !== 0) {
        entityChanges[modelId] = changes.entityChanges;
      }
    }

    this.internalNotifyEntityChange({ entityChanges });
  }

  /**
   * Commits all operations added via {@link addOperationForTransaction}.
   */
  commitTransaction(metadata: TransactionMetadata): TransactionResult {
    return {
      transactionId: "todo",
      confirmation: Promise.resolve({}),
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

  saveByOverride(): Promise<void> {
    // todo update only the models that were changed
    return Promise.resolve();
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
      [V1.CIM]: createAsyncQueryableModel,
      [V1.PIM]: createPimModel,
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
      [LOCAL_PACKAGE]: createBlobModel,
      [V1.CIM]: createAsyncQueryableModel,
      [V1.PIM]: createPimModel,
      [V1.PSM]: createStructureModel,
    },
    packageService: params.packageService,
    httpFetch: params.httpFetch,
  });
}
