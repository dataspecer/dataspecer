// Controlled vocabulary models are registered as one model per vocabulary,
// whose single entity is set/updated/removed via the generic
// Set/Update/Remove-entity operations (see packages/model-store and
// services/backend/src/models/model-types.ts). The catalog-style CRUD
// operations below are currently unused as a result - kept pending a
// discussion on whether they're wanted for something like bulk-importing
// externally identified vocabularies.

import { generateEntityId } from "@dataspecer/core/entity-model";
import { type Operation, generateOperationId } from "@dataspecer/core/operation";
import type { ControlledVocabulary } from "../concepts/controlled-vocabulary.ts";


// Create vocabulary

const CREATE_VOCABULARY_OPERATION = "https://schemas.dataspecer.com/controlled-vocabulary-model/operations/create-vocabulary" as const;

export interface CreateVocabularyOperation extends Operation {
  type: typeof CREATE_VOCABULARY_OPERATION;
  entity: Partial<Omit<ControlledVocabulary, "type">>;
}

export function isCreateVocabularyOperation(operation: Operation): operation is CreateVocabularyOperation {
  return operation.type === CREATE_VOCABULARY_OPERATION;
}

export function createVocabulary(entity: Partial<Omit<ControlledVocabulary, "type">> = {}): CreateVocabularyOperation {
  return {
    id: generateOperationId(),
    type: CREATE_VOCABULARY_OPERATION,
    entity: {
      ...entity,
      id: entity.id ?? generateEntityId(),
    },
  };
}

// Modify vocabulary

const MODIFY_VOCABULARY_OPERATION = "https://schemas.dataspecer.com/controlled-vocabulary-model/operations/update-vocabulary" as const;

export interface ModifyVocabularyOperation extends Operation {
  type: typeof MODIFY_VOCABULARY_OPERATION;
  vocabularyId: string;
  entity: Partial<Omit<ControlledVocabulary, "id" | "type">>;
}

export function isModifyVocabularyOperation(operation: Operation): operation is ModifyVocabularyOperation {
  return operation.type === MODIFY_VOCABULARY_OPERATION;
}

export function modifyVocabulary(
  vocabularyId: string,
  entity: Partial<Omit<ControlledVocabulary, "id" | "type">>
): ModifyVocabularyOperation {
  return {
    id: generateOperationId(),
    type: MODIFY_VOCABULARY_OPERATION,
    vocabularyId,
    entity,
  };
}

// Delete vocabulary

const DELETE_VOCABULARY_OPERATION = "https://schemas.dataspecer.com/controlled-vocabulary-model/operations/delete-vocabulary" as const;

export interface DeleteVocabularyOperation extends Operation {
  type: typeof DELETE_VOCABULARY_OPERATION;
  vocabularyId: string;
}

export function isDeleteVocabularyOperation(operation: Operation): operation is DeleteVocabularyOperation {
  return operation.type === DELETE_VOCABULARY_OPERATION;
}

export function deleteVocabulary(vocabularyId: string): DeleteVocabularyOperation {
  return {
    id: generateOperationId(),
    type: DELETE_VOCABULARY_OPERATION,
    vocabularyId,
  };
}

// Union type

export type VocabularyOperation =
  | CreateVocabularyOperation
  | ModifyVocabularyOperation
  | DeleteVocabularyOperation;

// DEFAULT_CONTROLLED_VOCABULARY now lives in ../concepts/controlled-vocabulary.ts,
// re-exported here for backward compatibility with this file's previous surface.
export { DEFAULT_CONTROLLED_VOCABULARY } from "../concepts/controlled-vocabulary.ts";
