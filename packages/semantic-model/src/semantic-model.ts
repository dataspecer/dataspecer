import {
  CreatedEntityOperationResult,
  Operation,
  OperationResult,
} from "@dataspecer/core-v2/semantic-model/operations";
import { Entity } from "@dataspecer/entity-model";

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
export interface SemanticModel {

  getId(): string;

  /**
   * @returns null if there is no common base IRI.
   */
  getBaseIri(): string | null;

  getEntities(): SemanticEntityRecord;

};

export type SemanticEntity = Entity;

export type SemanticEntityRecord = { [identifier: string]: SemanticEntity };

export type SemanticOperation = Operation;

export type SemanticOperationResult =
  OperationResult | CreatedEntityOperationResult;

export interface WritableSemanticModel extends SemanticModel {

  executeOperations(operations: SemanticOperation[]):
    SemanticOperationResult[];

}
