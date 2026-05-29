import type { PackageService } from "@dataspecer/core-v2/project";
import { createVisualModel } from "@dataspecer/core-v2/semantic-model/simplified";
import type { Entity, EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { v7 as uuidv7 } from "uuid";
import { diffEntities } from "../utilities.ts";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";

export class VisualModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  id: string;

  protected service: PackageService;
  protected externalChangesSubscribers: ((changes: EntityChange[]) => void)[] = [];
  protected model: ReturnType<typeof createVisualModel>;
  protected history: Record<
    string,
    {
      previous: object;
      current: object;
    }
  > = {};

  protected unsubscribeAsyncFromModel: (() => void) | null = null;

  constructor(id: string, service: PackageService) {
    this.id = id;
    this.service = service;

    this.model = createVisualModel(this.id);
    this.unsubscribeAsyncFromModel = this.internalSubscribeToModelChangesAsAsync();
  }

  getAllEntities(): EntityRecord {
    return this.internalGetImmutableEntities();
  }

  protected internalToStoreEntity(entity: unknown): Entity {
    const sourceEntity = entity as Record<string, unknown>;
    const entityId = (sourceEntity.id ?? sourceEntity.identifier) as string | undefined;
    if (!entityId) {
      throw new Error("Visual entity has neither 'id' nor 'identifier'.");
    }

    return {
      ...sourceEntity,
      id: entityId,
      type: Array.isArray(sourceEntity.type) ? (sourceEntity.type as string[]) : [],
    } as Entity;
  }

  protected internalToEntityChange(previous: unknown | null, next: unknown | null): EntityChange {
    const previousEntity = previous === null ? null : this.internalToStoreEntity(previous);
    const nextEntity = next === null ? null : this.internalToStoreEntity(next);

    if (previousEntity === null && nextEntity !== null) {
      return {
        previous: null,
        next: nextEntity,
      };
    }

    if (previousEntity !== null && nextEntity === null) {
      return {
        previous: previousEntity,
        next: null,
      };
    }

    if (previousEntity !== null && nextEntity !== null) {
      return {
        previous: previousEntity,
        next: nextEntity,
      };
    }

    // A change where both previous and next are null is not expected from visual model.
    throw new Error("Invalid visual entity change: both previous and next are null.");
  }

  protected internalGetImmutableEntities(): Record<string, Entity> {
    const entities: Record<string, Entity> = {};

    for (const visualEntity of this.model.getVisualEntities().values()) {
      const entity = this.internalToStoreEntity(visualEntity);
      entities[entity.id] = entity;
    }

    return entities;
  }

  protected internalSerializeModel(): object {
    return this.model.serializeModel();
  }

  protected internalRecreateModelFromSerialized(serializedModel: object): void {
    this.unsubscribeAsyncFromModel?.();
    this.model = createVisualModel(this.id).deserializeModel(serializedModel);
    this.unsubscribeAsyncFromModel = this.internalSubscribeToModelChangesAsAsync();
  }

  protected internalSubscribeToModelChangesAsAsync(): () => void {
    return this.model.subscribeToChanges({
      visualEntitiesDidChange: (changes) => {
        const mappedChanges = changes.map((change) => this.internalToEntityChange(change.previous, change.next));

        if (mappedChanges.length > 0) {
          this.internalNotifyExternalChanges(mappedChanges);
        }
      },
      modelColorDidChange: () => {
        // No-op: model color updates are also reflected in visualEntitiesDidChange.
      },
    });
  }

  applyOperations(operations: Operation[]): ApplyOperationResult {
    let changes: EntityChange[] = [];
    const transactionId = uuidv7();
    const oldEntities = this.internalGetImmutableEntities();
    const oldModelData = this.internalSerializeModel();

    if (operations.length === 1 && ["undo", "redo"].includes(operations[0].type)) {
      const isUndo = operations[0].type === "undo";
      const historyEntry = this.history[transactionId];
      if (!historyEntry) {
        console.error(`No history entry found for transaction ${transactionId}, cannot perform ${operations[0].type} operation!`);
        return {
          entityChanges: [],
          transactionId,
        };
      }

      const modelDataToApply = isUndo ? historyEntry.previous : historyEntry.current;
      this.internalRecreateModelFromSerialized(modelDataToApply);
      changes = diffEntities(oldEntities, this.internalGetImmutableEntities());
    } else {
      const unsubscribe = this.model.subscribeToChanges({
        visualEntitiesDidChange: (changeBatch) => {
          for (const change of changeBatch) {
            changes.push(this.internalToEntityChange(change.previous, change.next));
          }
        },
        modelColorDidChange: () => {
          // No-op: model color updates are also reflected in visualEntitiesDidChange.
        },
      });

      // @ts-expect-error Visual model executes operation payloads, but executeOperations is not part of the public TS API.
      this.model.executeOperations(operations);
      unsubscribe();
    }

    this.history[transactionId] = {
      previous: oldModelData,
      current: this.internalSerializeModel(),
    };

    return {
      entityChanges: changes,
      transactionId,
    };
  }

  subscribeForAsyncChanges(listener: (changes: EntityChange[]) => void): () => void {
    this.externalChangesSubscribers.push(listener);
    return () => {
      this.externalChangesSubscribers = this.externalChangesSubscribers.filter((l) => l !== listener);
    };
  }

  protected internalNotifyExternalChanges(changes: EntityChange[]): void {
    for (const listener of this.externalChangesSubscribers) {
      listener(changes);
    }
  }

  public async load(): Promise<void> {
    const modelData = (await this.service.getResourceJsonData(this.id)) as object | null;
    if (modelData === null) {
      return;
    }

    this.internalRecreateModelFromSerialized(modelData);

    const entities = Object.values(this.internalGetImmutableEntities());
    const mainEntity = {
      id: this.id,
      type: ["main-entity"],
    } satisfies Entity;

    this.internalNotifyExternalChanges([
      {
        previous: null,
        next: mainEntity,
      },
      ...entities.map((entity) => ({
        previous: null,
        next: entity,
      })),
    ]);
  }

  public async save(): Promise<void> {
    const modelData = this.model.serializeModel();
    await this.service.setResourceJsonData(this.id, modelData);
  }
}

export function createVisualModelInModelStore(modelId: ModelIdentifier, context: {
  service: PackageService;
}): Model & ModelInDefaultFrontendModelStore {
  return new VisualModelInModelStore(modelId, context.service);
}
