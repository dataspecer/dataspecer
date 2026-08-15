import { EntityIdentifier } from "../../../entity-model/entity.ts";
import { SemanticModelClass } from "../../concepts/concepts.ts";
import { isSemanticModelClass } from "../../concepts/index.ts";
import {
  ControlledVocabularyAssignment,
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

  // Controlled vocabularies inherited from the entities we profile.
  const inheritedControlledVocabularies: ControlledVocabularyAssignment[] = [];
  const inheritedControlledVocabularyIdentifiers = new Set<EntityIdentifier>();

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
      // if multiple ancestors contain the same controlled vocabulary, only one is kept 
      // - this might be changed in the future to better resolve conflicts
      for (const assignment of profiled.controlledVocabularies ?? []) {
        if (!inheritedControlledVocabularyIdentifiers.has(assignment.identifier)) {
          inheritedControlledVocabularyIdentifiers.add(assignment.identifier);
          inheritedControlledVocabularies.push(assignment);
        }
      }
    } else if (isSemanticModelClassProfile(profiled)) {
      // conceptIris and conceptIdentifiers properties are not part of this type - do nothing
      // controlledVocabularies is available even when the dependency was not aggregated
      for (const assignment of profiled.controlledVocabularies ?? []) {
        if (!inheritedControlledVocabularyIdentifiers.has(assignment.identifier)) {
          inheritedControlledVocabularyIdentifiers.add(assignment.identifier);
          inheritedControlledVocabularies.push(assignment);
        }
      }
    } else if (isSemanticModelClass(profiled)) {
      if (profiled.iri !== null) {
        conceptIris.push(profiled.iri);
      }
      conceptIdentifiers.push(profiled.id);
    }
    // Collect all properties.
    Object.assign(propertiesCollector, profiled);
  }

  // This profile's own assignments (additions/overrides) take precedence
  // over anything inherited for the same vocabulary identifier.
  const ownControlledVocabularyIdentifiers = new Set(
    (profile.controlledVocabularies ?? []).map(assignment => assignment.identifier));
  const controlledVocabularies: ControlledVocabularyAssignment[] = [
    ...inheritedControlledVocabularies.filter(
      assignment => !ownControlledVocabularyIdentifiers.has(assignment.identifier)),
    ...(profile.controlledVocabularies ?? []),
  ];

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
    controlledVocabularies: controlledVocabularies,
    // Aggregate entities.
    conceptIris: [...new Set(conceptIris)],
    conceptIdentifiers: [...new Set(conceptIdentifiers)],
    nameProperty: nameProperty,
    descriptionProperty: descriptionProperty,
  };
}
