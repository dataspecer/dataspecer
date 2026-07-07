import { SemanticModelAdapter } from "./semantic-model-adapter.ts";
import { Entity, InMemoryEntityModel } from "../entity-model/index.ts";
import {
    CreateClassOperation,
    CreatedEntityOperationResult,
    CreateGeneralizationOperation,
    CreateRelationshipOperation,
    DeleteEntityOperation,
    isCreateClassOperation,
    isCreateGeneralizationOperation,
    isCreateRelationshipOperation,
    isDeleteEntityOperation,
    isModifyClassOperation,
    isModifyGeneralizationOperation,
    isModifyRelationOperation,
    isModifyRelationEndOperation,
    ModifyClassOperation,
    ModifyGeneralizationOperation,
    ModifyRelationOperation,
    ModifyRelationEndOperation,
    OperationResult,
} from "./operations/index.ts";
import { SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship } from "./concepts/index.ts";
import { createDefaultSemanticModelProfileOperationExecutor } from "./profile/operations/index.ts";
import type { EntityChange, EntityChangeDeleted, EntityRecord } from "@dataspecer/core/entity-model";
import { LOCAL_SEMANTIC_MODEL } from "../model/known-models.ts";
import type { Operation } from "@dataspecer/core/operation";

type EntityGetter = (identifier: string) => Entity | undefined;

type ChangeCollector = (updated: Record<string, Entity>, removed: string[]) => void;


