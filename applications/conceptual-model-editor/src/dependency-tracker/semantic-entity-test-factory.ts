import { EntityIdentifier } from "@dataspecer/entity-model";
import {
  SEMANTIC_MODEL_CLASS,
  SEMANTIC_MODEL_GENERALIZATION,
  SemanticClass,
  SemanticGeneralization,
} from "@dataspecer/semantic-model"

/**
 * Designed to be used with tests to keep them readable and short.
 * Provide user with a way to set what matters and providing a sensible
 * defaults to other values.
 *
 * Do NOT use this outside of tests!
 */
export function createSemanticEntityTestFactory(): SemanticEntityTestFactory {
  return {
    class(identifier, value) {
      return {
        id: identifier,
        type: [SEMANTIC_MODEL_CLASS],
        name: value.name ?? {},
        description: value.description ?? {},
        iri: value.iri ?? "",
        externalDocumentationUrl: null,
      };
    },
    generalization(identifier, parent, child) {
      return {
        id: identifier,
        type: [SEMANTIC_MODEL_GENERALIZATION],
        iri: "",
        child,
        parent,
      };
    },
  }
}

interface SemanticEntityTestFactory {

  class(
    identifier: EntityIdentifier,
    value: Partial<SemanticClass>,
  ): SemanticClass;

  generalization(
    identifier: EntityIdentifier,
    parent: EntityIdentifier,
    child: EntityIdentifier,
  ): SemanticGeneralization;

}
