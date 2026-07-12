import { Entity } from "@dataspecer/core/entity-model";

export interface SemanticModelGeneralizationProfile extends Entity {

    type: [typeof SEMANTIC_GENERALIZATION_PROFILE];

    child: string;

    parent: string;
}

/**
 * This is same as the SEMANTIC_MODEL_GENERALIZATION for backwards
 * compatibility reasons.
 */
export const SEMANTIC_GENERALIZATION_PROFILE = "generalization";

export function isSemanticModelGeneralizationProfile(
  entity: Entity | null,
): entity is SemanticModelGeneralizationProfile {
  return entity?.type.includes(SEMANTIC_GENERALIZATION_PROFILE) ?? false;
}
