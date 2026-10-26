import type {
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Entity, EntityModel } from "@dataspecer/core-v2";
import {
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { AggregatedEntityWrapper } from "@dataspecer/core-v2/semantic-model/aggregator";
import { buildSourceModelOfEntityMap, propagateAggregatorChangesToLocalState } from "./page-aggregator-sync";
import { WritableVisualModel } from "@dataspecer/visual-model";

export const useClassesContext = (): ClassesContext => {
  return useContext(ReactClassesContext);
};

export interface ClassesContext {

  semanticModels: Map<string, EntityModel>;

  semanticModelsList: EntityModel[];

  visualModels: Map<string, WritableVisualModel>;

  visualModelsList: WritableVisualModel[];

  // Aggregated entities.

  classes: SemanticModelClass[];

  relationships: SemanticModelRelationship[];

  generalizations: SemanticModelGeneralization[];

  classProfiles: SemanticModelClassProfile[];

  relationshipProfiles: SemanticModelRelationshipProfile[];

  sourceModelOfEntityMap: Map<string, string>;

  /**
   * Raw entities.
   */
  entities: Entity[];

};

const ReactClassesContext = React.createContext(null as unknown as ClassesContext);

type Listener = (updated: AggregatedEntityWrapper[], removed: string[]) => void;

export function ClassesContextProvider(props: {
  semanticModelsList: EntityModel[],
  visualModelsList: WritableVisualModel[],
  source: { subscribeToChanges: (callback: Listener) => void },
  children: React.ReactNode,
}) {
  const { semanticModelsList, visualModelsList, source: aggregatorView } = props;

  const semanticModels = useMemo(() => new Map(semanticModelsList.map(
    (model) => [model.getId(), model])), [semanticModelsList]);

  const visualModels = useMemo(() => new Map(visualModelsList.map(
    (model) => [model.getIdentifier(), model])),
    [visualModelsList]);

  const [classes, setClasses] = useState<SemanticModelClass[]>([]);
  const [relationships, setRelationships] = useState<SemanticModelRelationship[]>([]);
  const [generalizations, setGeneralizations] = useState<SemanticModelGeneralization[]>([]);
  const [classProfiles, setClassProfiles] = useState<SemanticModelClassProfile[]>([]);
  const [relationshipProfiles, setRelationshipProfiles] = useState<SemanticModelRelationshipProfile[]>([]);
  const [sourceModelOfEntityMap, setSourceModelOfEntityMap] = useState(new Map<string, string>());
  const [entities, setEntities] = useState<Entity[]>([]);

  // The aggregator notifies us synchronously in addModel/deleteModel, before
  // the new list of models is rendered.
  // So the callback would see an outdated list.
  const semanticModelsListRef = useRef(semanticModelsList);
  useEffect(() => {
    semanticModelsListRef.current = semanticModelsList;
    setSourceModelOfEntityMap(buildSourceModelOfEntityMap(semanticModelsList));
  }, [semanticModelsList]);

  useEffect(() => {
    const callback: Listener = (updated, removed) => {
      propagateAggregatorChangesToLocalState(
        semanticModelsListRef.current,
        updated, removed,
        setClasses, setRelationships, setGeneralizations,
        setEntities, setSourceModelOfEntityMap,
        setClassProfiles, setRelationshipProfiles)
    };
    return aggregatorView.subscribeToChanges(callback);
  }, [aggregatorView]);

  // Create the context object.

  const context = useMemo(() => {
    return {
      semanticModels, semanticModelsList,
      visualModels, visualModelsList,
      classes, relationships, generalizations, classProfiles,
      relationshipProfiles, sourceModelOfEntityMap, entities,
    } satisfies ClassesContext;
  }, [
    semanticModels, semanticModelsList,
    visualModels, visualModelsList,
    classes, relationships, generalizations, classProfiles,
    relationshipProfiles, sourceModelOfEntityMap, entities])

  return React.createElement(
    ReactClassesContext.Provider, { value: context }, props.children)
}
