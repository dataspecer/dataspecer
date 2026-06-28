import { generateEntityId } from "@dataspecer/core/entity-model";
import {SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship, SemanticModelRelationshipEnd} from "../concepts/index.ts";
import { generateOperationId, type Operation } from "@dataspecer/core/operation";

export interface OperationResult {
    success: boolean;
    // todo add more details
}

export interface CreatedEntityOperationResult extends OperationResult {
    id: string;
}

// Create class

const CREATE_CLASS_OPERATION = 'create';

export interface CreateClassOperation extends Operation {
    type: typeof CREATE_CLASS_OPERATION;
    entity: Partial<Omit<SemanticModelClass, "type">> & Pick<SemanticModelClass, "id">;
}

export function isCreateClassOperation(operation: Operation): operation is CreateClassOperation {
    return operation.type === CREATE_CLASS_OPERATION;
}

export function createClass(entity: Partial<Omit<SemanticModelClass, "type">> = {}): CreateClassOperation {
    return {
        id: generateOperationId(),
        type: CREATE_CLASS_OPERATION,
        entity: { ...entity, id: entity.id ?? generateEntityId() },
    }
}

// Modify class

const MODIFY_CLASS_OPERATION = 'modify';

export interface ModifyClassOperation extends Operation {
    type: typeof MODIFY_CLASS_OPERATION;
    entity: Partial<Omit<SemanticModelClass, "type">> & Pick<SemanticModelClass, "id">;
}

export function isModifyClassOperation(operation: Operation): operation is ModifyClassOperation {
    return operation.type === MODIFY_CLASS_OPERATION;
}

export function modifyClass(id: string, entity: Partial<Omit<SemanticModelClass, "type" | "id">>): ModifyClassOperation {
    return {
        type: MODIFY_CLASS_OPERATION,
        id,
        entity: {
            ...entity,
            id,
        }
    }
}

// Create relationship

const CREATE_RELATIONSHIP_OPERATION = 'create-relation';

export interface CreateRelationshipOperation extends Operation {
    type: typeof CREATE_RELATIONSHIP_OPERATION;
    entity: Partial<Omit<SemanticModelRelationship, "type">> & Pick<SemanticModelRelationship, "id">;
}

export function isCreateRelationshipOperation(operation: Operation): operation is CreateRelationshipOperation {
    return operation.type === CREATE_RELATIONSHIP_OPERATION;
}

export function createRelationship(entity: Partial<Omit<SemanticModelRelationship, "type">>): CreateRelationshipOperation {
    return {
        id: generateOperationId(),
        type: CREATE_RELATIONSHIP_OPERATION,
        entity: { ...entity, id: entity.id ?? generateEntityId() },
    }
}

// Modify relationship

const MODIFY_RELATIONSHIP_OPERATION = 'modify-relation';

/**
 * If you modifying individual ends of the relationship, use `ModifyRelationEndOperation` instead.
 */
export interface ModifyRelationOperation extends Operation {
    type: typeof MODIFY_RELATIONSHIP_OPERATION;
    entity: Partial<Omit<SemanticModelRelationship, "type">> & Pick<SemanticModelRelationship, "id">;
}

export function isModifyRelationOperation(operation: Operation): operation is ModifyRelationOperation {
    return operation.type === MODIFY_RELATIONSHIP_OPERATION;
}

export function modifyRelation(id: string, entity: Partial<Omit<SemanticModelRelationship, "type" | "id">>): ModifyRelationOperation {
    return {
        id: generateOperationId(),
        type: MODIFY_RELATIONSHIP_OPERATION,
        entity: {
            ...entity,
            id,
        }
    }
}

// Modify relationship end

const MODIFY_RELATIONSHIP_END_OPERATION = 'modify-relation-end';

export interface ModifyRelationEndOperation extends Operation {
    type: typeof MODIFY_RELATIONSHIP_END_OPERATION;
    entityId: string;
    /**
     * Zero-based index of the end to modify.
     */
    endIndex: number;
    end: Partial<SemanticModelRelationshipEnd>;
}

export function isModifyRelationEndOperation(operation: Operation): operation is ModifyRelationEndOperation {
    return operation.type === MODIFY_RELATIONSHIP_END_OPERATION;
}

export function modifyRelationEnd(id: string, endIndex: number, end: Partial<SemanticModelRelationshipEnd>): ModifyRelationEndOperation {
    return {
        id: generateOperationId(),
        type: MODIFY_RELATIONSHIP_END_OPERATION,
        entityId: id,
        endIndex,
        end,
    }
}

// Create generalization

const CREATE_GENERALIZATION_OPERATION = 'create-generalization';

export interface CreateGeneralizationOperation extends Operation {
    type: typeof CREATE_GENERALIZATION_OPERATION;
    entity: Partial<Omit<SemanticModelGeneralization, "type">> & Pick<SemanticModelGeneralization, "id">;
}

export function isCreateGeneralizationOperation(operation: Operation): operation is CreateGeneralizationOperation {
    return operation.type === CREATE_GENERALIZATION_OPERATION;
}

export function createGeneralization(entity: Partial<Omit<SemanticModelGeneralization, "id" | "type">>): CreateGeneralizationOperation {
    return {
        id: generateOperationId(),
        type: CREATE_GENERALIZATION_OPERATION,
        entity: { ...entity, id: generateEntityId() },
    }
}

// Modify generalization

const MODIFY_GENERALIZATION_OPERATION = 'modify-generalization';

export interface ModifyGeneralizationOperation extends Operation {
    type: typeof MODIFY_GENERALIZATION_OPERATION;
    entity: Partial<Omit<SemanticModelGeneralization, "type">> & Pick<SemanticModelGeneralization, "id">;
}

export function isModifyGeneralizationOperation(operation: Operation): operation is ModifyGeneralizationOperation {
    return operation.type === MODIFY_GENERALIZATION_OPERATION;
}

export function modifyGeneralization(id: string, entity: Partial<Omit<SemanticModelGeneralization, "id" | "type">>): ModifyGeneralizationOperation {
    return {
        id: generateOperationId(),
        type: MODIFY_GENERALIZATION_OPERATION,
        entity: {
            ...entity,
            id,
        }
    }
}

// Delete entity

const DELETE_ENTITY_OPERATION = 'delete';

/**
 * Deletes any type of entity from the single model.
 */
export interface DeleteEntityOperation extends Operation {
    type: typeof DELETE_ENTITY_OPERATION;
    entityId: string;
}

export function isDeleteEntityOperation(operation: Operation): operation is DeleteEntityOperation {
    return operation.type === DELETE_ENTITY_OPERATION;
}

export function deleteEntity(id: string): DeleteEntityOperation {
    return {
        id: generateOperationId(),
        type: DELETE_ENTITY_OPERATION,
        entityId: id
    }
}
