import { generateEntityId } from "@dataspecer/core/entity-model";
import {SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship} from "../concepts/index.ts";

/**
 * Each operation is a single JS serializable object identified by its type. The type is a single string as the
 * operation must be executed by corresponding executor and not any more generic one.
 */
export interface Operation {
    type: string;
}

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
        type: CREATE_CLASS_OPERATION,
        entity: { ...entity, id: entity.id ?? generateEntityId() },
    }
}

// Modify class

const MODIFY_CLASS_OPERATION = 'modify';

export interface ModifyClassOperation extends Operation {
    type: typeof MODIFY_CLASS_OPERATION;
    id: string;
    entity: Partial<Omit<SemanticModelClass, "type" | "id">>;
}

export function isModifyClassOperation(operation: Operation): operation is ModifyClassOperation {
    return operation.type === MODIFY_CLASS_OPERATION;
}

export function modifyClass(id: string, entity: Partial<Omit<SemanticModelClass, "type" | "id">>): ModifyClassOperation {
    return {
        type: MODIFY_CLASS_OPERATION,
        id,
        entity
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
        type: CREATE_RELATIONSHIP_OPERATION,
        entity: { ...entity, id: entity.id ?? generateEntityId() },
    }
}

// Modify relationship

const MODIFY_RELATIONSHIP_OPERATION = 'modify-relation';

export interface ModifyRelationOperation extends Operation {
    type: typeof MODIFY_RELATIONSHIP_OPERATION;
    id: string;
    entity: Partial<Omit<SemanticModelRelationship, "type" | "id">>;
}

export function isModifyRelationOperation(operation: Operation): operation is ModifyRelationOperation {
    return operation.type === MODIFY_RELATIONSHIP_OPERATION;
}

export function modifyRelation(id: string, entity: Partial<Omit<SemanticModelRelationship, "type" | "id">>): ModifyRelationOperation {
    return {
        type: MODIFY_RELATIONSHIP_OPERATION,
        id,
        entity
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
        type: CREATE_GENERALIZATION_OPERATION,
        entity: { ...entity, id: generateEntityId() },
    }
}

// Modify generalization

const MODIFY_GENERALIZATION_OPERATION = 'modify-generalization';

export interface ModifyGeneralizationOperation extends Operation {
    type: typeof MODIFY_GENERALIZATION_OPERATION;
    id: string;
    entity: Partial<Omit<SemanticModelGeneralization, "id" | "type">>;
}

export function isModifyGeneralizationOperation(operation: Operation): operation is ModifyGeneralizationOperation {
    return operation.type === MODIFY_GENERALIZATION_OPERATION;
}

export function modifyGeneralization(id: string, entity: Partial<Omit<SemanticModelGeneralization, "id" | "type">>): ModifyGeneralizationOperation {
    return {
        type: MODIFY_GENERALIZATION_OPERATION,
        id,
        entity
    }
}

// Delete entity

const DELETE_ENTITY_OPERATION = 'delete';

/**
 * Deletes any type of entity from the single model.
 */
export interface DeleteEntityOperation extends Operation {
    type: typeof DELETE_ENTITY_OPERATION;
    id: string;
}

export function isDeleteEntityOperation(operation: Operation): operation is DeleteEntityOperation {
    return operation.type === DELETE_ENTITY_OPERATION;
}

export function deleteEntity(id: string): DeleteEntityOperation {
    return {
        type: DELETE_ENTITY_OPERATION,
        id
    }
}
