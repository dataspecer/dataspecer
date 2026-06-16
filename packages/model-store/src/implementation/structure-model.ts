import type { PackageService } from "@dataspecer/core-v2/project";
import {
  coreResourceToEntity,
  createExecutorMap,
  type CoreOperation,
  type CoreOperationAndOperation,
  type CoreOperationExecutor,
  type CoreResource,
  type CoreResourceAndEntity,
  type CoreResourceReader,
} from "@dataspecer/core/core";
import { serializationToStructureModelEntities, structureModelEntitiesToSerialization, StructureModelState } from "@dataspecer/core/data-psm";
import { dataPsmExecutors } from "@dataspecer/core/data-psm/data-psm-executors";
import { generateEntityId, type EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import { BaseModelInModelStore } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

const structureModelExecutors = createExecutorMap([...dataPsmExecutors]);

/**
 * Currently, the structure model is PSM. This will be changed in the future,
 * but we will already call it properly to avoid refactoring in the future.
 */
export class StructureModelInModelStore extends BaseModelInModelStore<CoreResourceAndEntity> implements Model, ModelInDefaultFrontendModelStore {
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
    return serializationToStructureModelEntities(data);
  }

  protected async saveInternal(state: StructureModelState): Promise<void> {
    const data = structureModelEntitiesToSerialization(state);
    await this.service.setResourceJsonData(this.id, data);
  }

  /**
   * Executes given operation and changes the state of the model.
   *
   * Since the operations are using CoreResource internally, we need to sync
   * entity types.
   */
  protected override applyOperation(operation: CoreOperationAndOperation, mutableState: EntityRecord<CoreResourceAndEntity>): void {
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
