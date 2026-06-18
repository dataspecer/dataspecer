import { generateEntityId } from "@dataspecer/core/entity-model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";
import { SemanticModelClassProfile, SemanticModelRelationshipProfile } from "../concepts/index.ts";
import { CREATE_SEMANTIC_MODEL_CLASS_PROFILE, CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE, CreateSemanticModelClassProfile, CreateSemanticModelRelationshipProfile, MODIFY_SEMANTIC_MODEL_CLASS_PROFILE, MODIFY_SEMANTIC_MODEL_RELATIONSHIP_PROFILE, ModifySemanticModelClassProfile, ModifySemanticModelRelationshipProfile } from "./operations.ts";

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

}

export function createDefaultSemanticModelProfileOperationFactory() {
  return new DefaultSemanticModelProfileOperationFactory();
}
