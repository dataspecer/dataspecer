import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship, SemanticModelClass, SemanticModelRelationship, type SemanticModelEntity, type SemanticModelGeneralization } from "../../concepts/index.ts";
import { SemanticEntityIdMerger } from "./interface.ts";

function compareVectors(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) {
    if (a[i]! < b[i]!) {
      return 1;
    } else if (a[i]! > b[i]!) {
      return -1;
    }
  }
  return 0;
}

/**
 * Takes into account only the entity (as a whole) with stronger semantics.
 */
export class StrongerWinsSemanticEntityIdMerger implements SemanticEntityIdMerger {
  mergeClasses(classes: SemanticModelClass[]): SemanticModelClass {
    const vectors = classes.map((cls) => [
      cls,
      [
        Object.values(cls?.name ?? {}).length, // Number of names
        Object.values(cls?.description ?? {}).length, // Number of descriptions
      ],
    ]) as [SemanticModelClass, number[]][];
    // Sort as vectors
    vectors.sort((a, b) => compareVectors(a[1], b[1]));

    return vectors[0]![0];
  }

  mergeRelationships(relationships: SemanticModelRelationship[]): SemanticModelRelationship {
    const vectors = relationships.map((relationship) => [
      relationship,
      [
        Object.values(relationship.ends[1]?.name ?? {}).length, // Number of names
        Object.values(relationship.ends[1]?.description ?? {}).length, // Number of descriptions
        Object.values(relationship.ends[0]?.name ?? {}).length, // Number of names
        Object.values(relationship.ends[0]?.description ?? {}).length, // Number of descriptions
      ],
    ]) as [SemanticModelRelationship, number[]][];

    // Sort as vectors
    vectors.sort((a, b) => compareVectors(a[1], b[1]));

    return vectors[0]![0];
  }

  mergeGeneralizations(generalizations: SemanticModelGeneralization[]): SemanticModelGeneralization {
    const child = new Set(generalizations.map(g => g.child));
    const parent = new Set(generalizations.map(g => g.parent));

    if (child.size === 1 && parent.size === 1) {
      return generalizations[0]!;
    }

    console.error(`Unable to merge generalizations with colliding id ${generalizations[0]!.id} because they have different child and parent. Falling back to the first one.`, generalizations);
    return generalizations[0]!;
  }

  merge(entities: SemanticModelEntity[]): SemanticModelEntity {
    if (entities.every(isSemanticModelClass)) {
      return this.mergeClasses(entities as SemanticModelClass[]);
    }
    if (entities.every(isSemanticModelRelationship)) {
      return this.mergeRelationships(entities as SemanticModelRelationship[]);
    }
    if (entities.every(entity => isSemanticModelGeneralization(entity))) {
      return this.mergeGeneralizations(entities as SemanticModelGeneralization[]);
    }
    if (entities.every(entity => isSemanticModelClass(entity) || isSemanticModelRelationship(entity))) {
      // At least one of each type
      // This covers cases when one vocabulary defines that something external is an rdfs:Class even though it is a property.
      return this.mergeRelationships(entities.filter(isSemanticModelRelationship) as SemanticModelRelationship[]);
    }

    console.error(`Unable to merge entities with colliding id ${entities[0]!.id} because they are of unsupported types. Falling back to the first one.`, entities);
    return entities[0]!;
  }
}
