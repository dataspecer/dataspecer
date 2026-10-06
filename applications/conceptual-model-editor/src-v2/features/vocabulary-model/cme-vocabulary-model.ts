import { Entity } from "@dataspecer/core-v2";
import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
  SemanticModelClass,
  SemanticModelEntity,
  SemanticModelGeneralization,
  SemanticModelRelationship,
  SemanticModelRelationshipEnd,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { ModelIdentifier } from "@dataspecer/core/model";

/**
 * The Dataspecer core Entity is missing two things we need:
 * - An uniq identifier for an entity.
 * - Reference to a model.
 * As we need both of those in CME we wrap the entity with out custom type.
 */
export interface CmeVocabularyEntity {

  /**
   * Application wide uniq identifier of an entity.
   */
  id: string;

  model: ModelIdentifier;

  entity: SemanticModelEntity;

}

export interface CmeVocabularyClass extends CmeVocabularyEntity {

  entity: SemanticModelClass;

}

export function isCmeVocabularyClass(
  entity: CmeVocabularyEntity,
): entity is CmeVocabularyClass {
  return isSemanticModelClass(entity.entity);
}

export interface CmeVocabularyRelation extends CmeVocabularyEntity {

  entity: SemanticModelRelationship;

  domainEnd: SemanticModelRelationshipEnd | null;

  rangeEnd: SemanticModelRelationshipEnd | null;

}

export function isCmeVocabularyRelation(
  entity: CmeVocabularyEntity,
): entity is CmeVocabularyRelation {
  return isSemanticModelRelationship(entity.entity);
}

export interface CmeVocabularyGeneralization extends CmeVocabularyEntity {

  entity: SemanticModelGeneralization;

}

export function isCmeVocabularyGeneralization(
  entity: CmeVocabularyEntity,
): entity is CmeVocabularyGeneralization {
  return isSemanticModelGeneralization(entity.entity);
}

export function wrapAsCmeVocabularyEntity(
  model: ModelIdentifier,
  entity: Entity,
): CmeVocabularyEntity[] {
  const result: CmeVocabularyEntity[] = [];
  if (isSemanticModelClass(entity)) {
    result.push({
      model, entity,
      id: createIdentifier(model, entity, "semantic-class"),
    } satisfies CmeVocabularyClass);
  }
  if (isSemanticModelRelationship(entity)) {
    const [first, second] = entity.ends;
    // End with IRI is the range.
    if (first !== undefined && first.iri !== null) {
      const next: CmeVocabularyRelation = {
        model, entity,
        domainEnd: second,
        rangeEnd: first,
        id: createIdentifier(model, entity, "semantic-relationship"),
      };
      result.push(next);
    } else if (second !== undefined && second.iri !== null) {
      const next: CmeVocabularyRelation = {
        model, entity,
        domainEnd: first,
        rangeEnd: second,
        id: createIdentifier(model, entity, "semantic-relationship"),
      };
      result.push(next);
    }
  }
  if (isSemanticModelGeneralization(entity)) {
    result.push({
      model, entity,
      id: createIdentifier(model, entity, "semantic-generalization"),
    } satisfies CmeVocabularyGeneralization);
  }
  return result;
}

function createIdentifier(
  model: ModelIdentifier,
  entity: Entity,
  type: string,
): string {
  return `${model}-${entity.id}-${type}`;
}
