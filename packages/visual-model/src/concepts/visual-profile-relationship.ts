import { Entity } from "@dataspecer/core/entity-model";
import { VisualNodeRelationship } from "./visual-node-relationship.ts";

/**
 * Represents relationship based on a profile.
 */
export type VisualProfileRelationship = VisualNodeRelationship;

export const VISUAL_PROFILE_RELATIONSHIP_TYPE = "visual-profile-relationship";

export function isVisualProfileRelationship(
  what: Entity,
): what is VisualProfileRelationship {
  return what.type.includes(VISUAL_PROFILE_RELATIONSHIP_TYPE);
}
