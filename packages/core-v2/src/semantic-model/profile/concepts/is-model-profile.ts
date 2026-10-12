import type { EntityRecord } from "@dataspecer/core/entity-model";
import { isSemanticModelClassProfile } from "./class-profile.ts";
import { isSemanticModelRelationshipProfile } from "./relationship-profile.ts";
import { getSemanticModelMainEntity } from "../../concepts/concepts-utils.ts";
import { SEMANTIC_MODEL_APPLICATION_PROFILE_SUBTYPE } from "./profile.ts";

/**
 * Whether a model contains class or relationship profiles.
 */
export function isModelProfile(model: EntityRecord): boolean {
  const mainEntity = getSemanticModelMainEntity(model);
  if (mainEntity?.subType === SEMANTIC_MODEL_APPLICATION_PROFILE_SUBTYPE) {
    return true;
  }

  return Object.values(model).some((entity) => isSemanticModelClassProfile(entity) || isSemanticModelRelationshipProfile(entity));
}
