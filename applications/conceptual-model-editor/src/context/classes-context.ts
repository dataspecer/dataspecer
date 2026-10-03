import type {
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import React, { useContext, useEffect, useMemo, useState } from "react";
import type { Entity } from "@dataspecer/core-v2";
import {
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { AggregatedEntityWrapper, SemanticModelAggregatorView } from "@dataspecer/core-v2/semantic-model/aggregator";
import { propagateAggregatorChangesToLocalState } from "./page-aggregator-sync";

export const useClassesContext = (): ClassesContext => {
  return useContext(ReactClassesContext);
};

export interface ClassesContext {

  classes: SemanticModelClass[];

  relationships: SemanticModelRelationship[];

  generalizations: SemanticModelGeneralization[];

  classProfiles: SemanticModelClassProfile[];

  relationshipProfiles: SemanticModelRelationshipProfile[];

  sourceModelOfEntityMap: Map<string, string>;

  rawEntities: (Entity | null)[];
};

const ReactClassesContext = React.createContext(null as unknown as ClassesContext);

export function ClassesContextProvider(props: {
  aggregatorView: SemanticModelAggregatorView
  children: React.ReactNode,
}) {
  const { aggregatorView } = props;

  const [classes, setClasses] = useState<SemanticModelClass[]>([]);
  const [relationships, setRelationships] = useState<SemanticModelRelationship[]>([]);
  const [generalizations, setGeneralizations] = useState<SemanticModelGeneralization[]>([]);
  const [classProfiles, setClassProfiles] = useState<SemanticModelClassProfile[]>([]);
  const [relationshipProfiles, setRelationshipProfiles] = useState<SemanticModelRelationshipProfile[]>([]);
  const [sourceModelOfEntityMap, setSourceModelOfEntityMap] = useState(new Map<string, string>());
  const [rawEntities, setRawEntities] = useState<(Entity | null)[]>([]);

  useEffect(() => {
    const callback = (updated: AggregatedEntityWrapper[], removed: string[]) => {
      propagateAggregatorChangesToLocalState(updated, removed,
        setClasses, setRelationships, setGeneralizations,
        setRawEntities, setSourceModelOfEntityMap,
        setClassProfiles, setRelationshipProfiles, aggregatorView)
    };
    return aggregatorView.subscribeToChanges(callback);
  }, [aggregatorView]);

  // Create the context object.

  const context = useMemo(() => {
    return {
      classes, relationships, generalizations, classProfiles,
      relationshipProfiles, sourceModelOfEntityMap, rawEntities
    };
  }, [classes, relationships, generalizations, classProfiles,
    relationshipProfiles, sourceModelOfEntityMap, rawEntities])

  return React.createElement(
    ReactClassesContext.Provider, { value: context }, props.children)
}

/*
  const createConnection = (model: InMemorySemanticModel, connection: ConnectionType) => {
    if (!model || !(model instanceof InMemorySemanticModel)) {
      console.error("no local model found or is not of type InMemoryLocal");
      return null;
    }
    if (connection.type === "association") {
      return model.executeOperation(createRelationship({ ...connection }));
    } else {
      return model.executeOperation(createGeneralization({ ...connection }));
    }
  };
*/