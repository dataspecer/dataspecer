import { generateEntityId, type EntityIdentifier } from "@dataspecer/core/entity-model";
import {SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship, SemanticModelRelationshipEnd} from "../concepts/index.ts";
import { generateOperationId, type Operation } from "@dataspecer/core/operation";

export const RELOAD_OPERATION_TYPE = "https://schemas.dataspecer.com/semantic-model/operations/reload";

/**
 * Records a successful semantic model reload. Fetching and the resulting entity
 * changes are handled separately; executing this marker never changes state.
 */
export interface ReloadOperation extends Operation {
    type: typeof RELOAD_OPERATION_TYPE;
}

export function createReloadOperation(): ReloadOperation {
    return { id: generateOperationId(), type: RELOAD_OPERATION_TYPE };
}

export function isReloadOperation(operation: Operation): operation is ReloadOperation {
    return operation.type === RELOAD_OPERATION_TYPE;
}

export const CHANGE_RDFS_SOURCE_URLS_OPERATION = "https://schemas.dataspecer.com/semantic-model/operations/change-rdfs-source-urls";

export interface ChangeRdfsSourceUrlsOperation extends Operation {
    type: typeof CHANGE_RDFS_SOURCE_URLS_OPERATION;
    urls: string[];
}

export function changeRdfsSourceUrls(urls: string[]): ChangeRdfsSourceUrlsOperation {
    return { id: generateOperationId(), type: CHANGE_RDFS_SOURCE_URLS_OPERATION, urls: [...urls] };
}

export function isChangeRdfsSourceUrlsOperation(operation: Operation): operation is ChangeRdfsSourceUrlsOperation {
    return operation.type === CHANGE_RDFS_SOURCE_URLS_OPERATION;
}

export interface OperationResult {
    success: boolean;
    // todo add more details
}

export interface CreatedEntityOperationResult extends OperationResult {
    id: string;
}

// Create class

export const CREATE_CLASS_OPERATION = "https://schemas.dataspecer.com/semantic-model/operations/create-class";

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

export const MODIFY_CLASS_OPERATION = "https://schemas.dataspecer.com/semantic-model/operations/update-class";

export interface ModifyClassOperation extends Operation {
    type: typeof MODIFY_CLASS_OPERATION;
    entityId: EntityIdentifier;
    entity: Partial<Omit<SemanticModelClass, "id" | "type">>;
}

export function isModifyClassOperation(operation: Operation): operation is ModifyClassOperation {
    return operation.type === MODIFY_CLASS_OPERATION;
}

export function modifyClass(id: string, entity: Partial<Omit<SemanticModelClass, "type" | "id">>): ModifyClassOperation {
    return {
        id: generateOperationId(),
        type: MODIFY_CLASS_OPERATION,
        entityId: id,
        entity,
    }
}

// Create relationship

export const CREATE_RELATIONSHIP_OPERATION = "https://schemas.dataspecer.com/semantic-model/operations/create-relationship";

export interface CreateRelationshipOperation extends Operation {
    type: typeof CREATE_RELATIONSHIP_OPERATION;
    entity: Partial<Omit<SemanticModelRelationship, "type" | "ends">>
        & Pick<SemanticModelRelationship, "id">
        & { ends?: Partial<SemanticModelRelationshipEnd>[] };
}

export function isCreateRelationshipOperation(operation: Operation): operation is CreateRelationshipOperation {
    return operation.type === CREATE_RELATIONSHIP_OPERATION;
}

export function createRelationship(entity: Partial<Omit<SemanticModelRelationship, "type" | "ends">> & { ends?: Partial<SemanticModelRelationshipEnd>[] } = {}): CreateRelationshipOperation {
    return {
        id: generateOperationId(),
        type: CREATE_RELATIONSHIP_OPERATION,
        entity: { ...entity, id: entity.id ?? generateEntityId() },
    }
}

// Modify relationship

export const MODIFY_RELATIONSHIP_OPERATION = "https://schemas.dataspecer.com/semantic-model/operations/update-relationship";

/**
 * If you modifying individual ends of the relationship, use `ModifyRelationEndOperation` instead.
 */
export interface ModifyRelationOperation extends Operation {
    type: typeof MODIFY_RELATIONSHIP_OPERATION;
    entityId: EntityIdentifier;
    entity: Partial<Omit<SemanticModelRelationship, "id" | "type">>;
}

export function isModifyRelationOperation(operation: Operation): operation is ModifyRelationOperation {
    return operation.type === MODIFY_RELATIONSHIP_OPERATION;
}

export function modifyRelation(id: string, entity: Partial<Omit<SemanticModelRelationship, "type" | "id">>): ModifyRelationOperation {
    return {
        id: generateOperationId(),
        type: MODIFY_RELATIONSHIP_OPERATION,
        entityId: id,
        entity,
    }
}

// Modify relationship end

export const MODIFY_RELATIONSHIP_END_OPERATION = "https://schemas.dataspecer.com/semantic-model/operations/update-relationship-end";

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

export const CREATE_GENERALIZATION_OPERATION = "https://schemas.dataspecer.com/semantic-model/operations/create-generalization";

export interface CreateGeneralizationOperation extends Operation {
    type: typeof CREATE_GENERALIZATION_OPERATION;
    entity: Partial<Omit<SemanticModelGeneralization, "type">> & Pick<SemanticModelGeneralization, "id">;
}

export function isCreateGeneralizationOperation(operation: Operation): operation is CreateGeneralizationOperation {
    return operation.type === CREATE_GENERALIZATION_OPERATION;
}

export function createGeneralization(entity: Partial<Omit<SemanticModelGeneralization, "type">> = {}): CreateGeneralizationOperation {
    return {
        id: generateOperationId(),
        type: CREATE_GENERALIZATION_OPERATION,
        entity: { ...entity, id: entity.id ?? generateEntityId() },
    }
}

// Modify generalization

export const MODIFY_GENERALIZATION_OPERATION = "https://schemas.dataspecer.com/semantic-model/operations/update-generalization";

export interface ModifyGeneralizationOperation extends Operation {
    type: typeof MODIFY_GENERALIZATION_OPERATION;
    entityId: EntityIdentifier;
    entity: Partial<Omit<SemanticModelGeneralization, "id" | "type">>;
}

export function isModifyGeneralizationOperation(operation: Operation): operation is ModifyGeneralizationOperation {
    return operation.type === MODIFY_GENERALIZATION_OPERATION;
}

export function modifyGeneralization(id: string, entity: Partial<Omit<SemanticModelGeneralization, "id" | "type">>): ModifyGeneralizationOperation {
    return {
        id: generateOperationId(),
        type: MODIFY_GENERALIZATION_OPERATION,
        entityId: id,
        entity,
    }
}

// Delete entity

export const DELETE_ENTITY_OPERATION = "https://schemas.dataspecer.com/semantic-model/operations/delete-entity";

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
