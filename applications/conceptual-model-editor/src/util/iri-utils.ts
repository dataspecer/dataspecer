import {
  type SemanticModelClass,
  type SemanticModelEntity,
  type SemanticModelGeneralization,
  type SemanticModelRelationship,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityDetailSupportedType } from "./detail-utils";
import {
  type SemanticModelClassUsage,
  type SemanticModelRelationshipUsage,
  isSemanticModelClassUsage,
  isSemanticModelRelationshipUsage,
} from "@dataspecer/core-v2/semantic-model/usage/concepts";
import type { EntityModel } from "@dataspecer/core-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";

import { getDomainAndRange } from "./relationship-utils";
import { IRI } from "iri";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile, SemanticModelClassProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

/**
 * @param entity
 * @param modelBaseIri if `modelBaseIri` is undefined, then `""` is used instead
 * @returns The iri of `entity` if it is absolute, if not, returns `modelBaseIri + entity.iri`.
 * For unknown entity returns `null`
 */
export const getIri = (
  entity:
        | SemanticModelClass
        | SemanticModelClassUsage
        | SemanticModelRelationship
        | SemanticModelRelationshipUsage
        | SemanticModelGeneralization
        | SemanticModelEntity
        | SemanticModelClassProfile
        | SemanticModelRelationshipProfile
        | null
        | undefined,
  modelBaseIri?: string
) => {
  if (!entity) {
    return null;
  }

  let iri: string | null;
  if (isSemanticModelClass(entity)) {
    iri = entity.iri;
  } else if (isSemanticModelRelationship(entity)) {
    const range = getDomainAndRange(entity)?.range;
    iri = range?.iri ?? null;
  } else if (isSemanticModelGeneralization(entity)) {
    iri = entity.iri;
  } else if (isSemanticModelClassUsage(entity)) {
    iri = (entity as SemanticModelClass & SemanticModelClassUsage)?.iri ?? null;
  } else if (isSemanticModelRelationshipUsage(entity)) {
    iri = getDomainAndRange(entity).range?.iri ?? null;
  } else if (isSemanticModelClassProfile(entity)) {
    iri = entity.iri;
  } else if (isSemanticModelRelationshipProfile(entity)) {
    iri = getDomainAndRange(entity).range?.iri ?? null;
  } else {
    iri = null;
  }

  if (!iri) {
    return null;
  }

  if (isIriAbsolute(iri)) {
    return iri;
  } else {
    return (modelBaseIri ?? "") + iri;
  }
};

/**
 * @param iri
 * @returns true if `iri` has a `scheme` prefix, eg: `https:`
 */
export const isIriAbsolute = (iri: string | null) => {
  if (!iri) {
    return false;
  }

  return new IRI(iri).scheme() !== null;
};

export const getModelIri = (model: EntityModel | undefined | null) => {
  if (model instanceof InMemorySemanticModel) {
    if (model.getBaseIri()?.length > 0) {
      return model.getBaseIri();
    }
    return `https://my-model-${model?.getId() ?? "undefined-model"}.iri.todo.com/entities/`;
  }
  return "";
};

/**
 * Used only for lw-onto exports
 * @param iri
 * @param entity
 * @returns the `entity` with `iri` in absolute form by prepending the model's base iri
 */
export const entityWithOverriddenIri = <T extends EntityDetailSupportedType | SemanticModelEntity>(
  iri: string,
  entity: T
): T => {
  if (isSemanticModelClass(entity) || isSemanticModelClassUsage(entity)) {
    return { ...entity, iri: iri };
  } else if (isSemanticModelRelationship(entity)) {
    const currentEnds = getDomainAndRange(entity);
    if (currentEnds.rangeIndex === null || currentEnds.range === null) {
      return entity;
    }
    const newEnds = entity.ends;
    newEnds[currentEnds.rangeIndex] = { ...currentEnds.range, iri: iri };
    return { ...entity, ends: newEnds };
  } else if (isSemanticModelRelationshipUsage(entity)) {
    const currentEnds = getDomainAndRange(entity);
    if (currentEnds.rangeIndex === null || currentEnds.range === null) {
      return entity;
    }
    const newEnds = entity.ends;
    newEnds[currentEnds.rangeIndex] = { ...currentEnds.range, iri: iri };
    return { ...entity, ends: newEnds };
  } else {
    return { ...entity, iri: iri };
  }
};
