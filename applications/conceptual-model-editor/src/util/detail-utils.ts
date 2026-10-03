import { useContext } from "react";

import {
  type SemanticModelClass,
  type SemanticModelGeneralization,
  type SemanticModelRelationship,
  type SemanticModelRelationshipEnd,
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { getLocalizedStringFromLanguageString } from "./language-utils";
import {
  getDescriptionLanguageString,
  getFallbackDisplayName,
  getNameLanguageString,
  getUsageNoteLanguageString,
} from "./name-utils";
import { isDataType } from "@dataspecer/core-v2/semantic-model/datatypes";
import type { Entity, EntityModel } from "@dataspecer/core-v2";

import { sourceModelOfEntity } from "./model-utils";
import { getIri, getModelIri } from "./iri-utils";
import { useModelGraphContext, UseModelGraphContextType } from "../context/model-context";
import { ClassesContext, useClassesContext } from "../context/classes-context";
import { getTheOriginalProfiledEntity } from "./profile-utils";
import { cardinalityToHumanLabel, getDomainAndRange } from "../util/relationship-utils";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipEndProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isSemanticModelAttributeProfile } from "../dataspecer/semantic-model";
import { dataTypeUriToName } from "../dataspecer/semantic-model/data-type";

export type EntityDetailSupportedType =
  | SemanticModelClass
  | SemanticModelRelationship
  | SemanticModelGeneralization
  | SemanticModelClassProfile
  | SemanticModelRelationshipProfile;

export interface EntityDetailProxy {
  name: string | null;
  description: string | null;
  iri: string | null;
  usageNote: string | null;
  specializationOf: (
    | SemanticModelClass
    | SemanticModelRelationship
    | SemanticModelClassProfile
    | SemanticModelRelationshipProfile
    | SemanticModelClassProfile
    | SemanticModelRelationshipProfile
  )[];
  specializationOfAsGeneralizations: SemanticModelGeneralization[];
  generalizationOf: (
    | SemanticModelClass
    | SemanticModelRelationship
    | SemanticModelClassProfile
    | SemanticModelRelationshipProfile
  )[];
  profileOf: (
    | SemanticModelClass
    | SemanticModelRelationship
    | SemanticModelClassProfile
    | SemanticModelRelationshipProfile)[];
  originalProfile: (
    | SemanticModelClass
    | SemanticModelRelationship
    | SemanticModelClassProfile
    | SemanticModelRelationshipProfile)[];
  profiledBy: (
    | SemanticModelClass
    | SemanticModelRelationship
    | SemanticModelClassProfile
    | SemanticModelRelationshipProfile
  )[];
  attributes: SemanticModelRelationship[];
  attributeProfiles: (SemanticModelRelationshipProfile)[];
  domain: {
    entity:
    SemanticModelClass
    | SemanticModelClassProfile
    | SemanticModelRelationshipProfile
    | undefined;
    cardinality: string | undefined;
  };
  range: {
    entity:
    SemanticModelClass
    | SemanticModelClassProfile
    | undefined;
    cardinality: string | undefined;
  };
  datatype: {
    label: string | null;
    uri: string;
  } | null;
  raw: Entity | null;
  canHaveAttributes: boolean;
  canHaveDomainAndRange: boolean;
  model: EntityModel | null;
}

/**
 * @deprecated Use createEntityProxy and explicitly pass the contexts instead.
 */
export const useEntityProxy = (
  viewedEntity: EntityDetailSupportedType,
  currentLang?: string,
) => {
  const classes = useClassesContext();
  const graph = useModelGraphContext();
  return createEntityProxy(classes, graph, viewedEntity, currentLang);
}

