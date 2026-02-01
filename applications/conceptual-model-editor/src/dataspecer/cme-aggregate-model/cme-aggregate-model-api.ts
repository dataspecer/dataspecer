import {
  CmeProfileClassAggregate,
  CmeProfileRelationshipAggregate,
  CmeSemanticClassAggregate,
  CmeGeneralizationAggregate,
  CmeSemanticRelationshipAggregate,
} from "./model";
import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../entity-model";
import { CmeAggregateModelState } from "./cme-aggregate-model-state";
import { CmeProfileModel } from "../cme-profile-model";
import { CmeSemanticModel } from "../cme-semantic-model";

export interface CmeAggregateModelApi {

  profileModel: (identifier: ModelDsIdentifier) =>
    CmeProfileModel | null;

  profileClass: (identifier: EntityDsIdentifier) =>
    CmeProfileClassAggregate | null;

  profileRelationship: (identifier: EntityDsIdentifier) =>
    CmeProfileRelationshipAggregate | null;

  semanticModel: (identifier: ModelDsIdentifier) =>
    CmeSemanticModel | null;

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
    profileModel: (identifier) =>
      reference.current.profileModels[identifier] ?? null,
    profileClass: (identifier) =>
      reference.current.profileClasses[identifier] ?? null,
    profileRelationship: (identifier) =>
      reference.current.profileRelationships[identifier] ?? null,
    // ...
    semanticModel: (identifier) =>
      reference.current.semanticModels[identifier] ?? null,
    semanticClass: (identifier) =>
      reference.current.semanticClasses[identifier] ?? null,
    semanticRelationship: (identifier) =>
      reference.current.semanticRelationships[identifier] ?? null,
    generalization: (identifier) =>
      reference.current.generalizations[identifier] ?? null,
  }
}
