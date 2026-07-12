import { EntityIdentifier } from "../../../entity-model/entity.ts";
import { isSemanticModelRelationship } from "../../concepts/concepts-utils.ts";
import { SemanticModelRelationship } from "../../concepts/concepts.ts";
import {
  isSemanticModelRelationshipProfile,
  SemanticModelRelationshipProfile,
} from "../concepts/index.ts";
import {
  AggregatedProfiledSemanticModelRelationship,
  AggregatedProfiledSemanticModelRelationshipEnd,
  isAggregatedProfiledSemanticModelRelationship,
} from "./aggregator-concepts.ts";
import { createProfiledGetter } from "./utilities.ts";

export const SemanticRelationshipProfileAggregator = {
  /**
   * @returns List of all entities this entity depends on for aggregation.
   */
  dependencies: getDependencies,
  /**
   * @returns Aggregated entity.
   */
  aggregate: aggregateSemanticModelRelationshipProfile,
};


function getDependencies(
  entity: SemanticModelRelationshipProfile,
): EntityIdentifier[] {
  // All dependencies are defined just by the values the profiles.
  // We just need to collect them from end.
  return entity.ends.map(item => item.profiling).flat()
}

function aggregateSemanticModelRelationshipProfile(
  profile: SemanticModelRelationshipProfile,
  dependencies: (
    SemanticModelRelationship |
    SemanticModelRelationshipProfile |
    AggregatedProfiledSemanticModelRelationship
  )[],
): AggregatedProfiledSemanticModelRelationship {

  // A helper for easy access to dependencies.
  const getProfiled = createProfiledGetter(dependencies);

  return {
    // We start by unpacking the profile itself.
    ...profile,
    // Now the properties defined by the type.
    id: profile.id,
    type: ["relationship-profile", "aggregate"],
    // The most complex part are the ends.
    // They match based on their ordering.
    ends: profile.ends.map((end, index) => {

      // We try to get an entity to get the name from.
      // Since all entities share name we just try to read it directly.
      // For the property we need to check if the value is a non-profile.
      const nameProfiled = getProfiled(end.nameFromProfiled);
      const name = nameProfiled?.ends[index]?.name ?? end.name;
      const nameProperty = isSemanticModelRelationship(nameProfiled)
        ? (nameProfiled.ends[index]?.nameProperty ?? null) : null;

      // Description is similar to name in processing.
      const descriptionProfiled = getProfiled(end.descriptionFromProfiled);
      const description = descriptionProfiled?.ends[index]?.description ?? end.description;
      const descriptionProperty = isSemanticModelRelationship(descriptionProfiled)
        ? (descriptionProfiled.ends[index]?.descriptionProperty ?? null) : null;

      // Unlike name and description usage note does not exists on a class.
      // As a result we type check before reading it.
      const usageNoteProfiled = getProfiled(end.usageNoteFromProfiled);
      const usageNote = isSemanticModelRelationshipProfile(usageNoteProfiled)
        ? (usageNoteProfiled.ends[index]?.usageNote ?? null) : end.usageNote;

      // We start by collecting ends from all profiled entities.
      const profiled = end.profiling
        .map(getProfiled)
        .filter(item => item !== null);

      // We need to collect IRI from vocabulary and propagate it toward
      // the aggregated profile.
      const conceptIris: string[] = profiled.map(entity => {
        if (isSemanticModelRelationship(entity)) {
          const end = entity.ends[index];
          if (end === undefined || end.iri === null) {
            return [];
          }
          return [end.iri];
        } else if (isAggregatedProfiledSemanticModelRelationship(entity)) {
          const end = entity.ends[index];
          if (end === undefined) {
            return [];
          }
          return end.conceptIris;
        } else {
          return [];
        }
      }).flat();

      // We need to collect identifiers of the non-profile (root) entities
      // and propagate them toward the aggregated profile.
      const conceptIdentifiers: EntityIdentifier[] = profiled.map(entity => {
        if (isSemanticModelRelationship(entity)) {
          const end = entity.ends[index];
          if (end === undefined) {
            return [];
          }
          return [entity.id];
        } else if (isAggregatedProfiledSemanticModelRelationship(entity)) {
          const end = entity.ends[index];
          if (end === undefined) {
            return [];
          }
          return end.conceptIdentifiers;
        } else {
          return [];
        }
      }).flat();

      // Prepare all ends we should profile.
      // We read ends on the same position.
      const profiledEnds = profiled
        .map(item => item.ends[index])
        .filter(item => item !== undefined);

      // Reduce all ends into a common base.
      // This enable us to preserve additional properties.
      const base = profiledEnds.reduce(
        (previous, current) => ({ ...previous, ...current }), {});

      const cardinality = cardinalityIntersection(
        profiledEnds.map(item => item.cardinality)
          .filter(item => item !== undefined && item !== null));

      return {
        // We expand the base and values from this end.
        ...base,
        ...end,
        // Now we manually assemble the entity to be explicit
        // on about how and what is part of the result.
        iri: end.iri,
        name: name,
        nameFromProfiled: end.nameFromProfiled,
        nameProperty: nameProperty,
        description: description,
        descriptionFromProfiled: end.descriptionFromProfiled,
        descriptionProperty: descriptionProperty,
        profiling: end.profiling,
        usageNote: usageNote,
        usageNoteFromProfiled: end.usageNoteFromProfiled,
        externalDocumentationUrl: end.externalDocumentationUrl,
        tags: end.tags,
        order: end.order ?? null,
        concept: end.concept,
        cardinality: cardinality,
        // Aggregate entities.
        conceptIris: [...new Set(conceptIris)],
        conceptIdentifiers: [...new Set(conceptIdentifiers)],
      };
    })
  };
}

/**
 * @returns Null if there is no information about the cardinality.
 */
function cardinalityIntersection(
  cardinalities: [number, number | null][]
): [number, number | null] | null {
  if (cardinalities.length === 0) {
    return null;
  }

  // We need to determine the intersection.
  return cardinalities.reduce((previous, current) => {
    const lower = Math.max(previous[0], current[0]);
    if (previous[1] === null && current[1] === null) {
      return [lower, null];
    } else if (previous[1] !== null && current[1] !== null) {
      return [lower, Math.min(previous[1], current[1])];
    } else if (previous[1] !== null) {
      return [lower, previous[1]];
    } else {
      return [lower, current[1]];
    }
  }, [0, null]);
}
