import { EntityModel } from "@dataspecer/entity-model";

export {
  SEMANTIC_MODEL_CLASS,
  isSemanticModelClass,
  type SemanticModelClass,
} from "@dataspecer/core-v2/semantic-model/concepts"

export {
  SEMANTIC_MODEL_RELATIONSHIP,
  isSemanticModelRelationship,
  type SemanticModelRelationship,
  type SemanticModelRelationshipEnd,
} from "@dataspecer/core-v2/semantic-model/concepts"

export {
  SEMANTIC_MODEL_GENERALIZATION,
  isSemanticModelGeneralization,
  type SemanticModelGeneralization,
} from "@dataspecer/core-v2/semantic-model/concepts"

/**
 * We remove soon to be deprecated methods.
 */
export interface SemanticModel extends EntityModel {

  getBaseIri(): string;

};
