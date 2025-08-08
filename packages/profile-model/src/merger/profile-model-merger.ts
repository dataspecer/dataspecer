import { createIriResolver } from "@dataspecer/utilities";

import {
  isClassProfile,
  isGeneralizationProfile,
  isRelationshipProfile,
  ProfileEntity,
  ProfileEntityRecord,
  ProfileModel,
  ClassProfile,
  GeneralizationProfile,
  RelationshipProfile,
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
  const entities: ProfileEntityRecord = {};
  for (const model of models) {
    const urlResolver = prepareUrlResolver(model);
    mergeModel(policy, urlResolver, model, entities);
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
      const next = handleConflict(policy, previous, entity);
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
  if (isClassProfile(entity)) {
    return {
      ...entity,
      iri: urlResolver(entity.iri),
    } as ClassProfile;
  } else if (isRelationshipProfile(entity)) {
    return {
      ...entity,
      ends: entity.ends.map(item => ({
        ...item,
        iri: urlResolver(item.iri),
      }))
    } as RelationshipProfile;
  } else if (isGeneralizationProfile(entity)) {
    return {
      ...entity,
      iri: urlResolver(entity.iri),
    } as GeneralizationProfile;
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
): ProfileEntity | null {
  if (isClassProfile(previous) && isClassProfile(next)) {
    return policy.mergeClassProfile(previous, next);
  } else if (isRelationshipProfile(previous) && isRelationshipProfile(next)) {
    return policy.mergeRelationshipProfile(previous, next);
  } else if (isGeneralizationProfile(previous) && isGeneralizationProfile(next)) {
    return policy.mergeGeneralizationProfile(previous, next);
  } else {
    // We ignore type mismatch.
    console.warn("Can not merge miss-typed entities.", { previous, next });
    return null;
  }
}
