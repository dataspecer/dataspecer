import type { PackageService } from "@dataspecer/core-v2/project";
import { CoreResource, createExecutorMap, type CoreOperation, type CoreOperationExecutor, type CoreResourceReader } from "@dataspecer/core/core";
import { dataPsmExecutors } from "@dataspecer/core/data-psm/data-psm-executors";
import { generateEntityId, type Entity, type EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { BaseModelInModelStore } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

type BaseEntityType = Entity & CoreResource;
type BaseOperationType = Operation & CoreOperation;

export interface StructureModelState {
  operations: Operation[];
  entities: EntityRecord<BaseEntityType>;
}

/**
 * Todo this function will be part of the new adapter on backend.
 */
function coreResourceToEntity(resource: CoreResource): BaseEntityType {
  return {
    ...resource,
    id: resource.iri!,
    type: resource.types!,
  };
}

function coreOperationToOperation(operation: CoreOperation): BaseOperationType {
  return {
    ...operation,
    id: operation.iri!,
    type: operation.types![0],
  };
}

const structureModelExecutors = createExecutorMap([...dataPsmExecutors]);

/**
 * Currently, the structure model is PSM. This will be changed in the future,
 * but we will already call it properly to avoid refactoring in the future.
 */
export class StructureModelInModelStore extends BaseModelInModelStore<BaseEntityType> implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;
  }

  /**
   * Loads structure model state from the backend.
   * When resolves, everything is loaded and ready to be used.
   */
  protected async loadInternal() {
    const data = await this.service.getResourceJsonData(this.id);
    const state = this.parseJsonData(data);
    return state;
  }

  protected async saveInternal(state: StructureModelState): Promise<void> {
    await this.service.setResourceJsonData(this.id, state);
  }

  private parseJsonData(data: unknown): StructureModelState {
    const coreOperations = (data as any).operations as CoreOperation[];
    const coreResources = (data as any).resources as Record<string, CoreResource>;

    const operations = coreOperations.map(coreOperationToOperation);
    const entities = Object.fromEntries(Object.entries(coreResources).map(([iri, resource]) => [iri, coreResourceToEntity(resource)])) as EntityRecord<BaseEntityType>;

    return {
      operations,
      entities,
    };
  }

  /**
   * Executes given operation and changes the state of the model.
   *
   * Since the operations are using CoreResource internally, we need to sync
   * entity types.
   */
  protected override applyOperation(operation: BaseOperationType, mutableState: EntityRecord<BaseEntityType>): void {
    // Since there is an interface mismatch, we need to ensure that the operation is compatible with both interfaces
    operation.id = operation.id ?? operation.iri;
    operation.iri = operation.id;
    operation.types = operation.types ?? (operation.type ? [operation.type] : []);
    operation.type = operation.types[0] ?? "unknown";

    const executor = this.findExecutor(operation);

    const reader: CoreResourceReader = {
      readResource: (iri: string): CoreResource | null => {
        return (mutableState[iri] as unknown as CoreResource) ?? null;
      },
      listResources: (): string[] => {
        return Object.keys(mutableState);
      },
      listResourcesOfType: (typeIri: string): string[] => {
        return Object.values(mutableState)
          .filter((entity) => entity.type.includes(typeIri))
          .map((entity) => entity.id);
      },
    };

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

    for (const resource of [...Object.values(executorResult.changed), ...Object.values(executorResult.created)]) {
      // We map core resource to entity and do clone by it
      const entity = coreResourceToEntity(resource);
      mutableState[entity.id] = entity;
    }

    executorResult.deleted.forEach((iri) => delete mutableState[iri]);
  }

  private findExecutor(operation: CoreOperation): CoreOperationExecutor<CoreOperation> {
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
