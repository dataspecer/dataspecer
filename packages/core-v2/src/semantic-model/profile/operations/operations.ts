import { EntityIdentifier } from "../../../entity-model/entity";
import { Operation } from "../../operations";
import { SemanticModelClassProfile, SemanticModelRelationshipProfile } from "../concepts";

export interface CreateSemanticModelClassProfile extends Operation {

  type: typeof CREATE_SEMANTIC_MODEL_CLASS_PROFILE;

  entity: Omit<SemanticModelClassProfile, "id" | "type">;
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

  entity: Omit<SemanticModelRelationshipProfile, "id" | "type">;

}

export const CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE = "create-relation-profile";

export function isCreateSemanticModelRelationshipProfile(operation: Operation)
  : operation is CreateSemanticModelRelationshipProfile {
  return operation.type === CREATE_SEMANTIC_MODEL_RELATIONSHIP_PROFILE;
}

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
