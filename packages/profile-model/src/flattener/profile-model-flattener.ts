import {
  ClassProfile,
  GeneralizationProfile,
  isClassProfile,
  isGeneralizationProfile,
  isRelationshipProfile,
  ProfileEntity,
  ProfileEntityRecord,
  ProfileModel,
  RelationshipEndProfile,
  RelationshipProfile,
} from "../profile-model.ts";
import { cardinalitiesIntersection } from "../utilities.ts";

/**
 * Flattening aim to produce a profile model that is of the same
 * function as the given models.
 *
 * Unlike aggregation the objective is not to produce final values.
 *
 * When we need to flatten a profile there is actually not that much work.
 * We know that we have what we need on the top level.
 * We just need to reach down the hierarchy for name, description, .. etc.
 *
 * @param identifier Identifier for the newly created model.
 */
export function flattenProfileModels(
  identifier: string,
  dependencies: ProfileModel[],
  top: ProfileModel,
): ProfileModel {
  const map = createProfileEntityRecord(dependencies);
  const entities: ProfileEntityRecord = {};
  for (const entity of Object.values(top.getEntities())) {
    const next = flattenEntity(map, entity);
    if (next === null) {
      continue;
    }
    entities[next.id] = next;
  }
  return {
    getId: () => identifier,
    /**
     * @returns Null as there is no common prefix.
     */
    getBaseIri: () => null,
    getEntities: () => entities,
  };
}

function createProfileEntityRecord(
  models: ProfileModel[],
): ProfileEntityRecord {
  const result: ProfileEntityRecord = {};
  for (const model of models) {
    for (const entity of Object.values(model.getEntities())) {
      result[entity.id] = entity;
    }
  }
  return result;
}

function flattenEntity(
  dependencies: ProfileEntityRecord, entity: ProfileEntity,
): ProfileEntity | null {
  if (isClassProfile(entity)) {
    return flattenClassProfile(dependencies, entity);
  } else if (isRelationshipProfile(entity)) {
    return flattenRelationshipProfile(dependencies, entity);
  } else if (isGeneralizationProfile(entity)) {
    return flattenGeneralizationProfile(entity);
  } else {
    // We ignore unknown entity.
    console.warn("Ignored entity of unknown type for flattening.", { entity });
    return null;
  }
}

export function flattenClassProfile(
  dependencies: ProfileEntityRecord,
  profile: ClassProfile,
): ClassProfile {
  // Name
  let name = profile.name;
  let nameFromProfiled = profile.nameFromProfiled;
  walkProfiles(dependencies, isClassProfile, (next) => {
    name = next.name;
    nameFromProfiled = next.nameFromProfiled;
    return next.nameFromProfiled;
  }, nameFromProfiled);
  // Description
  let description = profile.description;
  let descriptionFromProfiled = profile.descriptionFromProfiled;
  walkProfiles(dependencies, isClassProfile, (next) => {
    description = next.description;
    descriptionFromProfiled = next.descriptionFromProfiled;
    return next.descriptionFromProfiled;
  }, descriptionFromProfiled);
  // UsageNote
  let usageNote = profile.usageNote;
  let usageNoteFromProfiled = profile.usageNoteFromProfiled;
  walkProfiles(dependencies, isClassProfile, (next) => {
    usageNote = next.usageNote;
    usageNoteFromProfiled = next.usageNoteFromProfiled;
    return next.usageNoteFromProfiled;
  }, usageNoteFromProfiled);
  // Profiling
  let profiling = collectProfiling(dependencies, isClassProfile,
    (next) => next.profiling, profile.profiling);
  return {
    id: profile.id,
    type: profile.type,
    iri: profile.iri,
    name,
    nameFromProfiled,
    description,
    descriptionFromProfiled,
    usageNote,
    usageNoteFromProfiled,
    externalDocumentationUrl: profile.externalDocumentationUrl,
    profiling,
    tags: profile.tags,
  }
}

/**
 * For each profile call the callback.
 * The callback return identifier of next profile to walk.
 */
