import type { PackageService } from "@dataspecer/core-v2/project";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import type { Entity, EntityChange } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { v7 as uuidv7 } from "uuid";
import { diffEntities } from "../utilities.ts";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";
import { BaseModelInModelStore } from "./base.ts";
import type { EntityList } from "../../../entity-model/lib/index.js";

/**
 * This class implements support for semantic model for DefaultFrontendModelStore.
 */
export class SemanticModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  protected externalChangesSubscribers: ((changes: EntityChange[]) => void)[] = [];

  /**
   * Underlying implementation of the model.
   * @todo this is just a temporary solution
   */
  protected model: InMemorySemanticModel;

  protected history: Record<
    string,
    {
      previous: Record<string, Entity>;
      current: Record<string, Entity>;
    }
  > = {};

  /**
   * Returns immutable entities of the model.
   */
  getAllEntities() {
    // @ts-ignore: Property 'entityModel' is protected and only accessible within class 'WritableSemanticModelAdapter' and its subclasses.
    return this.model.entityModel.entities;
  }

  protected internalSetImmutableEntities(entities: Record<string, Entity>) {
    // @ts-ignore: Property 'entityModel' is protected and only accessible within class 'WritableSemanticModelAdapter' and its subclasses.
    this.model.entityModel.entities = entities;
  }

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;

    this.model = new InMemorySemanticModel();
  }

  /**
   * Changes the model
   */
  applyOperations(operations: Operation[]): ApplyOperationResult {
    let changes: EntityChange[] = [];
    const transactionId = uuidv7();
    const oldEntities = this.getAllEntities();

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

      const entitiesToApply = isUndo ? historyEntry.previous : historyEntry.current;
      changes = diffEntities(oldEntities, entitiesToApply);
      this.internalSetImmutableEntities(entitiesToApply);
    } else {
      const unsubscribe = this.model.subscribeToChanges((updated, removed) => {
        for (const updatedEntity of Object.values(updated)) {
          changes.push({
            previous: oldEntities[updatedEntity.id] ?? null,
            next: updatedEntity,
          });
        }
        for (const removedEntity of removed) {
          const oldEntity = oldEntities[removedEntity];
          if (!oldEntity) {
            console.error(`Entity ${removedEntity} was removed, but it did not exist before!`);
          }
          changes.push({
            previous: oldEntities[removedEntity] ?? null,
            next: null,
          });
        }
      });

      // Synchronously notify about changes.
      this.model.executeOperations(operations);
      unsubscribe();
    }

    this.history[transactionId] = {
      previous: oldEntities,
      current: this.getAllEntities(),
    };

    return {
      entityChanges: changes,
      transactionId,
    };
  }

  /**
   * Asynchronously loads the model state from the backend.
   */
  public async load(): Promise<void> {
    // Todo set loading state?

    const modelData = (await this.service.getResourceJsonData(this.id)) as any;
    this.model.deserializeModel(modelData); // This wont trigger update

    let entities = Object.values(this.model.getEntities());

    // We also need the main entity.
    const mainEntity = {
      id: this.id,
      type: ["main-entity"],
    } satisfies Entity;

    entities = [mainEntity, ...entities];

    this.internalNotifyExternalChanges(
      entities.map((entity) => ({
        previous: null,
        next: entity,
      })),
    );

    // Todo finish loading state?
  }

  public async save(): Promise<void> {
    const modelData = this.model.serializeModel();
    await this.service.setResourceJsonData(this.id, modelData);
  }
}

export function createSemanticModel(modelId: ModelIdentifier, context: {
  service: PackageService;
}): Model & ModelInDefaultFrontendModelStore {
  return new SemanticModelInModelStore(modelId, context.service);
}
