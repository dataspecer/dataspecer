import type { EntityRecord } from "@dataspecer/core/entity-model";
import { isSemanticModelClassProfile } from "./class-profile.ts";
import { isSemanticModelRelationshipProfile } from "./relationship-profile.ts";

/**
 * Whether a model contains class or relationship profiles.
 */
export function isModelProfile(model: EntityRecord): boolean {
  return Object.values(model).some((entity) => isSemanticModelClassProfile(entity) || isSemanticModelRelationshipProfile(entity));
}
