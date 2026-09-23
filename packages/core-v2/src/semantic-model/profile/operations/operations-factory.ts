import { generateEntityId } from "@dataspecer/core/entity-model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";
import { ControlledVocabularyAssignment, SemanticModelClassProfile, SemanticModelRelationshipEndProfile, SemanticModelRelationshipProfile } from "../concepts/index.ts";
import { CREATE_CONTROLLED_VOCABULARY_ASSIGNMENT, CreateControlledVocabularyAssignment, CREATE_SEMANTIC_MODEL_CLASS_PROFILE, CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE, CreateSemanticModelClassProfile, CreateSemanticModelRelationshipProfile, MODIFY_CONTROLLED_VOCABULARY_ASSIGNMENT, MODIFY_SEMANTIC_MODEL_CLASS_PROFILE, MODIFY_SEMANTIC_MODEL_RELATIONSHIP_END_PROFILE, MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE, ModifyControlledVocabularyAssignment, ModifySemanticModelClassProfile, ModifySemanticModelRelationshipEndProfile, ModifySemanticModelRelationshipProfile, NewSemanticModelRelationshipEndProfile, REMOVE_CONTROLLED_VOCABULARY_ASSIGNMENT, RemoveControlledVocabularyAssignment } from "./operations.ts";
import { generateOperationId } from "@dataspecer/core/operation";

export interface SemanticModelProfileOperationFactory {

  createClassProfile(
    entity?: Partial<Omit<SemanticModelClassProfile, "type">>
  ): CreateSemanticModelClassProfile;

  modifyClassProfile(
    identifier: EntityIdentifier,
    entity: Partial<Omit<SemanticModelClassProfile, "type">>
  ): ModifySemanticModelClassProfile;

  createRelationshipProfile(
    entity?: Partial<Omit<SemanticModelRelationshipProfile, "type" | "ends">>
      & { ends?: NewSemanticModelRelationshipEndProfile[] }
  ): CreateSemanticModelRelationshipProfile;

  modifyRelationshipProfile(
    identifier: EntityIdentifier,
    entity: Partial<Omit<SemanticModelRelationshipProfile, "type">>
  ): ModifySemanticModelRelationshipProfile;

  modifyRelationshipEndProfile(
    identifier: EntityIdentifier,
    endIndex: number,
    end: Partial<SemanticModelRelationshipEndProfile>
  ): ModifySemanticModelRelationshipEndProfile;

  createControlledVocabularyAssignment(
    entity: Partial<Omit<ControlledVocabularyAssignment, "type">>
      & Pick<ControlledVocabularyAssignment, "classProfile" | "vocabulary" | "qualifier">,
  ): CreateControlledVocabularyAssignment;

  removeControlledVocabularyAssignment(
    identifier: EntityIdentifier,
  ): RemoveControlledVocabularyAssignment;

  modifyControlledVocabularyAssignment(
    identifier: EntityIdentifier,
    changes: Partial<Pick<ControlledVocabularyAssignment, "qualifier" | "replaces">>,
  ): ModifyControlledVocabularyAssignment;

}

class DefaultSemanticModelProfileOperationFactory
  implements SemanticModelProfileOperationFactory {

  createClassProfile(entity: Partial<Omit<SemanticModelClassProfile, "type">> = {})
    : CreateSemanticModelClassProfile {
    return {
      id: generateOperationId(),
      type: CREATE_SEMANTIC_MODEL_CLASS_PROFILE,
      entity: { ...entity, id: entity.id ?? generateEntityId() },
    };
  }

  modifyClassProfile(
    identifier: EntityIdentifier,
    entity: Partial<Omit<SemanticModelClassProfile, "type">>)
    : ModifySemanticModelClassProfile {
    return {
      id: generateOperationId(),
      type: MODIFY_SEMANTIC_MODEL_CLASS_PROFILE,
      entity,
      identifier,
    };
  }

  createRelationshipProfile(
    entity: Partial<Omit<SemanticModelRelationshipProfile, "type" | "ends">>
      & { ends?: NewSemanticModelRelationshipEndProfile[] } = {})
    : CreateSemanticModelRelationshipProfile {
      return {
        id: generateOperationId(),
        type: CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
        entity: { ...entity, id: entity.id ?? generateEntityId() },
      };
  }

  modifyRelationshipProfile(
    identifier: EntityIdentifier,
    entity: Partial<Omit<SemanticModelRelationshipProfile, "type">>)
    : ModifySemanticModelRelationshipProfile {
      return {
        id: generateOperationId(),
        type: MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
        entity,
        identifier,
      };
  }

  modifyRelationshipEndProfile(
    identifier: EntityIdentifier,
    endIndex: number,
    end: Partial<SemanticModelRelationshipEndProfile>)
    : ModifySemanticModelRelationshipEndProfile {
      return {
        id: generateOperationId(),
        type: MODIFY_SEMANTIC_MODEL_RELATIONSHIP_END_PROFILE,
        identifier,
        endIndex,
        end,
      };
  }

  createControlledVocabularyAssignment(
    entity: Partial<Omit<ControlledVocabularyAssignment, "type">>
      & Pick<ControlledVocabularyAssignment, "classProfile" | "vocabulary" | "qualifier">,
  ): CreateControlledVocabularyAssignment {
    return {
      id: generateOperationId(),
      type: CREATE_CONTROLLED_VOCABULARY_ASSIGNMENT,
      entity: { ...entity, id: entity.id ?? generateEntityId() },
    };
  }

  removeControlledVocabularyAssignment(
    identifier: EntityIdentifier,
  ): RemoveControlledVocabularyAssignment {
    return {
      id: generateOperationId(),
      type: REMOVE_CONTROLLED_VOCABULARY_ASSIGNMENT,
      identifier,
    };
  }

  modifyControlledVocabularyAssignment(
    identifier: EntityIdentifier,
    changes: Partial<Pick<ControlledVocabularyAssignment, "qualifier" | "replaces">>,
  ): ModifyControlledVocabularyAssignment {
    return {
      id: generateOperationId(),
      type: MODIFY_CONTROLLED_VOCABULARY_ASSIGNMENT,
      identifier,
      changes,
    };
  }

}

export function createDefaultSemanticModelProfileOperationFactory() {
  return new DefaultSemanticModelProfileOperationFactory();
}
