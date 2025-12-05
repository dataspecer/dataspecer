import {
  CmeProfileClassAggregate,
  CmeProfileRelationshipAggregate,
  CmeSemanticClassAggregate,
  CmeGeneralizationAggregate,
  CmeSemanticRelationshipAggregate,
} from "./model";
import {
  EntityDsIdentifier,
} from "../entity-model";
import { CmeAggregateModelState } from "./cme-aggregate-model-state";

export interface CmeAggregateModelApi {

  profileClass: (identifier: EntityDsIdentifier) =>
    CmeProfileClassAggregate | null;

  profileRelationship: (identifier: EntityDsIdentifier) =>
    CmeProfileRelationshipAggregate | null;

  semanticClass: (identifier: EntityDsIdentifier) =>
    CmeSemanticClassAggregate | null;

  semanticRelationship: (identifier: EntityDsIdentifier) =>
    CmeSemanticRelationshipAggregate | null;

  generalization: (identifier: EntityDsIdentifier) =>
    CmeGeneralizationAggregate | null;

}

/**
 * Wrap a React reference with {@link CmeAggregateModelApi}.
 */
export function createCmeAggregateModelApi(
  reference: React.RefObject<CmeAggregateModelState>,
): CmeAggregateModelApi {
  return {
    profileClass: (identifier) =>
      reference.current.profileClasses[identifier] ?? null,
    profileRelationship: (identifier) =>
      reference.current.profileRelationships[identifier] ?? null,
    semanticClass: (identifier) =>
      reference.current.semanticClasses[identifier] ?? null,
    semanticRelationship: (identifier) =>
      reference.current.semanticRelationships[identifier] ?? null,
    generalization: (identifier) =>
      reference.current.generalizations[identifier] ?? null,
  }
}
