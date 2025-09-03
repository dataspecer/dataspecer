import React, { useContext, useEffect, useState } from "react";

import {
  HexColor,
  isVisualNode,
  isVisualRelationship,
  VisualEntity,
  VisualModel,
} from "@dataspecer/core-v2/visual-model";

import { EntityDsIdentifier, ModelDsIdentifier } from "../entity-model";
import { configuration } from "../../application";
import { removeFromArray } from "@/utilities/functional";

export interface CmeVisualModelContext {

  /**
   * Models as set for given models.
   */
  colors: { [identifier: ModelDsIdentifier]: HexColor | null };

  /**
   * Default color for models with missing color information.
   */
  defaultColor: HexColor;

  /**
   * For each entity list identifiers of representing visual entities.
   * Effectively those are placements in the visual model.
   */
  placements: { [identifier: EntityDsIdentifier]: EntityDsIdentifier[] };

}

const CmeVisualModelContextReact =
  React.createContext<CmeVisualModelContext>(null as any);

export const useCmeVisualModelContext = (): CmeVisualModelContext => {
  return useContext(CmeVisualModelContextReact);
}

export function CmeVisualModelContextProvider(
  props: {
    active: VisualModel | null,
    children: React.ReactNode,
  },
) {

  const [state, setState] = useState<CmeVisualModelContext>({
    colors: {},
    defaultColor: configuration().defaultModelColor,
    placements: {},
  });

  const visualModel = props.active;
  useEffect(() => {
    if (visualModel === null) {
      setState(prev => ({ ...prev, colors: {}, placements: {} }));
      return;
    }

    const unsubscribe = visualModel.subscribeToChanges({
      visualEntitiesDidChange: (entities) => {
        setState(prev => updatePlacements(prev, entities));
      },
      modelColorDidChange: (identifier, color) => {
        setState(prev => updateModelColor(prev, identifier, color));
      }
    });

    // Full reload ...

    setState(prev => fullReload(prev, visualModel));

    return () => unsubscribe();
  }, [visualModel]);

  return (
    <CmeVisualModelContextReact.Provider value={state}>
      {props.children}
    </CmeVisualModelContextReact.Provider>
  )
}

function updatePlacements(
  prev: CmeVisualModelContext,
  entities: { previous: VisualEntity | null; next: VisualEntity | null }[],
): CmeVisualModelContext {
  // We first check if there is a relevant change.
  // We do this to avoid creating an array.
  const hasChanged = entities
    .map(({ previous, next }) => previous !== next)
    .includes(true);
  if (!hasChanged) {
    return prev;
  }
  // Compute the update.
  const placements = { ...prev.placements };
  entities.forEach(({ previous, next }) => {
    if (previous === null && next !== null) {
      // There is a new entity.
      let represented: string | null = null;
      if (isVisualNode(next)) {
        represented = next.representedEntity
      } else if (isVisualRelationship(next)) {
        represented = next.representedRelationship
      } else {
        return;
      }
      // Add a new placement.
      placements[represented] = [...placements[represented], next.identifier];
    } else if (previous !== null && next === null) {
      // Existing entity has been removed.
      let represented: string | null = null;
      if (isVisualNode(previous)) {
        represented = previous.representedEntity
      } else if (isVisualRelationship(previous)) {
        represented = previous.representedRelationship
      } else {
        return;
      }
      // Remove a placement.
      const next = removeFromArray(
        previous.identifier, placements[represented]);
      if (next.length === 0) {
        delete placements[represented];
      } else {
        placements[represented] = next;
      }
    }
  });

  return { ...prev, placements };
}

function updateModelColor(
  prev: CmeVisualModelContext,
  model: ModelDsIdentifier,
  color: HexColor | null,
): CmeVisualModelContext {
  if (prev.colors[model] === color) {
    return prev;
  }
  return {
    ...prev,
    colors: {
      ...prev.colors,
      [model]: color,
    },
  };
}

function fullReload(
  prev: CmeVisualModelContext,
  visualModel: VisualModel,
): CmeVisualModelContext {
  const colors: { [identifier: ModelDsIdentifier]: HexColor | null } = {}
  visualModel.getModelsData().values().forEach(model => {
    colors[model.representedModel] = model.color;
  });

  const placements: { [identifier: EntityDsIdentifier]: EntityDsIdentifier[] } = {};
  visualModel.getVisualEntities().values().forEach(item => {
    let represented: string | null = null;
    if (isVisualNode(item)) {
      represented = item.representedEntity
    } else if (isVisualRelationship(item)) {
      represented = item.representedRelationship
    } else {
      return;
    }
    if (placements[represented] === undefined) {
      placements[represented] = [item.identifier];
    } else {
      placements[represented].push(item.identifier);
    }
  });

  return { ...prev, colors, placements };
}

