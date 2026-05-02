import { EntityIdentifier } from "../../../entity-model/entity.ts";
import { isSemanticModelRelationship } from "../../concepts/concepts-utils.ts";
import { SemanticModelRelationship } from "../../concepts/concepts.ts";
import {
  isSemanticModelRelationshipProfile,
  SemanticModelRelationshipProfile,
} from "../concepts/index.ts";
import { AggregatedProfiledSemanticModelRelationship, AggregatedProfiledSemanticModelRelationshipEnd } from "./aggregator-model.ts";
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
  return entity.ends.map(item => item.profiling).flat()
}

function aggregateSemanticModelRelationshipProfile(
  profile: SemanticModelRelationshipProfile,
  dependenciesArray: (
    SemanticModelRelationshipProfile |
    SemanticModelRelationship |
    AggregatedProfiledSemanticModelRelationship
  )[],
): AggregatedProfiledSemanticModelRelationship {
  const profiled = createProfiledGetter(dependenciesArray, profile);

  return {
    // Add all properties from the profile.
    ...profile as {}, // enforce all members to be explicitly defined
    //
    id: profile.id,
    type: profile.type,
    //
    ends: profile.ends.map((end, index) => ({
      // Add all properties from the profile and profiled entities.
      ...end.profiling.map(profiled).reduce((p, c) => Object.assign(p, c?.ends[index]), {}) as {}, // enforce all members to be explicitly defined
      ...end as {}, // enforce all members to be explicitly defined
      //
      profiling: end.profiling,
      iri: end.iri,
      externalDocumentationUrl: end.externalDocumentationUrl,
      tags: end.tags,
      //
      name: profiled(end.nameFromProfiled)?.ends[index]?.name ?? end.name ?? null,
      nameFromProfiled: end.nameFromProfiled,
      nameProperty: end.nameProperty ?? null, // do not inherit, this is specific to this profile
      //
      description: profiled(end.descriptionFromProfiled)?.ends[index]?.description ?? end.description ?? null,
      descriptionFromProfiled: end.descriptionFromProfiled,
      descriptionProperty: end.descriptionProperty ?? null, // do not inherit, this is specific to this profile
      //
      usageNote: (() => {
        // We need to do some computation.
        const source = profiled(end.usageNoteFromProfiled);
        if (isSemanticModelRelationshipProfile(source)) {
          return source.ends[index]?.usageNote ?? end.usageNote;
        } else {
          return end.usageNote;
        }
      })(),
      usageNoteFromProfiled: end.usageNoteFromProfiled,
      concept: end.concept,
      cardinality: (() => {
        const cardinalities = end.profiling
          .map(identifier => profiled(identifier))
          .map(item => item?.ends?.[index]?.cardinality)
          .filter(item => item !== undefined && item !== null)

        if (end.cardinality !== null) {
          cardinalities.push(end.cardinality);
        }
        if (cardinalities.length === 0) {
          // Nothing has been specified.
          return null;
        }
        return cardinalityIntersection(cardinalities);
      })(),
      conceptIris: Array.from(new Set(end.profiling
        .map(identifier => profiled(identifier))
        .map(item => {
          if (isSemanticModelRelationship(item) && !isSemanticModelRelationshipProfile(item) && item.ends?.[index]?.iri) {
            return item.ends[index].iri;
          } else if (isSemanticModelRelationshipProfile(item) && "conceptIris" in (item.ends?.[index] ?? {})) {
            const end = item.ends[index] as AggregatedProfiledSemanticModelRelationshipEnd;
            return end.conceptIris;
          } else {
            return "";
          }
        })
        .flat()
        .filter(item => item && item !== ""))),
    })),
  }
}

function cardinalityIntersection(
  cardinalities: [number, number | null][]
): [number, number | null] {
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
