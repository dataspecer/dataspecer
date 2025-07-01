import { EntityModel } from "@dataspecer/entity-model";

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

export type ProfileModel = EntityModel;
