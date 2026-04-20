import { type PackageService } from "@dataspecer/core-v2/project";
import type { EntityChange } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation, OperationInModel } from "@dataspecer/core/operation";
import type { ObservableEntityModelStoreChangeEvent } from "../interfaces/observable.ts";
import type { ConnectionStatus, RemoteModelStore } from "../interfaces/remote.ts";
import type { TransactionMetadata, TransactionResult } from "../interfaces/writable.ts";
import { createProjectModel } from "./project-model.ts";
import { LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { createSemanticModel } from "./semantic-model.ts";
import { createVisualModel } from "./visual-model.ts";
import { createPimModel } from "./pim-model.ts";
import { createAsyncQueryableModel } from "./async-queryable-model.ts";
import type { ModelEntity } from "@dataspecer/project-model";

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
}

type ModelInModelStoreBuilder = (modelId: ModelIdentifier, context: {
  service: PackageService;
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
}

/**
 * This wont store data of individual models.
 * This will only manage synchronization via operations and model readiness.
 * The clearest implementation should simply do writing and ignore the actual entities.
 */
export class DefaultFrontendModelStore implements RemoteModelStore {
  /**
   * Main project id (root package id) that this model store is connected to.
   */
  protected projectId: ModelIdentifier;

  protected service: PackageService;

  protected projectModelBuilder: ModelInModelStoreBuilder;
  protected modelBuilders: Record<string, ModelInModelStoreBuilder>;

  protected subscribers: ((event: ObservableEntityModelStoreChangeEvent) => void)[] = [];

  /**
   * All models that are subscribed to. This includes the main project model
   * that this model store is subscribed to and create other models.
   */
  protected models: Record<string, ModelInDefaultFrontendModelStore> = {};

  /**
   * Creates a model store that is connected to the backend to the specific
   * package by its id. It subscribes to the following models.
   */
  constructor(params: DefaultFrontendModelStoreParams) {
    this.service = params.packageService;
    this.projectId = params.projectId;
    this.projectModelBuilder = params.projectModelBuilder;
    this.modelBuilders = params.modelBuilders;
  }

  /**
   * Helper method to build an internal model as part of this Model Store that
   * tracks one of the project's model.
   * @param modelType null for project model
   */
  protected buildModel(modelId: ModelIdentifier, modelType: string | null) {
    const context = {
      service: this.service,
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
    const projectModel = this.buildModel(this.projectId, null)!;
    projectModel.subscribeForAsyncChanges((changes) => this.onProjectModelEntityChange(changes));
    await projectModel.load();
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
   * Use this to perform operations.
   */
  transaction(operations: OperationInModel[], metadata: TransactionMetadata): TransactionResult {
    // Changes made in this transaction
    const entityChanges: Map<ModelIdentifier, EntityChange[]> = new Map();

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
      if (changes.entityChanges.length === 0) {
        entityChanges.set(modelId, changes.entityChanges);
      }
    }

    this.internalNotifyEntityChange({ entityChanges });

    return {
      transactionId: "todo",
      confirmation: Promise.resolve({}),
    }
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
}): RemoteModelStore {
  return new DefaultFrontendModelStore({
    projectId: params.projectId,
    projectModelBuilder: createProjectModel,
    modelBuilders: {
      [LOCAL_SEMANTIC_MODEL]: createSemanticModel,
      [LOCAL_VISUAL_MODEL]: createVisualModel,
      [V1.PIM]: createPimModel,
      [V1.CIM]: createAsyncQueryableModel,
    },
    packageService: params.packageService,
  });
}
