import { SemanticModelClass, SemanticModelRelationship } from "../../semantic-model/concepts/concepts.ts";
import { AggregatedProfiledSemanticModelClass, AggregatedProfiledSemanticModelRelationship } from "../../semantic-model/profile/aggregator/aggregator.ts";

export interface NoProfileAggregator {
  aggregateSemanticModelClass(
    entity: SemanticModelClass,
  ) : AggregatedProfiledSemanticModelClass;

  aggregateSemanticModelRelationship(
    entity: SemanticModelRelationship,
  ): AggregatedProfiledSemanticModelRelationship;
}

class DefaultNoProfileAggregator implements NoProfileAggregator {
  aggregateSemanticModelClass(entity: SemanticModelClass): AggregatedProfiledSemanticModelClass {
    return {
      ...entity,
      conceptIris: [entity.id],
    } as SemanticModelClass & AggregatedProfiledSemanticModelClass;
  }

  aggregateSemanticModelRelationship(entity: SemanticModelRelationship): AggregatedProfiledSemanticModelRelationship {
    return {
      ...entity,
      ends: entity.ends.map(end => ({
        ...end,
        conceptIris: [end.iri],
      })),
    } as SemanticModelRelationship & AggregatedProfiledSemanticModelRelationship
  }
}

export function createDefaultNoProfileAggregator(): NoProfileAggregator {
  return new DefaultNoProfileAggregator();
}