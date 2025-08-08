import {
  SemanticModelGeneralization,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipEndProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { Entity } from "@dataspecer/entity-model";
import { isSemanticModelGeneralizationProfile } from "./index.ts";

export {
  SEMANTIC_MODEL_CLASS_PROFILE,
  isSemanticModelClassProfile,
  type SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

export {
  SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
  isSemanticModelRelationshipProfile,
  type SemanticModelRelationshipProfile,
  type SemanticModelRelationshipEndProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

export {
  SEMANTIC_MODEL_GENERALIZATION as SEMANTIC_MODEL_GENERALIZATION_PROFILE,
  isSemanticModelGeneralization as isSemanticModelGeneralizationProfile,
  type SemanticModelGeneralization as SemanticModelGeneralizationProfile,
} from "@dataspecer/core-v2/semantic-model/concepts"

export interface ProfileModel {

  getId(): string;

  /**
   * @returns null if there is no common base IRI.
   */
  getBaseIri(): string | null;

  getEntities(): ProfileEntityRecord;

}

export type ProfileEntity = Entity;

export type ProfileEntityRecord = { [identifier: string]: ProfileEntity };

export type ClassProfile = SemanticModelClassProfile;

export const isClassProfile = isSemanticModelClassProfile;

export type RelationshipProfile = SemanticModelRelationshipProfile;

export const isRelationshipProfile = isSemanticModelRelationshipProfile;

export type RelationshipEndProfile = SemanticModelRelationshipEndProfile;

export type GeneralizationProfile = SemanticModelGeneralization;

export const isGeneralizationProfile = isSemanticModelGeneralizationProfile;
