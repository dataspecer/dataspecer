import { generateEntityId } from "@dataspecer/core/entity-model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";
import { SemanticModelClassProfile, SemanticModelRelationshipEndProfile, SemanticModelRelationshipProfile } from "../concepts/index.ts";
import { CREATE_SEMANTIC_MODEL_CLASS_PROFILE, CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE, CreateSemanticModelClassProfile, CreateSemanticModelRelationshipProfile, MODIFY_SEMANTIC_MODEL_CLASS_PROFILE, MODIFY_SEMANTIC_MODEL_RELATIONSHIP_END_PROFILE, MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE, ModifySemanticModelClassProfile, ModifySemanticModelRelationshipEndProfile, ModifySemanticModelRelationshipProfile } from "./operations.ts";
import { generateOperationId } from "@dataspecer/core/operation";

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

  modifyRelationshipEndProfile(
    identifier: EntityIdentifier,
    endIndex: number,
    end: Partial<SemanticModelRelationshipEndProfile>
  ): ModifySemanticModelRelationshipEndProfile;

}

class DefaultSemanticModelProfileOperationFactory
  implements SemanticModelProfileOperationFactory {

  createClassProfile(entity: Omit<SemanticModelClassProfile, "id" | "type"> & Partial<Pick<SemanticModelClassProfile, "id">>)
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

  createRelationshipProfile(entity: Omit<SemanticModelRelationshipProfile, "id" | "type"> & Partial<Pick<SemanticModelRelationshipProfile, "id">>)
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

}

export function createDefaultSemanticModelProfileOperationFactory() {
  return new DefaultSemanticModelProfileOperationFactory();
}