function walkProfiles<ProfileType extends ProfileEntity>(
  dependencies: ProfileEntityRecord,
  guard: (what: ProfileEntity) => what is ProfileType,
  callback: (profile: ProfileType) => string | null,
  identifier: string | null,
): void {
  while (identifier !== null) {
    const profile = dependencies[identifier];
    if (profile === undefined) {
      break;
    }
    if (!guard(profile)) {
      break;
    }
    identifier = callback(profile);
  }
}

/**
 * Check recursively all profiles and return all non-resolved profiles.
 * The non-resolved profiles should be references outside the dependencies,
 * i.e. to the vocabulary.
 */
function collectProfiling<ProfileType extends ProfileEntity>(
  dependencies: ProfileEntityRecord,
  guard: (what: ProfileEntity) => what is ProfileType,
  callback: (profile: ProfileType) => string[],
  identifiers: string[],
): string[] {
  const result: string[] = [];
  const visited = new Set();
  const queue = [...identifiers];
  while (queue.length > 0) {
    const next = queue.pop();
    if (visited.has(next) || next === undefined) {
      continue;
    }
    const profile = dependencies[next];
    if (profile === undefined) {
      // Outside of the dependencies.
      result.push(next);
      continue;
    }
    if (guard(profile)) {
      queue.push(...callback(profile));
    } else {
      console.warn("Ignored invalid profile reference.", profile);
    }
  }
  return result;
}

export function flattenRelationshipProfile(
  dependencies: ProfileEntityRecord,
  profile: RelationshipProfile,
): RelationshipProfile {
  return {
    id: profile.id,
    type: profile.type,
    ends: profile.ends.map((end, index) => {
      // Name
      let name = end.name;
      let nameFromProfiled = end.nameFromProfiled;
      walkRelationshipEndProfiles(dependencies, (next) => {
        name = next.name;
        nameFromProfiled = next.nameFromProfiled;
        return next.nameFromProfiled;
      }, nameFromProfiled, index);
      // Description
      let description = end.description;
      let descriptionFromProfiled = end.descriptionFromProfiled;
      walkRelationshipEndProfiles(dependencies, (next) => {
        description = next.description;
        descriptionFromProfiled = next.descriptionFromProfiled;
        return next.descriptionFromProfiled;
      }, descriptionFromProfiled, index);
      // UsageNote
      let usageNote = end.usageNote;
      let usageNoteFromProfiled = end.usageNoteFromProfiled;
      walkRelationshipEndProfiles(dependencies, (next) => {
        usageNote = next.usageNote;
        usageNoteFromProfiled = next.usageNoteFromProfiled;
        return next.usageNoteFromProfiled;
      }, usageNoteFromProfiled, index);
      // Profiling and cardinality.
      let cardinality: [number, number | null] | null = null;
      let profiling = collectProfiling(dependencies, isRelationshipProfile,
        (next) => {
          let nextEnd = next.ends[index];
          if (nextEnd === undefined) {
            return [];
          }
          // Update cardinality.
          cardinality = cardinalitiesIntersection(
            cardinality, nextEnd.cardinality);
          // Return next to navigate.
          return nextEnd.profiling;
        }, end.profiling);
      return {
        iri: end.iri,
        name,
        nameFromProfiled,
        description,
        descriptionFromProfiled,
        usageNote,
        usageNoteFromProfiled,
        externalDocumentationUrl: end.externalDocumentationUrl,
        profiling,
        tags: end.tags,
        //
        cardinality: cardinality,
        concept: end.concept,
      }
    }),
  };
}

function walkRelationshipEndProfiles(
  dependencies: ProfileEntityRecord,
  callback: (profile: RelationshipEndProfile) => string | null,
  identifier: string | null,
  index: number,
): void {
  walkProfiles(dependencies, isRelationshipProfile, (next) => {
    let nextEnd = next.ends[index];
    if (nextEnd === undefined) {
      return null;
    }
    return callback(nextEnd);
  }, identifier);
}

export function flattenGeneralizationProfile(
  profile: GeneralizationProfile,
): GeneralizationProfile {
  // There is nothing to profile, generalization is complete as it is.
  return profile;
}