/**
 * Semantic model, that is writable.
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
        const {result, updated, removed} = applyOperationToSemanticModel(
            this.entityModel.entities,
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


export function applyOperationToSemanticModel(semanticModel: EntityRecord, operations: Operation[]): {
    result: (OperationResult | CreatedEntityOperationResult)[],
    changes: EntityChange[],
    updated: Record<string, Entity>,
    removed: string[],
} {
    const updatedCollector: Record<string, Entity> = {};
    const removedCollector: string[] = [];

    const getEntity: EntityGetter = identifier => semanticModel[identifier];
    const change: ChangeCollector = (updated, removed) => {
        for (const [id, entity] of Object.entries(updated)) {
            updatedCollector[id] = entity;
        }
        removed.forEach(item => removedCollector.push(item));
    };

    const profileExecutor = createDefaultSemanticModelProfileOperationExecutor(
        { entity: identifier => getEntity(identifier) ?? null },
        { change}
    );

    const result: (OperationResult | CreatedEntityOperationResult)[] = [];

    for (const operation of operations) {
        if (isCreateClassOperation(operation)) {
            result.push(handleCreateClassOperation(getEntity, change, operation));
        } else if (isModifyClassOperation(operation)) {
            result.push(handleModifyClassOperation(getEntity, change, operation));
        } else if (isCreateRelationshipOperation(operation)) {
            result.push(handleCreateRelationshipOperation(getEntity, change, operation));
        } else if (isModifyRelationOperation(operation)) {
            result.push(handleModifyRelationOperation(getEntity, change, operation));
        } else if (isModifyRelationEndOperation(operation)) {
            result.push(handleModifyRelationEndOperation(getEntity, change, operation));
        } else if (isCreateGeneralizationOperation(operation)) {
            result.push(handleCreateGeneralizationOperation(getEntity, change, operation));
        } else if (isModifyGeneralizationOperation(operation)) {
            result.push(handleModifyGeneralizationOperation(getEntity, change, operation));
        } else if (isDeleteEntityOperation(operation)) {
            result.push(handleDeleteEntityOperation(getEntity, change, operation));
        } else {
            const operationResult = profileExecutor.executeOperation(operation);
            if (operationResult !== null) {
                result.push({
                    success: true,
                    id: operationResult.created[0],
                });
            } else {
                // Unknown operation.
                result.push({
                    success: false,
                });
            }
        }
    }

    const changes = [
        ...Object.entries(updatedCollector).map(([id, entity]) => ({
            previous: semanticModel[id] ?? null,
            next: entity,
        })) as EntityChange[],
        ...removedCollector.map(id => ({
            previous: semanticModel[id] ?? null,
            next: null,
        })) as EntityChangeDeleted[],
    ];

    return {
        result,
        changes,
        updated: updatedCollector,
        removed: removedCollector,
    }
}

function handleCreateClassOperation(
    getEntity: EntityGetter,
    change: ChangeCollector,
    operation: CreateClassOperation,
): OperationResult | CreatedEntityOperationResult {
    const id = operation.entity.id;

    if (getEntity(id)) {
        return {
            success: false,
        };
    }

    const newClass: SemanticModelClass = {
        // Store any other data
        ...operation.entity,
        id,
        iri: operation.entity.iri ?? null,
        type: ["class"],
        name: operation.entity.name ?? {},
        description: operation.entity.description ?? {},
        externalDocumentationUrl: operation.entity.externalDocumentationUrl ?? null,
    };

    change({ [id]: newClass }, []);
    return {
        success: true,
        id,
    };
}

function handleModifyClassOperation(
    getEntity: EntityGetter,
    change: ChangeCollector,
    operation: ModifyClassOperation,
): OperationResult {
    if (!getEntity(operation.entity.id)) {
        return {
            success: false,
        };
    }
    change({ [operation.entity.id]: { ...getEntity(operation.entity.id)!, ...operation.entity } }, []);
    return {
        success: true,
    };
}

function handleCreateRelationshipOperation(
    getEntity: EntityGetter,
    change: ChangeCollector,
    operation: CreateRelationshipOperation,
): OperationResult | CreatedEntityOperationResult {
    const id = operation.entity.id;

    if (getEntity(id)) {
        return {
            success: false,
        };
    }

    const relationship: SemanticModelRelationship = {
        ...operation.entity,
        id,
        type: ["relationship"],
        iri: operation.entity.iri ?? null,
        name: operation.entity.name ?? {},
        description: operation.entity.description ?? {},
        ends: [
            {
                ...operation.entity.ends?.[0],
                name: operation.entity.ends?.[0]?.name ?? {},
                description: operation.entity.ends?.[0]?.description ?? {},
                cardinality: operation.entity.ends?.[0]?.cardinality,
                concept: operation.entity.ends?.[0]?.concept ?? null,
                iri: operation.entity.ends?.[0]?.iri ?? null,
                externalDocumentationUrl: operation.entity.ends?.[0]?.externalDocumentationUrl ?? null,
            },
            {
                ...operation.entity.ends?.[1],
                name: operation.entity.ends?.[1]?.name ?? {},
                description: operation.entity.ends?.[1]?.description ?? {},
                cardinality: operation.entity.ends?.[1]?.cardinality,
                concept: operation.entity.ends?.[1]?.concept ?? null,
                iri: operation.entity.ends?.[1]?.iri ?? null,
                externalDocumentationUrl: operation.entity.ends?.[1]?.externalDocumentationUrl ?? null,
            },
        ],
    };

    change({ [id]: relationship }, []);
    return {
        success: true,
        id,
    };
}

function handleModifyRelationOperation(
    getEntity: EntityGetter,
    change: ChangeCollector,
    operation: ModifyRelationOperation,
): OperationResult {
    const oldRelationship = getEntity(operation.entity.id) as SemanticModelRelationship | undefined;

    if (!oldRelationship) {
        return {
            success: false,
        };
    }

    const updatedRelationship = {
        ...oldRelationship,
        ...operation.entity,
        ends: [
            {
                ...oldRelationship.ends[0],
                ...operation.entity.ends?.[0],
            },
            {
                ...oldRelationship.ends[1],
                ...operation.entity.ends?.[1],
            },
        ],
        name: operation.entity.name ?? oldRelationship.name,
        description: operation.entity.description ?? oldRelationship.description,
        iri: operation.entity.iri ?? oldRelationship.iri,
    } as SemanticModelRelationship;

    change({ [operation.entity.id]: updatedRelationship }, []);
    return {
        success: true,
    };
}

function handleModifyRelationEndOperation(
    getEntity: EntityGetter,
    change: ChangeCollector,
    operation: ModifyRelationEndOperation,
): OperationResult {
    const oldRelationship = getEntity(operation.entityId) as SemanticModelRelationship | undefined;

    if (!oldRelationship) {
        return {
            success: false,
        };
    }

    const previousEnd = oldRelationship.ends[operation.endIndex];
    if (previousEnd === undefined) {
        return {
            success: false,
        };
    }

    const ends = [...oldRelationship.ends];
    ends[operation.endIndex] = { ...previousEnd, ...operation.end };

    change({ [operation.entityId]: { ...oldRelationship, ends } as SemanticModelRelationship }, []);
    return {
        success: true,
    };
}

function handleCreateGeneralizationOperation(
    getEntity: EntityGetter,
    change: ChangeCollector,
    operation: CreateGeneralizationOperation,
): OperationResult | CreatedEntityOperationResult {
    const id = operation.entity.id;

    if (getEntity(id)) {
        return {
            success: false,
        };
    }

    const generalization: SemanticModelGeneralization = {
        id,
        iri: operation.entity.iri ?? null,
        child: operation.entity.child ?? "",
        parent: operation.entity.parent ?? "",
        type: ["generalization"],
    };

    change({ [id]: generalization }, []);
    return {
        success: true,
        id,
    } satisfies CreatedEntityOperationResult;
}

function handleModifyGeneralizationOperation(
    getEntity: EntityGetter,
    change: ChangeCollector,
    operation: ModifyGeneralizationOperation,
): OperationResult {
    if (!getEntity(operation.entity.id)) {
        return {
            success: false,
        };
    }
    change({ [operation.entity.id]: { ...getEntity(operation.entity.id)!, ...operation.entity } }, []);
    return {
        success: true,
    };
}

function handleDeleteEntityOperation(
    getEntity: EntityGetter,
    change: ChangeCollector,
    operation: DeleteEntityOperation,
): OperationResult {
    if (!getEntity(operation.entityId)) {
        return {
            success: false,
        };
    }
    change({}, [operation.entityId]);
    return {
        success: true,
    };
}
