import { Entity, EntityIdentifier } from "../../../entity-model/entity.ts";
import { LanguageString, SemanticModelClass } from "../../concepts/concepts.ts";
import { isSemanticModelClass } from "../../concepts/index.ts";
import {
  isSemanticModelClassProfile,
  SemanticModelClassProfile,
} from "../concepts/index.ts";
import { AggregatedProfiledSemanticModelClass } from "./aggregator-model.ts";
import { createProfiledGetter } from "./utilities.ts";

export const SemanticClassProfileAggregator = {
  /**
   * @returns List of all entities this entity depends on for aggregation.
   */
  dependencies: getDependencies,
  /**
   * @returns Aggregated entity.
   */
  aggregate: aggregateSemanticModelClassProfile,
};

export function isAggregatedProfiledSemanticModelClass(
  entity: Entity | null,
): entity is AggregatedProfiledSemanticModelClass {
  return isSemanticModelClassProfile(entity) && "conceptIris" in entity;
}

function getDependencies(
  entity: SemanticModelClassProfile,
): EntityIdentifier[] {
  return entity.profiling;
}

function aggregateSemanticModelClassProfile(
  profile: SemanticModelClassProfile,
  dependenciesArray: (
    SemanticModelClass |
    SemanticModelClassProfile |
    AggregatedProfiledSemanticModelClass
  )[],
): AggregatedProfiledSemanticModelClass {
  const profiled = createProfiledGetter(dependenciesArray, profile);

  let usageNote: LanguageString | null = null;
  const usageNoteProfiled = profiled(profile.usageNoteFromProfiled);
  if (isSemanticModelClassProfile(usageNoteProfiled)) {
    usageNote = usageNoteProfiled.usageNote;
  } else {
    usageNote = profile.usageNote;
  }

  // This collect all properties that are part of the profiled
  // entities and merges them into the aggregated one.
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
    nameProperty: profile.nameProperty ?? null, // do not inherit, this is specific to this profile
    //
    description: profiled(profile.descriptionFromProfiled)?.description ?? profile.description ?? null,
    descriptionFromProfiled: profile.descriptionFromProfiled,
    descriptionProperty: profile.descriptionProperty ?? null, // do not inherit, this is specific to this profile
    //
    conceptIris: Array.from(new Set(conceptIris)),
  } satisfies AggregatedProfiledSemanticModelClass;
}
