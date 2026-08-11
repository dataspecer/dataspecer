import { SemanticModelAdapter } from "./semantic-model-adapter.ts";
import { Entity, InMemoryEntityModel } from "../entity-model/index.ts";
import {
    CreatedEntityOperationResult,
    OperationResult,
} from "./operations/index.ts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { LOCAL_SEMANTIC_MODEL } from "../model/known-models.ts";
import type { Operation } from "@dataspecer/core/operation";
import { applyOperationsToSemanticModel } from "./apply-operations.ts";

export type EntityGetter = (identifier: string) => Entity | undefined;

export type ChangeCollector = (updated: Record<string, Entity>, removed: string[]) => void;


/**
 * Semantic model, that is writable.
 * @deprecated Use model store instead to manage the model state.
 */
export class WritableSemanticModelAdapter extends SemanticModelAdapter {

    protected declare readonly entityModel: InMemoryEntityModel;

    constructor(entityModel: InMemoryEntityModel) {
        super(entityModel);
    }

    public executeOperation(operation: Operation) : OperationResult | CreatedEntityOperationResult {
        const results = this.executeOperations([operation]);
        return results[0]!;
    }

    public executeOperations(operations: Operation[]) : (OperationResult | CreatedEntityOperationResult)[] {
        const entities = {...this.entityModel.entities};
        const {result, updated, removed} = applyOperationsToSemanticModel(
            entities,
            operations,
        );
        this.entityModel.change(updated, removed);
        return result;
    }
}

/**
 * Returns entities that represent the semantic model based on the provided serialization.
 */
export function serializationToSemanticModelEntities(serialization: unknown): EntityRecord {
    const modelDescriptor = {...(serialization as any)};

    const entities = modelDescriptor.entities;
    delete modelDescriptor.entities;

    const mainEntity = {
        ...modelDescriptor,
        id: modelDescriptor.modelId,
        type: [LOCAL_SEMANTIC_MODEL],
    } as Entity;

    return {
        ...entities,
        [mainEntity.id]: mainEntity,
    };
}

/**
 * Serializes entities that represent single semantic model.
 */
export function semanticModelEntitiesToSerialization(entities: EntityRecord): unknown {
    const mainEntity = Object.values(entities).find((e) => e.type?.includes(LOCAL_SEMANTIC_MODEL));

    if (!mainEntity) {
      throw new Error("Semantic model must contain an entity with type " + LOCAL_SEMANTIC_MODEL);
    }

    const restEntities = {...entities};
    delete restEntities[mainEntity.id];

    return {
      ...mainEntity,

      // Required fields

      modelId: mainEntity.id,
      type: LOCAL_SEMANTIC_MODEL,
      entities: restEntities,
    };
}
