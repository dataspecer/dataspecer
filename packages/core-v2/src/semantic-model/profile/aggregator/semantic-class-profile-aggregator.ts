import { EntityIdentifier } from "../../../entity-model/entity.ts";
import { SemanticModelClass } from "../../concepts/concepts.ts";
import { isSemanticModelClass } from "../../concepts/index.ts";
import {
  ControlledVocabularyAssignment,
  isControlledVocabularyAssignment,
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
  return [...entity.profiling, ...(entity.controlledVocabularies ?? [])];
}

function aggregateSemanticModelClassProfile(
  profile: SemanticModelClassProfile,
  dependencies: (
    SemanticModelClass |
    SemanticModelClassProfile |
    AggregatedProfiledSemanticModelClass |
    ControlledVocabularyAssignment
  )[],
): AggregatedProfiledSemanticModelClass {

  // A helper for easy access to dependencies. 
  const getProfiled = createProfiledGetter(dependencies);

  // We try to get an entity to get the name from.
  // Since all entities share name we just try to read it directly.
  const nameProfiled = getProfiled(profile.nameFromProfiled) as
    SemanticModelClass | SemanticModelClassProfile | AggregatedProfiledSemanticModelClass | null;
  const name = nameProfiled?.name ?? profile.name;
  // We inherit the property only for vocabulary entities and already aggregated entities.
  const nameProperty = (nameProfiled as SemanticModelClass | AggregatedProfiledSemanticModelClass | null)?.nameProperty ?? null;

  // Description is similar to name in processing.
  const descriptionProfiled = getProfiled(profile.descriptionFromProfiled) as
    SemanticModelClass | SemanticModelClassProfile | AggregatedProfiledSemanticModelClass | null;
  const description = descriptionProfiled?.description ?? profile.description;
  // We inherit the property only for vocabulary entities and already aggregated entities.
  const descriptionProperty = (descriptionProfiled  as SemanticModelClass | AggregatedProfiledSemanticModelClass | null)?.descriptionProperty ?? null;

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

  // Ids of the assignments of the entities we profile, own and inheritedby them. 
  // We do not resolve them, we treat assignments as opaque,
  // only the assignments of this profile are read, see below.
  const profiledAssignmentIds = new Set<EntityIdentifier>();

  // Iterate over all entities we profile.
  for (const identifier of profile.profiling) {
    const profiled = getProfiled(identifier);
    if (profiled === null) {
      continue;
    }
    // We go from the most specific types to the general one.
    // todo Part of Dataspecer expects the aggregated profile to be of type class, so we cannot check only for class type here.
    if (isAggregatedProfiledSemanticModelClass(profiled)) {
      conceptIris.push(...profiled.conceptIris);
      conceptIdentifiers.push(...profiled.conceptIdentifiers);
      profiled.controlledVocabularies?.forEach(id => profiledAssignmentIds.add(id));
    } else if (isSemanticModelClassProfile(profiled)) {
      // conceptIris and conceptIdentifiers properties are not part of this type - do nothing
      // controlledVocabularies is available even when the dependency was not aggregated
      profiled.controlledVocabularies?.forEach(id => profiledAssignmentIds.add(id));
    } else if (isSemanticModelClass(profiled)) {
      if (profiled.iri !== null) {
        conceptIris.push(profiled.iri);
      }
      conceptIdentifiers.push(profiled.id);
    }
    // Collect all properties.
    Object.assign(propertiesCollector, profiled);
  }

  // An own assignment removes the inherited assignment it replaces.
  // An imported reference cannot be resolved locally, so it removes nothing.
  const replacedAssignmentIds = new Set(
    (profile.controlledVocabularies ?? [])
      .map(id => getProfiled(id))
      .filter(isControlledVocabularyAssignment)
      .flatMap(assignment =>
        assignment.replaces?.kind === "local" ? [assignment.replaces.target] : []));

  const controlledVocabularies: EntityIdentifier[] = [
    ...[...profiledAssignmentIds].filter(id => !replacedAssignmentIds.has(id)),
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
