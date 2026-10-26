import { createIriResolver } from "@dataspecer/utilities";

import {
  isControlledVocabularyAssignment,
  isProfileClass,
  isProfileGeneralization,
  isProfileRelationship,
  ProfileEntity,
  ProfileEntityRecord,
  ProfileModel,
  ProfileClass,
  ProfileGeneralization,
  ProfileRelationship,
} from "../profile-model.ts";
import { createDefaultMergePolicy } from "./default-merge-policy.ts";
import { ProfileModelMergePolicy } from "./merge-policy.ts";
import { prepareUrlResolver, UrlResolver } from "../utilities.ts";

/**
 * Given multiple models merge them into one.
 * Entities in the new model are shallow copies.
 *
 * @param identifier Identifier for the newly created model.
 * @returns Model with entities from all given models.
 */
export function margeProfileModels(
  identifier: string,
  models: ProfileModel[],
  policy?: ProfileModelMergePolicy,
): ProfileModel {
  policy = policy ?? createDefaultMergePolicy();
  // All ControlledVocabularyAssignment entities across every model, keyed
  // by id, collected up front so merging can resolve them in any order.
  const assignmentEntities: ProfileEntityRecord = {};
  for (const model of models) {
    for (const [identifier, entity] of Object.entries(model.getEntities())) {
      if (isControlledVocabularyAssignment(entity) && assignmentEntities[identifier] === undefined) {
        assignmentEntities[identifier] = entity;
      }
    }
  }
  const entities: ProfileEntityRecord = {};
  for (const model of models) {
    const urlResolver = prepareUrlResolver(model);
    mergeModel(policy, urlResolver, model, entities, assignmentEntities);
  }
  return {
    getId: () => identifier,
    getBaseIri: () => null,
    getEntities: () => entities,
  };
}

function mergeModel(
  policy: ProfileModelMergePolicy,
  urlResolver: UrlResolver,
  model: ProfileModel,
  entities: ProfileEntityRecord,
  assignmentEntities: ProfileEntityRecord,
): void {
  for (const [identifier, entity] of Object.entries(model.getEntities())) {
    const previous = entities[identifier];
    if (previous === undefined) {
      const next = handleNew(urlResolver, entity);
      if (next === null) {
        continue;
      }
      entities[identifier] = next;
    } else {
      const next = handleConflict(policy, previous, entity, assignmentEntities);
      if (next === null) {
        continue;
      }
      entities[identifier] = next;
    }
  }
}

function handleNew(
  urlResolver: UrlResolver,
  entity: ProfileEntity,
): ProfileEntity | null {
  if (isProfileClass(entity)) {
    return {
      ...entity,
      iri: urlResolver(entity.iri),
    } as ProfileClass;
  } else if (isProfileRelationship(entity)) {
    return {
      ...entity,
      ends: entity.ends.map(item => ({
        ...item,
        iri: urlResolver(item.iri),
      }))
    } as ProfileRelationship;
  } else if (isProfileGeneralization(entity)) {
    return {
      ...entity,
      iri: urlResolver(entity.iri),
    } as ProfileGeneralization;
  } else {
    // We ignore unknown entity.
    console.warn("Ignored entity of unknown type for merge.", { entity });
    return null;
  }
}

function handleConflict(
  policy: ProfileModelMergePolicy,
  previous: ProfileEntity,
  next: ProfileEntity,
  assignmentEntities: ProfileEntityRecord,
): ProfileEntity | null {
  if (isProfileClass(previous) && isProfileClass(next)) {
    return policy.mergeClassProfile(previous, next, assignmentEntities);
  } else if (isProfileRelationship(previous) && isProfileRelationship(next)) {
    return policy.mergeRelationshipProfile(previous, next);
  } else if (isProfileGeneralization(previous) && isProfileGeneralization(next)) {
    return policy.mergeGeneralizationProfile(previous, next);
  } else {
    // We ignore type mismatch.
    console.warn("Can not merge miss-typed entities.", { previous, next });
    return null;
  }
}
