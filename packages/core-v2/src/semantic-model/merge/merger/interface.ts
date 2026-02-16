import { SemanticModelClass, SemanticModelRelationship, type SemanticModelEntity } from "../../concepts/index.ts";

/**
 * Merges same entities that have same id. The same id is a requirement
 * otherwise the surroundings of the given entity must be taken into account
 * which is more complex issue.
 *
 * https://schema.org/version/latest/schemaorg-current-https.ttl defines
 * `prov:atTime a rdfs:Class .` which is technically correct (because
 * rdfs:Property is a rdfs:Class). Therefore, the merging logic must be applied
 * to entities in general, because we want to merge `prov:atTime` as a class
 * without any information with `prov:atTime` as a property.
 */
export interface SemanticEntityIdMerger {
  mergeClasses(classes: SemanticModelClass[]): SemanticModelClass;
  mergeRelationships(relationships: SemanticModelRelationship[]): SemanticModelRelationship;

  merge(entities: SemanticModelEntity[]): SemanticModelEntity;
}
