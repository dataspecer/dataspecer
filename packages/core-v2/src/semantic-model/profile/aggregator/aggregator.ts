import { Entity, EntityIdentifier } from "../../../entity-model/entity.ts";
import { isSemanticModelClass, isSemanticModelRelationship, LanguageString, SemanticModelClass, SemanticModelRelationship } from "../../concepts/index.ts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile, SemanticModelClassProfile, SemanticModelRelationshipEndProfile, SemanticModelRelationshipProfile } from "../concepts/index.ts";

/**
 * Given an entity analyze and return dependencies to other entities.
 */
export interface DependencyAnalyzer {

  /**
   * @returns Null it the entity is not known to the analyzer.
   */
  dependencies(entity: Entity) : EntityIdentifier[] | null;

}

export interface AggregatedProfiledSemanticModelClass extends SemanticModelClassProfile {

  /**
   * List of IRIs of the original classes that were referenced by the profile.
   */
  conceptIris: string[];

}

export function isAggregatedProfiledSemanticModelClass(entity: Entity | null): entity is AggregatedProfiledSemanticModelClass {
  return isSemanticModelClassProfile(entity) && "conceptIris" in entity;
}

export interface AggregatedProfiledSemanticModelRelationship extends SemanticModelRelationshipProfile {
  ends: AggregatedProfiledSemanticModelRelationshipEnd[];
}

export interface AggregatedProfiledSemanticModelRelationshipEnd extends SemanticModelRelationshipEndProfile {

  /**
   * List of IRIs of the original ends that were referenced by the profile.
   */
  conceptIris: string[];

}

export interface ProfileAggregator {

  aggregateSemanticModelClassProfile(
    profile: SemanticModelClassProfile,
    aggregatedProfiled: (SemanticModelClassProfile | SemanticModelClass | AggregatedProfiledSemanticModelClass)[],
  ) : AggregatedProfiledSemanticModelClass;

  aggregateSemanticModelRelationshipProfile(
    profile: SemanticModelRelationshipProfile,
    aggregatedProfiled: (SemanticModelRelationshipProfile | SemanticModelRelationship | AggregatedProfiledSemanticModelRelationship)[],
  ): AggregatedProfiledSemanticModelRelationship;

}

export interface ProfileEntityAggregator extends DependencyAnalyzer, ProfileAggregator {

}

class DefaultProfileEntityAggregator implements ProfileEntityAggregator {

  dependencies(entity: Entity): EntityIdentifier[] | null {
    if (isSemanticModelClassProfile(entity)) {
      return entity.profiling;
    }
    if (isSemanticModelRelationshipProfile(entity)) {
      // We need to collect from the edges.
      return entity.ends.map(item => item.profiling).flat()
    }
    return null;
  }

  aggregateSemanticModelClassProfile(
    profile: SemanticModelClassProfile,
    aggregatedProfiled: (SemanticModelClassProfile | SemanticModelClass | AggregatedProfiledSemanticModelClass)[],
  ): AggregatedProfiledSemanticModelClass {
    const profiled = createProfiledGetter(aggregatedProfiled, profile);

    let usageNote: LanguageString | null = null;
    const usageNoteProfiled = profiled(profile.usageNoteFromProfiled);
    if (usageNoteProfiled !== undefined && isSemanticModelClassProfile(usageNoteProfiled)) {
      usageNote = usageNoteProfiled.usageNote;
    } else {
      usageNote = profile.usageNote;
    }

    // This collect all properties that are part of the profiled entities and merges them into the aggregated one.
    // The goal is to allow unknown properties to be aggregated.
    const otherPropertiesAggregated: Record<string, unknown> = {};

    const conceptIris: string[] = [];
    for (const identifier of profile.profiling) {
      const profile = profiled(identifier);
      if (isSemanticModelClass(profile) && !isSemanticModelClassProfile(profile) && profile.iri) {
        conceptIris.push(profile.iri);
      } else if (isAggregatedProfiledSemanticModelClass(profile)) {
        conceptIris.push(...profile.conceptIris);
      } else {
        // SemanticModelClassProfile should never be the case.
      }

      if (profile) {
        Object.assign(otherPropertiesAggregated, profile);
      }
    }

    return {
      // Add all properties from aggregated entities and from this one.
      ...otherPropertiesAggregated as {}, // enforce all members to be explicitly defined
      ...profile as {}, // enforce all members to be explicitly defined
      //
      id: profile.id,
      type: profile.type,
      profiling: profile.profiling,
      iri: profile.iri,
      externalDocumentationUrl: profile.externalDocumentationUrl,
      tags: profile.tags,
      //
      usageNote: (profiled(profile.usageNoteFromProfiled) as SemanticModelClassProfile)?.usageNote ?? usageNote ?? null,
      usageNoteFromProfiled: profile.usageNoteFromProfiled,
      //
      name: profiled(profile.nameFromProfiled)?.name ?? profile.name ?? null,
      nameFromProfiled: profile.nameFromProfiled,
      description: profiled(profile.descriptionFromProfiled)?.description ?? profile.description ?? null,
      descriptionFromProfiled: profile.descriptionFromProfiled,
      //
      conceptIris: Array.from(new Set(conceptIris)),
    } satisfies AggregatedProfiledSemanticModelClass;
  }

  aggregateSemanticModelRelationshipProfile(
    profile: SemanticModelRelationshipProfile,
    aggregatedProfiled: (SemanticModelRelationshipProfile | SemanticModelRelationship | AggregatedProfiledSemanticModelRelationship)[],
  ): AggregatedProfiledSemanticModelRelationship {
    const profiled = createProfiledGetter(aggregatedProfiled, profile);
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
        description: profiled(end.descriptionFromProfiled)?.ends[index]?.description ?? end.description ?? null,
        descriptionFromProfiled: end.descriptionFromProfiled,
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
}

function createProfiledGetter<T extends {id: string}> (
  items: T[],
  defaultItem: T
): (id: string | null) => T | null {
  const map : Record<string, T> = {};
  items.forEach(item => map[item.id] = item);
  return (id: string | null) => map[id ?? ""] ?? defaultItem ?? null;
}

function cardinalityIntersection(
  cardinalities: [number, number | null][]
) : [number, number | null] {
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

export function createDefaultProfileEntityAggregator() : ProfileEntityAggregator {
  return new DefaultProfileEntityAggregator();
}
