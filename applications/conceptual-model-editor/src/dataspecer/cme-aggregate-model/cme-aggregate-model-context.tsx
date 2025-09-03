import React, { useContext, useEffect, useState } from "react";
import { useCmeSemanticContext } from "../cme-semantic-model";
import { useCmeProfileContext } from "../cme-profile-model";
import {
  CmeProfileClassAggregate,
  CmeProfileRelationshipAggregate,
  CmeSemanticClassAggregate,
  CmeGeneralizationAggregate,
  CmeSemanticRelationshipAggregate,
} from "./model";
import {
  CmeProfileModel,
} from "../cme-profile-model/model";
import {
  EntityDsIdentifier,
} from "../entity-model";
import { CmeSemanticModel } from "../cme-semantic-model/model";
import {
  toCmeProfileClassAggregate,
  toCmeProfileRelationshipAggregate,
  toCmeSemanticClassAggregate,
  toCmeSemanticRelationshipAggregate,
} from "./adapter";
import { resolveSources } from "./utilities";

/**
 * WARNING: profile and semantic models can contain redundant data!
 */
export interface CmeAggregateModelContext {

  /**
   * Just a copy of profile models.
   * Model as same as in  {@link CmeAggregateModelContext.semanticModels};
   */
  profileModels: CmeProfileModel[];

  profileClasses: CmeProfileClassAggregate[];

  profileClass: (identifier: EntityDsIdentifier) =>
    CmeProfileClassAggregate | null;

  profileRelationships: CmeProfileRelationshipAggregate[];

  profileRelationship: (identifier: EntityDsIdentifier) =>
    CmeProfileRelationshipAggregate | null;

  /**
   * Just a copy of semantic models.
   * Model as same as in  {@link CmeAggregateModelContext.profileModels};
   */
  semanticModels: CmeSemanticModel[];

  semanticClasses: CmeSemanticClassAggregate[];

  semanticClass: (identifier: EntityDsIdentifier) =>
    CmeSemanticClassAggregate | null;

  semanticRelationships: CmeSemanticRelationshipAggregate[];

  semanticRelationship: (identifier: EntityDsIdentifier) =>
    CmeSemanticRelationshipAggregate | null;

  /**
   * As we have no way to distinguish semantic and profile visualisation,
   * we put hem into one collection for now.
   */
  generalizations: CmeGeneralizationAggregate[];

  generalization: (identifier: EntityDsIdentifier) =>
    CmeGeneralizationAggregate | null;

}

const CmeAggregateModelContextReact =
  React.createContext<CmeAggregateModelContext>(null as any);

export const useCmeAggregateContext = (): CmeAggregateModelContext => {
  return useContext(CmeAggregateModelContextReact);
}

export function CmeAggregateModelContextProvider(
  props: {
    children: React.ReactNode,
  },
) {
  const semantic = useCmeSemanticContext();
  const profile = useCmeProfileContext();
  const [state, setState] = useState<CmeAggregateModelContext>({
    profileModels: [],
    profileClasses: [],
    profileClass: () => null,
    profileRelationships: [],
    profileRelationship: () => null,
    semanticModels: [],
    semanticClasses: [],
    semanticClass: () => null,
    semanticRelationships: [],
    semanticRelationship: () => null,
    generalizations: [],
    generalization: () => null,
  });

  /**
   * This is simple implementation, we can optimize it to get better
   * performance should that be necessary.
   */
  useEffect(() => {

    // We start with the semantic model.
    // There we need to only aggregate multiple entities of the same
    // identifiers from multiple models.

    const semanticClassMap:
      { [identifier: string]: CmeSemanticClassAggregate } = {};
    semantic.classes.forEach(item => {
      semanticClassMap[item.identifier] =
        toCmeSemanticClassAggregate(
          item, semanticClassMap[item.identifier]);
    });

    const semanticRelationshipMap:
      { [identifier: string]: CmeSemanticRelationshipAggregate } = {};
    semantic.relationships.forEach(item => {
      semanticRelationshipMap[item.identifier] =
        toCmeSemanticRelationshipAggregate(
          item, semanticRelationshipMap[item.identifier]);
    });

    // Last we deal with profiles, they are the most complex
    // as they have declared dependencies for selected properties.
    // We do this in two steps, in the first step we convert all.
    // In the second step we update the dependencies.

    const profileClassMap:
      { [identifier: string]: CmeProfileClassAggregate } = {};
    profile.classes.forEach(item => {
      profileClassMap[item.identifier] =
        toCmeProfileClassAggregate(
          item, profileClassMap[item.identifier]);
    });

    resolveSources(semanticClassMap, profileClassMap,
      item => item.nameSource,
      item => item.name,
      item => item.name,
      (item, value) => ({ ...item, nameAggregate: value }));
    resolveSources(semanticClassMap, profileClassMap,
      item => item.descriptionSource,
      item => item.description,
      item => item.description,
      (item, value) => ({ ...item, descriptionAggregate: value }));
    resolveSources(semanticClassMap, profileClassMap,
      item => item.usageNoteSource,
      () => null,
      item => item.usageNote,
      (item, value) => ({ ...item, usageNoteAggregate: value }));

    const profileRelationshipMap:
      { [identifier: string]: CmeProfileRelationshipAggregate } = {};
    profile.relationships.forEach(item => {
      profileRelationshipMap[item.identifier] =
        toCmeProfileRelationshipAggregate(
          item, profileRelationshipMap[item.identifier]);
    });

    resolveSources(semanticRelationshipMap, profileRelationshipMap,
      item => item.nameSource,
      item => item.name,
      item => item.name,
      (item, value) => ({ ...item, nameAggregate: value }));
    resolveSources(semanticRelationshipMap, profileRelationshipMap,
      item => item.descriptionSource,
      item => item.description,
      item => item.description,
      (item, value) => ({ ...item, descriptionAggregate: value }));
    resolveSources(semanticRelationshipMap, profileRelationshipMap,
      item => item.usageNoteSource,
      () => null,
      item => item.usageNote,
      (item, value) => ({ ...item, usageNoteAggregate: value }));

    // At the end we need to deal with generalizations.

    const generalizations: CmeGeneralizationAggregate[] =
      semantic.generalizations.map(item => ({
        type: "cme-generalization-aggregate",
        identifier: item.identifier,
        models: [item.model],
        dependencies: [item.identifier],
        readOnly: item.readOnly,
        iri: item.iri,
        childIdentifier: item.childIdentifier,
        parentIdentifier: item.parentIdentifier,
      }));

    const generalizationsMap:
      { [identifier: string]: CmeGeneralizationAggregate } = {};
      generalizations.forEach(item => generalizationsMap[item.identifier] = item);
    setState({
      profileModels: profile.models,
      profileClasses: [...Object.values(profileClassMap)],
      profileClass: id => profileClassMap[id] ?? null,
      profileRelationships: [...Object.values(profileRelationshipMap)],
      profileRelationship: id => profileRelationshipMap[id] ?? null,
      semanticModels: semantic.models,
      semanticClasses: [...Object.values(semanticClassMap)],
      semanticClass: id => semanticClassMap[id] ?? null,
      semanticRelationships: [...Object.values(semanticRelationshipMap)],
      semanticRelationship: id => semanticRelationshipMap[id] ?? null,
      generalizations: generalizations,
      generalization: id => generalizationsMap[id] ?? null,
    })
  }, [semantic, profile, setState]);

  return (
    <CmeAggregateModelContextReact.Provider value={state}>
      {props.children}
    </CmeAggregateModelContextReact.Provider>
  )
}

