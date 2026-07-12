import { EntityIdentifier } from "../../../entity-model/entity.ts";
import { SemanticModelClass } from "../../concepts/concepts.ts";
import { isSemanticModelClass } from "../../concepts/index.ts";
import {
  isSemanticModelClassProfile,
  SemanticModelClassProfile,
} from "../concepts/index.ts";
import {
  AggregatedProfiledSemanticModelClass,
  isAggregatedProfiledSemanticModelClass,
} from "./aggregator-concepts.ts";
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

function getDependencies(
  entity: SemanticModelClassProfile,
): EntityIdentifier[] {
  // All dependencies are defined just by the values the profiles.
  return entity.profiling;
}

function aggregateSemanticModelClassProfile(
  profile: SemanticModelClassProfile,
  dependencies: (
    SemanticModelClass |
    SemanticModelClassProfile |
    AggregatedProfiledSemanticModelClass
  )[],
): AggregatedProfiledSemanticModelClass {

  // A helper for easy access to dependencies.
  const getProfiled = createProfiledGetter(dependencies);

  // We try to get an entity to get the name from.
  // Since all entities share name we just try to read it directly.
  // For the property we need to check if the value is a non-profile.
  const nameProfiled = getProfiled(profile.nameFromProfiled);
  const name = nameProfiled?.name ?? profile.name;
  const nameProperty = isSemanticModelClass(nameProfiled)
    ? (nameProfiled.nameProperty ?? null) : null;

  // Description is similar to name in processing.
  const descriptionProfiled = getProfiled(profile.descriptionFromProfiled);
  const description = descriptionProfiled?.description ?? profile.description;
  const descriptionProperty = isSemanticModelClass(descriptionProfiled)
    ? (descriptionProfiled.descriptionProperty ?? null) : null;

  // Unlike name and description usage note does not exists on a class.
  // As a result we type check before reading it.
  const usageNoteProfiled = getProfiled(profile.usageNoteFromProfiled);
  const usageNote = isSemanticModelClassProfile(usageNoteProfiled)
    ? usageNoteProfiled.usageNote : profile.usageNote;

  // We need to collect IRI from vocabulary and propagate it toward
  // the aggregated profile.
  const conceptIris: string[] = [];

  // We need to collect identifiers of the non-profile (root) entities
  // and propagate them toward the aggregated profile.
  const conceptIdentifiers: EntityIdentifier[] = [];

  // We collect all properties along the way.
  // The ideas is to merge even unknown properties into the result.
  const propertiesCollector: Record<string, unknown> = {};

  // Iterate over all entities we profile.
  for (const identifier of profile.profiling) {
    const profiled = getProfiled(identifier);
    if (profiled === null) {
      continue;
    }
    // We go from the most specific types to the general one.
    if (isAggregatedProfiledSemanticModelClass(profiled)) {
      conceptIris.push(...profiled.conceptIris);
      conceptIdentifiers.push(...profiled.conceptIdentifiers);
    } else if (isSemanticModelClassProfile(profiled)) {
      // conceptIris and conceptIdentifiers properties are not part of this type.
    } else if (isSemanticModelClass(profiled)) {
      if (profiled.iri !== null) {
        conceptIris.push(profiled.iri);
      }
      conceptIdentifiers.push(profiled.id);
    }
    // Collect all properties.
    Object.assign(propertiesCollector, profiled);
  }

  return {
    // We start by unpacking all we have collected.
    // This can be anything so we put it there wrist to overwrite it with
    // more specific options.
    ...propertiesCollector,
    // Next we put all values from the profile.
    ...profile,
    // Now we manually assemble the entity to be explicit
    // on about how and what is part of the result.
    id: profile.id,
    type: ["class-profile", "aggregate"],
    iri: profile.iri,
    name: name,
    nameFromProfiled: profile.nameFromProfiled,
    description: description,
    descriptionFromProfiled: profile.descriptionFromProfiled,
    profiling: profile.profiling,
    usageNote: usageNote,
    usageNoteFromProfiled: profile.usageNoteFromProfiled,
    externalDocumentationUrl: profile.externalDocumentationUrl,
    tags: profile.tags,
    order: profile.order ?? null,
    controlledVocabularies: profile.controlledVocabularies,
    // Aggregate entities.
    conceptIris: [...new Set(conceptIris)],
    conceptIdentifiers: [...new Set(conceptIdentifiers)],
    nameProperty: nameProperty,
    descriptionProperty: descriptionProperty,
  };
}
