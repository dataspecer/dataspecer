import {
  ProfileClass,
  ProfileGeneralization,
  isControlledVocabularyAssignment,
  isProfileClass,
  isProfileGeneralization,
  isProfileRelationship,
  ProfileEntity,
  ProfileEntityRecord,
  ProfileModel,
  ProfileRelationshipEnd,
  ProfileRelationship,
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
  if (isProfileClass(entity)) {
    return flattenClassProfile(dependencies, entity);
  } else if (isProfileRelationship(entity)) {
    return flattenRelationshipProfile(dependencies, entity);
  } else if (isProfileGeneralization(entity)) {
    return flattenGeneralizationProfile(entity);
  } else if (isControlledVocabularyAssignment(entity)) {
    // Passed through unchanged. This only keeps a class profile's own
    // assignments intact (they live in the same input model as the
    // profile and are copied over id-for-id here); an assignment
    // inherited from an ancestor in `dependencies` is never reached by
    // this function at all (dependencies are never iterated for output,
    // only looked up by id) and so is dropped - not implemented, see
    // flattenClassProfile.
    return entity;
  } else {
    // We ignore unknown entity.
    console.warn("Ignored entity of unknown type for flattening.", { entity });
    return null;
  }
}

export function flattenClassProfile(
  dependencies: ProfileEntityRecord,
  profile: ProfileClass,
): ProfileClass {
  // Name
  let name = profile.name;
  let nameFromProfiled = profile.nameFromProfiled;
  walkProfiles(dependencies, isProfileClass, (next) => {
    name = next.name;
    nameFromProfiled = next.nameFromProfiled;
    return next.nameFromProfiled;
  }, nameFromProfiled);
  // Description
  let description = profile.description;
  let descriptionFromProfiled = profile.descriptionFromProfiled;
  walkProfiles(dependencies, isProfileClass, (next) => {
    description = next.description;
    descriptionFromProfiled = next.descriptionFromProfiled;
    return next.descriptionFromProfiled;
  }, descriptionFromProfiled);
  // UsageNote
  let usageNote = profile.usageNote;
  let usageNoteFromProfiled = profile.usageNoteFromProfiled;
  walkProfiles(dependencies, isProfileClass, (next) => {
    usageNote = next.usageNote;
    usageNoteFromProfiled = next.usageNoteFromProfiled;
    return next.usageNoteFromProfiled;
  }, usageNoteFromProfiled);
  // Profiling
  let profiling = collectProfiling(dependencies, isProfileClass,
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
    // Own assignments only. Their entities are passed through unchanged
    // by flattenEntity's ControlledVocabularyAssignment branch, so these
    // ids resolve correctly in the flattened output.
    //
    // Inherited assignments (owned by an ancestor in `dependencies`, not
    // by `profile` itself) are NOT pulled in - unlike
    // name/description/usageNote/profiling above, this is not
    // implemented. A `replaces.target` pointing at such an ancestor
    // assignment will not resolve post-flattening; per the wider
    // convention elsewhere in this codebase a dangling `replaces.target`
    // simply reads as "no override" wherever it is consumed, so this
    // degrades gracefully rather than producing invalid data.
    controlledVocabularies: profile.controlledVocabularies,
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
  profile: ProfileRelationship,
): ProfileRelationship {
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
      let profiling = collectProfiling(dependencies, isProfileRelationship,
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
  callback: (profile: ProfileRelationshipEnd) => string | null,
  identifier: string | null,
  index: number,
): void {
  walkProfiles(dependencies, isProfileRelationship, (next) => {
    let nextEnd = next.ends[index];
    if (nextEnd === undefined) {
      return null;
    }
    return callback(nextEnd);
  }, identifier);
}

export function flattenGeneralizationProfile(
  profile: ProfileGeneralization,
): ProfileGeneralization {
  // There is nothing to profile, generalization is complete as it is.
  return profile;
}
