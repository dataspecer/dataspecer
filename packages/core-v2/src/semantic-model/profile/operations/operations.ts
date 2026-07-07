import { EntityIdentifier } from "../../../entity-model/entity.ts";
import type { Operation } from "@dataspecer/core/operation";
import { ControlledVocabularyAssignment, SemanticModelClassProfile, SemanticModelRelationshipEndProfile, SemanticModelRelationshipProfile } from "../concepts/index.ts";

export interface CreateSemanticModelClassProfile extends Operation {

  type: typeof CREATE_SEMANTIC_MODEL_CLASS_PROFILE;

  entity: Omit<SemanticModelClassProfile, "type">;
}

export const CREATE_SEMANTIC_MODEL_CLASS_PROFILE = "create-class-profile";

export function isCreateSemanticModelClassProfile(operation: Operation)
  : operation is CreateSemanticModelClassProfile {
  return operation.type === CREATE_SEMANTIC_MODEL_CLASS_PROFILE;
}

export interface ModifySemanticModelClassProfile extends Operation {

  type: typeof MODIFY_SEMANTIC_MODEL_CLASS_PROFILE;

  identifier: EntityIdentifier;

  entity: Partial<Omit<SemanticModelClassProfile, "id" | "type">>;

}

export const MODIFY_SEMANTIC_MODEL_CLASS_PROFILE = "modify-class-profile";

export function isModifySemanticModelClassProfile(operation: Operation)
  : operation is ModifySemanticModelClassProfile {
  return operation.type === MODIFY_SEMANTIC_MODEL_CLASS_PROFILE;
}

export interface CreateSemanticModelRelationshipProfile extends Operation {

  type: typeof CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE;

  entity: Omit<SemanticModelRelationshipProfile, "type">;

}

export const CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE = "create-relation-profile";

export function isCreateSemanticModelRelationshipProfile(operation: Operation)
  : operation is CreateSemanticModelRelationshipProfile {
  return operation.type === CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE;
}

/**
 * If you modifying individual ends of the relationship profile, use
 * `ModifySemanticModelRelationshipEndProfile` instead.
 */
export interface ModifySemanticModelRelationshipProfile extends Operation {

  type: typeof MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE;

  identifier: EntityIdentifier;

  entity: Partial<Omit<SemanticModelRelationshipProfile, "id" | "type">>;

}

export const MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE = "modify-relation-profile";

export function isModifySemanticModelRelationshipProfile(operation: Operation)
  : operation is ModifySemanticModelRelationshipProfile {
  return operation.type === MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE;
}

export interface ModifySemanticModelRelationshipEndProfile extends Operation {

  type: typeof MODIFY_SEMANTIC_MODEL_RELATIONSHIP_END_PROFILE;

  identifier: EntityIdentifier;

  /**
   * Zero-based index of the end to modify.
   */
  endIndex: number;

  end: Partial<SemanticModelRelationshipEndProfile>;

}

export const MODIFY_SEMANTIC_MODEL_RELATIONSHIP_END_PROFILE = "modify-relation-end-profile";

export function isModifySemanticModelRelationshipEndProfile(operation: Operation)
  : operation is ModifySemanticModelRelationshipEndProfile {
  return operation.type === MODIFY_SEMANTIC_MODEL_RELATIONSHIP_END_PROFILE;
}

export interface AddControlledVocabularyAssignment extends Operation {
  type: typeof ADD_CONTROLLED_VOCABULARY_ASSIGNMENT;
  classProfileIdentifier: EntityIdentifier;
  assignment: ControlledVocabularyAssignment;
}

export const ADD_CONTROLLED_VOCABULARY_ASSIGNMENT = "add-controlled-vocabulary-assignment";

export function isAddControlledVocabularyAssignment(op: Operation): op is AddControlledVocabularyAssignment {
  return op.type === ADD_CONTROLLED_VOCABULARY_ASSIGNMENT;
}

export interface RemoveControlledVocabularyAssignment extends Operation {
  type: typeof REMOVE_CONTROLLED_VOCABULARY_ASSIGNMENT;
  classProfileIdentifier: EntityIdentifier;
  controlledVocabularyIdentifier: EntityIdentifier;
}

export const REMOVE_CONTROLLED_VOCABULARY_ASSIGNMENT = "remove-controlled-vocabulary-assignment";

export function isRemoveControlledVocabularyAssignment(op: Operation): op is RemoveControlledVocabularyAssignment {
  return op.type === REMOVE_CONTROLLED_VOCABULARY_ASSIGNMENT;
}

export interface ModifyControlledVocabularyAssignment extends Operation {
  type: typeof MODIFY_CONTROLLED_VOCABULARY_ASSIGNMENT;
  classProfileIdentifier: EntityIdentifier;
  controlledVocabularyIdentifier: EntityIdentifier;
  changes: Partial<Pick<ControlledVocabularyAssignment, "qualifier" | "override">>;
}

export const MODIFY_CONTROLLED_VOCABULARY_ASSIGNMENT = "modify-controlled-vocabulary-assignment";

export function isModifyControlledVocabularyAssignment(op: Operation): op is ModifyControlledVocabularyAssignment {
  return op.type === MODIFY_CONTROLLED_VOCABULARY_ASSIGNMENT;
}
