import { generateEntityId } from "@dataspecer/core/entity-model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";
import { ControlledVocabularyAssignment, SemanticModelClassProfile, SemanticModelRelationshipProfile } from "../concepts/index.ts";
import { ADD_CONTROLLED_VOCABULARY_ASSIGNMENT, AddControlledVocabularyAssignment, CREATE_SEMANTIC_MODEL_CLASS_PROFILE, CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE, CreateSemanticModelClassProfile, CreateSemanticModelRelationshipProfile, MODIFY_CONTROLLED_VOCABULARY_ASSIGNMENT, MODIFY_SEMANTIC_MODEL_CLASS_PROFILE, MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE, ModifyControlledVocabularyAssignment, ModifySemanticModelClassProfile, ModifySemanticModelRelationshipProfile, REMOVE_CONTROLLED_VOCABULARY_ASSIGNMENT, RemoveControlledVocabularyAssignment } from "./operations.ts";

export interface SemanticModelProfileOperationFactory {

  createClassProfile(
    entity: Omit<SemanticModelClassProfile, "id" | "type"> & Partial<Pick<SemanticModelClassProfile, "id">>
  ): CreateSemanticModelClassProfile;

  modifyClassProfile(
    identifier: EntityIdentifier,
    entity: Partial<Omit<SemanticModelClassProfile, "type">>
  ): ModifySemanticModelClassProfile;

  createRelationshipProfile(
    entity: Omit<SemanticModelRelationshipProfile, "id" | "type"> & Partial<Pick<SemanticModelRelationshipProfile, "id">>
  ): CreateSemanticModelRelationshipProfile;

  modifyRelationshipProfile(
    identifier: EntityIdentifier,
    entity: Partial<Omit<SemanticModelRelationshipProfile, "type">>
  ): ModifySemanticModelRelationshipProfile;

  addControlledVocabularyAssignment(
    classProfileIdentifier: EntityIdentifier,
    assignment: ControlledVocabularyAssignment,
  ): AddControlledVocabularyAssignment;

  removeControlledVocabularyAssignment(
    classProfileIdentifier: EntityIdentifier,
    vocabularyId: string,
  ): RemoveControlledVocabularyAssignment;

  modifyControlledVocabularyAssignment(
    classProfileIdentifier: EntityIdentifier,
    vocabularyId: string,
    changes: Partial<Pick<ControlledVocabularyAssignment, "qualifier" | "override">>,
  ): ModifyControlledVocabularyAssignment;

}

class DefaultSemanticModelProfileOperationFactory
  implements SemanticModelProfileOperationFactory {

  createClassProfile(entity: Omit<SemanticModelClassProfile, "id" | "type"> & Partial<Pick<SemanticModelClassProfile, "id">>)
    : CreateSemanticModelClassProfile {
    return {
      type: CREATE_SEMANTIC_MODEL_CLASS_PROFILE,
      entity: { ...entity, id: entity.id ?? generateEntityId() },
    };
  }

  modifyClassProfile(
    identifier: EntityIdentifier,
    entity: Partial<Omit<SemanticModelClassProfile, "type">>)
    : ModifySemanticModelClassProfile {
    return {
      type: MODIFY_SEMANTIC_MODEL_CLASS_PROFILE,
      entity,
      identifier,
    };
  }

  createRelationshipProfile(entity: Omit<SemanticModelRelationshipProfile, "id" | "type"> & Partial<Pick<SemanticModelRelationshipProfile, "id">>)
    : CreateSemanticModelRelationshipProfile {
      return {
        type: CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
        entity: { ...entity, id: entity.id ?? generateEntityId() },
      };
  }

  modifyRelationshipProfile(
    identifier: EntityIdentifier,
    entity: Partial<Omit<SemanticModelRelationshipProfile, "type">>)
    : ModifySemanticModelRelationshipProfile {
      return {
        type: MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
        entity,
        identifier,
      };
  }

  addControlledVocabularyAssignment(
    classProfileIdentifier: EntityIdentifier,
    assignment: ControlledVocabularyAssignment,
  ): AddControlledVocabularyAssignment {
    return {
      type: ADD_CONTROLLED_VOCABULARY_ASSIGNMENT,
      classProfileIdentifier,
      assignment,
    };
  }

  removeControlledVocabularyAssignment(
    classProfileIdentifier: EntityIdentifier,
    vocabularyId: string,
  ): RemoveControlledVocabularyAssignment {
    return {
      type: REMOVE_CONTROLLED_VOCABULARY_ASSIGNMENT,
      classProfileIdentifier,
      vocabularyId,
    };
  }

  modifyControlledVocabularyAssignment(
    classProfileIdentifier: EntityIdentifier,
    vocabularyId: string,
    changes: Partial<Pick<ControlledVocabularyAssignment, "qualifier" | "override">>,
  ): ModifyControlledVocabularyAssignment {
    return {
      type: MODIFY_CONTROLLED_VOCABULARY_ASSIGNMENT,
      classProfileIdentifier,
      vocabularyId,
      changes,
    };
  }

}

export function createDefaultSemanticModelProfileOperationFactory() {
  return new DefaultSemanticModelProfileOperationFactory();
}
