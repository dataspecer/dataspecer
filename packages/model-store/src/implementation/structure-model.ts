import type { PackageService } from "@dataspecer/core-v2/project";
import {
  CoreResource,
  createExecutorMap,
  type CoreOperation,
  type CoreOperationExecutor,
  type CoreResourceReader
} from "@dataspecer/core/core";
import { dataPsmExecutors } from "@dataspecer/core/data-psm/data-psm-executors";
import { generateEntityId, type Entity, type EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { diffEntities } from "../utilities.ts";
import { BaseModelInModelStore } from "./base.ts";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";

type BaseEntityType = Entity & CoreResource;
type BaseOperationType = Operation & CoreOperation;

export interface StructureModelCommitData {
  operations: Operation[];
  resources: EntityRecord<BaseEntityType>;
}

const structureModelExecutors = createExecutorMap([...dataPsmExecutors]);

/**
 * Currently, the structure model is PSM. This will be changed in the future,
 * but we will already call it properly to avoid refactoring in the future.
 */
export class StructureModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;
  }

  /**
   * List of all applied operations.
   *
   * Mutable array of immutable objects.
   */
  protected operations: Operation[] = [];

  /**
   * Current entities state.
   *
   * Mutable objects with immutable values.
   */
  protected entities: EntityRecord<BaseEntityType> = {};

  getAllEntities(): EntityRecord<BaseEntityType> {
    return {...this.entities};
  }

  applyOperations(operations: BaseOperationType[]): ApplyOperationResult {
    const oldEntities = this.getAllEntities();
    for (const operation of operations) {
      this.applyOperation(operation);
    }
    const entityChanges = diffEntities(oldEntities, this.entities);

    return {
      entityChanges,
      transactionId: "",
    };
  }

  async load(): Promise<void> {
    const state = this.parseCommitData(await this.service.getResourceJsonData(this.id));
    this.restore(state);
  }

  async save(): Promise<void> {
    await this.service.setResourceJsonData(this.id, this.commit());
  }

  /**
   * Performs commit by freezing the current state.
   */
  commit(): StructureModelCommitData {
    return {
      operations: [...this.operations],
      resources: { ...this.entities },
    };
  }

  /**
   * Restores the previous state and returns changes here as return type.
   */
  restore(state: StructureModelCommitData): ApplyOperationResult {
    const previousEntities = this.getAllEntities();
    this.operations = [...state.operations];
    this.entities = { ...state.resources };
    const entityChanges = diffEntities(previousEntities, this.getAllEntities());
    this.internalNotifyExternalChanges(entityChanges);
    return {
      entityChanges,
      transactionId: "",
    };
  }

  protected parseCommitData(data: unknown): StructureModelCommitData {
    if (data === null) {
      return {
        operations: [],
        resources: {},
      };
    }
    if (typeof data !== "object") {
      throw new Error(`Invalid structure model data for '${this.id}'.`);
    }

    const typedData = data as Partial<StructureModelCommitData>;
    if (!Array.isArray(typedData.operations)) {
      throw new Error(`Invalid structure model operations for '${this.id}'.`);
    }
    if (
      typedData.resources === undefined ||
      typedData.resources === null ||
      typeof typedData.resources !== "object" ||
      Array.isArray(typedData.resources)
    ) {
      throw new Error(`Invalid structure model resources for '${this.id}'.`);
    }

    return {
      operations: typedData.operations as Operation[],
      resources: typedData.resources as EntityRecord<BaseEntityType>,
    };
  }

  /**
   * Executes given operation and changes the state of the model.
   *
   * Since the operations are using CoreResource internally, we need to sync
   * entity types.
   */
  protected applyOperation(operation: BaseOperationType): void {
    // Since there is an interface mismatch, we need to ensure that the operation is compatible with both interfaces
    operation.id = operation.id ?? operation.iri;
    operation.iri = operation.id;
    operation.types = operation.types ?? (operation.type ? [operation.type] : []);
    operation.type = operation.types[0] ?? "unknown";

    const executor = this.findExecutor(operation);

    const reader: CoreResourceReader = {
      readResource: (iri: string): CoreResource | null => {
        return this.entities[iri] as unknown as CoreResource ?? null;
      },
      listResources: (): string[] => {
        return Object.keys(this.entities);
      },
      listResourcesOfType: (typeIri: string): string[] => {
        return Object.values(this.entities).filter(entity => entity.type.includes(typeIri)).map(entity => entity.id);
      },
    }

    const executorResult = executor.execute(
      reader,
      (resourceType: string) => {
        console.warn(`Structure model operation executor for "${resourceType}" is using generated identifier, which makes model non-deterministic.`, operation);
        return generateEntityId();
      },
      operation,
    );

    if (executorResult.failed) {
      console.warn("Structure model operation failed: " + executorResult.message, operation);
      return;
    }

    this.operations.push(operation);

    for (const resource of [...Object.values(executorResult.changed), ...Object.values(executorResult.created)]) {
      // We map core resource to entity and do clone by it
      const entity = {
        ...resource,

        id: resource.iri!,
        type: resource.types!,
      } satisfies Entity;


      this.entities[entity.id] = entity;
    }

    executorResult.deleted.forEach((iri) => delete this.entities[iri]);
  }

  protected findExecutor(operation: CoreOperation): CoreOperationExecutor<CoreOperation> {
    const candidates: CoreOperationExecutor<CoreOperation>[] = [];
    operation.types.forEach((type) => {
      const executor = structureModelExecutors[type];
      if (executor !== undefined) {
        candidates.push(executor);
      }
    });

    if (candidates.length !== 1) {
      throw new Error("Can't determine executor for given operation.");
    }

    return candidates[0];
  }
}

export function createStructureModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new StructureModelInModelStore(modelId, context.service);
}