export const createEntityProxy = (
  classesContext: ClassesContext,
  graph: UseModelGraphContextType,
  viewedEntity: EntityDetailSupportedType,
  currentLang?: string,
) => {
  const {
    classes,
    relationships,
    classProfiles,
    relationshipProfiles,
    generalizations,
    rawEntities,
  } = classesContext;
  const { semanticModels: modelsMap } = graph;
  const models = [...modelsMap.values()];
  const sourceModel = sourceModelOfEntity(viewedEntity.id, models);
  const profileSources = [...classes, ...relationships, ...classProfiles, ...relationshipProfiles];

  const proxy = new Proxy(viewedEntity as unknown as EntityDetailProxy, {
    get: (_obj, property) => {
      if (property === "name") {
        return getName();
      } else if (property === "description") {
        return getDescription();
      } else if (property === "usageNote") {
        return getUsageNote();
      } else if (property === "iri") {
        return getEntityIri();
      } else if (property === "specializationOf") {
        return getSpecializationOf();
      } else if (property === "specializationOfAsGeneralizations") {
        return getSpecializationOfAsGeneralizations();
      } else if (property === "generalizationOf") {
        return getGeneralizationOf();
      } else if (property === "profileOf") {
        return isProfileOf();
      } else if (property === "originalProfile") {
        return theOriginalProfiledEntity();
      } else if (property === "profiledBy") {
        return isProfiledBy();
      } else if (property === "attributes") {
        return getAttributes();
      } else if (property === "attributeProfiles") {
        return getAttributeProfiles();
      } else if (property === "domain") {
        return getDomain();
      } else if (property === "range") {
        return getRange();
      } else if (property === "canHaveAttributes") {
        return canHaveAttributes();
      } else if (property === "canHaveDomainAndRange") {
        return canHaveDomainAndRange();
      } else if (property === "datatype") {
        return getDataType();
      } else if (property === "raw") {
        return getRawEntity();
      } else if (property === "model") {
        return sourceModel;
      }
    },
  });

  const getName = () => {
    if (isSemanticModelGeneralization(viewedEntity)) {
      const child = classes.find(item => item.id === viewedEntity.child) ?? null;

      const childName = getLocalizedStringFromLanguageString(getNameLanguageString(child), currentLang) ??
        getFallbackDisplayName(viewedEntity);

      const parent = classes.find(item => item.id === viewedEntity.parent) ?? null;
      const parentName = getLocalizedStringFromLanguageString(getNameLanguageString(parent), currentLang) ??
        getFallbackDisplayName(viewedEntity);

      return "Generalization of " + childName + " is " + parentName;
    } else {
      return getLocalizedStringFromLanguageString(getNameLanguageString(viewedEntity), currentLang) ??
        getFallbackDisplayName(viewedEntity);
    }
  }

  const getDescription = () =>
    getLocalizedStringFromLanguageString(getDescriptionLanguageString(viewedEntity), currentLang);

  const getUsageNote = () =>
    getLocalizedStringFromLanguageString(getUsageNoteLanguageString(viewedEntity), currentLang);

  const getEntityIri = () => getIri(viewedEntity, getModelIri(sourceModel));

  const getSpecializationOf = () =>
    generalizations
      .filter((generalization) => generalization.child === viewedEntity.id)
      .map((generalization) =>
        classes.find((cl) => cl.id === generalization.parent) ??
        relationships.find((re) => re.id === generalization.parent) ??
        classProfiles.find(item => item.id === generalization.parent) ??
        relationshipProfiles.find(item => item.id === generalization.parent)
      ).filter(
        (generalization): generalization is
          | SemanticModelClass
          | SemanticModelRelationship
          | SemanticModelClassProfile
          | SemanticModelRelationshipProfile => generalization !== undefined
      );

  const getSpecializationOfAsGeneralizations =
    () => generalizations.filter((g) => g.child === viewedEntity.id);

  const getGeneralizationOf = () =>
    generalizations
      .filter((generalization) => generalization.parent === viewedEntity.id)
      .map((generalization) =>
        classes.find((cl) => cl.id === generalization.child) ??
        relationships.find((re) => re.id === generalization.child) ??
        classProfiles.find(item => item.id === generalization.child) ??
        relationshipProfiles.find(item => item.id === generalization.child)
      )
      .filter((generalization): generalization is
        | SemanticModelClass
        | SemanticModelRelationship
        | SemanticModelClassProfile
        | SemanticModelRelationshipProfile => generalization !== undefined
      );

  const isProfileOf = () => {
    if (isSemanticModelClassProfile(viewedEntity)) {
      return profileSources.filter(item => viewedEntity.profiling.includes(item.id));
    }
    if (isSemanticModelRelationshipProfile(viewedEntity)) {
      const profiling: string[] = [];
      viewedEntity.ends.forEach(end => profiling.push(...end.profiling));
      return profileSources.filter(item => profiling.includes(item.id));
    }
    return [];
  }

  const theOriginalProfiledEntity = () => {
    if (isSemanticModelClassProfile(viewedEntity) || isSemanticModelRelationshipProfile(viewedEntity)) {
      return getTheOriginalProfiledEntity(viewedEntity, profileSources);
    }
    return [];
  }

  // We first collect identifier and then convert them to entities.
  const isProfiledBy = () => ([
    ...classProfiles
      .filter(profile => profile.profiling.includes(viewedEntity.id)),
    ...relationshipProfiles
      .filter(profile => profile.ends.find(end => end.profiling.includes(viewedEntity.id)) !== undefined)
  ].map((usage) => profileSources.find((e) => e.id === usage.id))
    .filter(item => item !== undefined))

  const ends: {
    domain: SemanticModelRelationshipEnd | SemanticModelRelationshipEndProfile;
    range: SemanticModelRelationshipEnd | SemanticModelRelationshipEndProfile;
  } | null = (() => {
    if (isSemanticModelRelationship(viewedEntity)) {
      const domainAndRange = getDomainAndRange(viewedEntity);
      if (domainAndRange.domain !== null && domainAndRange.range !== null) {
        return {
          domain: domainAndRange.domain,
          range: domainAndRange.range,
        };
      }
    } else if (isSemanticModelRelationshipProfile(viewedEntity)) {
      const domainAndRange = getDomainAndRange(viewedEntity);
      if (domainAndRange.domain !== null && domainAndRange.range !== null) {
        return {
          domain: domainAndRange.domain,
          range: domainAndRange.range,
        };
      }
    } else if (isSemanticModelGeneralization(viewedEntity)) {
      return {
        domain: {
          concept: viewedEntity.child,
          name: { en: "Generalization child" },
          description: {},
          iri: null,
        } as SemanticModelRelationshipEnd,
        range: {
          concept: viewedEntity.parent,
          name: { en: "Generalization parent" },
          description: {},
          iri: null,
        } as SemanticModelRelationshipEnd,
      };
    }
    return null;
  })();

  const getAttributes = () => relationships
    .filter(isSemanticModelAttribute)
    .filter((item) => item.ends.at(0)?.concept === viewedEntity.id);

  const getAttributeProfiles = () => ([
    ...relationshipProfiles
      .filter(item => isSemanticModelAttributeProfile(item))
      .filter((item) => getDomainAndRange(item).domain?.concept === viewedEntity.id),
  ]);

  const getDomain = () => ({
    entity: classes.find(item => item.id === ends?.domain?.concept)
      ?? classProfiles.find(item => item.id === ends?.domain?.concept),
    cardinality: cardinalityToHumanLabel(ends?.domain?.cardinality),
  });

  const getRange = () => ({
    entity: classes.find(item => item.id === ends?.range.concept)
      ?? classProfiles.find(item => item.id === ends?.range?.concept),
    cardinality: cardinalityToHumanLabel(ends?.range?.cardinality),
  });

  const getDataType = () => {
    if (!(isSemanticModelAttribute(viewedEntity) || isSemanticModelAttributeProfile(viewedEntity))) {
      return null;
    }
    const concept = ends?.range.concept ?? null;
    if (isDataType(concept)) {
      return {
        label: dataTypeUriToName(concept),
        uri: concept,
      };
    }
    return null;
  };

  const getRawEntity = () => {
    return rawEntities.find((r) => r?.id === viewedEntity.id) ?? null;
  };

  const canHaveAttributes =
    () => isSemanticModelClass(viewedEntity) || isSemanticModelClassProfile(viewedEntity);

  const canHaveDomainAndRange =
    () => isSemanticModelRelationship(viewedEntity) || isSemanticModelRelationshipProfile(viewedEntity);

  return proxy;
};

export const getEntityTypeString = (entity: EntityDetailSupportedType | null) => {
  if (entity === null) {
    return "no type";
  } else if (isSemanticModelAttributeProfile(entity)) {
    return "relationship profile (attribute)";
  } else if (isSemanticModelAttribute(entity)) {
    return "relationship (attribute)";
  } else if (isSemanticModelRelationship(entity)) {
    return "relationship";
  } else if (isSemanticModelClassProfile(entity)) {
    return "class profile";
  } else if (isSemanticModelRelationshipProfile(entity)) {
    return "relationship profile";
  } else {
    return entity.type[0];
  }
};
