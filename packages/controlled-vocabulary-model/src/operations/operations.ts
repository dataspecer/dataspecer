import { generateEntityId } from "@dataspecer/core/entity-model";
import { type Operation, generateOperationId } from "@dataspecer/core/operation";
import type { ControlledVocabulary } from "../concepts/controlled-vocabulary.ts";
import { CONTROLLED_VOCABULARY_TYPE } from "../concepts/controlled-vocabulary.ts";

// Based on the semantic-model from core-v2

// Create vocabulary

const CREATE_VOCABULARY_OPERATION = "create-vocabulary" as const;

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

const MODIFY_VOCABULARY_OPERATION = "modify-vocabulary" as const;

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

const DELETE_VOCABULARY_OPERATION = "delete-vocabulary" as const;

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

// Default field values used when creating a vocabulary with missing fields

export const DEFAULT_CONTROLLED_VOCABULARY: Omit<ControlledVocabulary, "id"> = {
  type: [CONTROLLED_VOCABULARY_TYPE],
  title: "",
  pattern: "",
  references: "",
  documentation: "",
  distribution: {
    downloadUrl: "",
    accessUrl: "",
  },
};
