import { EntityModel } from "@dataspecer/core-v2";
import { sourceModelOfEntity } from "../util/model-utils";
import {
  ClassesContextEntities,
  VisibilityFilter,
  getSemanticClassIdentifier,
  getSemanticEdgeIdentifier,
  isEntityInVisualModel
} from "./extend-selection-action";
import { ClassesContextType } from "../context/classes-context";
import { VisualModel } from "@dataspecer/visual-model";
import { ModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";

/**
 * Type representing filter on the type of entity.
 */
export enum SelectionFilter {
    ClassProfile,
    Class,
    RelationshipProfile,
    Relationship,
    Generalization
};

/**
 * Appends to {@link filteredNodeSelection} the classes from {@link nodeSelection} passing filter
 * and into {@link filteredEdgeSelection} the edges from {@link edgeSelection} passing filter.
 * Note that filter is usually either for nodes or for edges.
 * So usually either {@link filteredNodeSelection} or {@link filteredEdgeSelection} is kept unchanged.
 */
type SelectionFilterMethod = (
    nodeSelection: string[],
    areVisualModelIdentifiers: boolean,
    filteredNodeSelection: string[],
    edgeSelection: string[],
    filteredEdgeSelection: string[],
    contextEntities: ClassesContextEntities,
    visualModel: VisualModel | null
) => void;

export type Selections = {
    nodeSelection: string[],
    edgeSelection: string[],
};

export type SelectionsWithIdInfo = Selections & {areVisualModelIdentifiers: boolean};

//
//

/**
 *
 * @returns Filtered nodeSelection and edgeSelection stored inside {@link selections} based on {@link filters} and
 *  {@link visibilityFilter} and {@link semanticModelFilter}
 */
export function filterSelectionAction(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  classesContext: ClassesContextType | null,
  selections: SelectionsWithIdInfo,
  filters: SelectionFilter[],
  visibilityFilter: VisibilityFilter,
  semanticModelFilter: Record<string, boolean> | null,
): Selections {
  if(classesContext === null) {
    notifications.error("Classes context is null, can't filter the selection");
    return {
      nodeSelection: [...selections.nodeSelection],
      edgeSelection: [...selections.edgeSelection]
    };
  }

  let filteredNodeSelection: string[] = [];
  let filteredEdgeSelection: string[] = [];
  const selectionFilterMethods: SelectionFilterMethod[] = [];
  const contextEntities: ClassesContextEntities = classesContext;

  const activeVisualModel = graph.aggregatorView.getActiveVisualModel();

  if((visibilityFilter === VisibilityFilter.OnlyNonVisible || visibilityFilter === VisibilityFilter.OnlyVisible) &&
        activeVisualModel === null) {
    notifications.error("No active visual model, can't filter based on visual model.");
    return {
      nodeSelection: [...selections.nodeSelection],
      edgeSelection: [...selections.edgeSelection]
    };
  }

  for (const filter of filters) {
    const filterMethod = FILTER_NAME_TO_FILTER_METHOD_MAP[filter];
    if(filterMethod === undefined) {
      notifications.error("The filter for selection is not defined, probably programmer error");
    }
    else {
      selectionFilterMethods.push(filterMethod);
    }
  };

  selectionFilterMethods.forEach(filterMethod => {
    filterMethod(
      selections.nodeSelection, selections.areVisualModelIdentifiers,
      filteredNodeSelection, selections.edgeSelection, filteredEdgeSelection,
      contextEntities, activeVisualModel);
  });

  const models = graph.models;

  filteredNodeSelection = filterBasedOnVisibility(
    filteredNodeSelection, selections.areVisualModelIdentifiers, visibilityFilter, activeVisualModel);
  filteredEdgeSelection = filterBasedOnVisibility(
    filteredEdgeSelection, selections.areVisualModelIdentifiers, visibilityFilter, activeVisualModel);
  if(semanticModelFilter !== null) {
    filteredNodeSelection = filterBasedOnAllowedSemanticModels(
      selections.nodeSelection, filteredNodeSelection, semanticModelFilter, models);
    filteredEdgeSelection = filterBasedOnAllowedSemanticModels(
      selections.edgeSelection, filteredEdgeSelection, semanticModelFilter, models);
  }

  return {
    nodeSelection: filteredNodeSelection,
    edgeSelection: filteredEdgeSelection,
  };
}

//
//

/**
 * @returns The {@link selectionToFilter} after the filtering,
 *  concatenated with the {@link selectionToBaseOutputOn}, but that selection itself isn't changed.
 *  The returned array is new instance without duplicates.
 */
function filterBasedOnAllowedSemanticModels(
  selectionToFilter: string[],
  selectionToBaseOutputOn: string[],
  allowedSemanticModels: Record<string, boolean>,
  semanticModels: Map<string, EntityModel>
): string[] {
  const consideredModels: EntityModel[] = [];
  const notConsideredModels: EntityModel[] = [];
  Object.entries(allowedSemanticModels).forEach(([modelId, isConsidered]) => {
    const model = semanticModels.get(modelId);
    if(model === undefined) {
      return;
    }
    if(isConsidered) {
      consideredModels.push(model);
    }
    else {
      notConsideredModels.push(model);
    }
  });

  const entitiesPassingFilter: string[] = [];
  selectionToFilter.forEach(entityFromSelection => {
    if(sourceModelOfEntity(entityFromSelection, notConsideredModels) !== undefined) {
      entitiesPassingFilter.push(entityFromSelection);
    }
  });

  // Use "Set" to remove duplicates (https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array)
  return [...new Set(entitiesPassingFilter.concat(selectionToBaseOutputOn))];
}

/**
 * @returns Returns identifiers from {@link identifiersToFilter} matching the {@link visibilityFilter}.
 */
function filterBasedOnVisibility(
  identifiersToFilter: string[],
  areIdentifiersFromVisualModel: boolean,
  visibilityFilter: VisibilityFilter,
  visualModel: VisualModel | null
): string[] {
  const filteredArray: string[] = identifiersToFilter.filter(identifier => {
    if(visibilityFilter === VisibilityFilter.All) {
      return true;
    }

    if(visualModel === null) {
      return visibilityFilter === VisibilityFilter.OnlyNonVisible;
    }

    const isInVisualModel = isEntityInVisualModel(visualModel, identifier, areIdentifiersFromVisualModel);
    if(visibilityFilter === VisibilityFilter.OnlyVisible && isInVisualModel) {
      return true;
    }
    else if(visibilityFilter === VisibilityFilter.OnlyNonVisible && !isInVisualModel) {
      return true;
    }

    return false;
  });

  return filteredArray;
}

const FILTER_NAME_TO_FILTER_METHOD_MAP: Record<SelectionFilter, SelectionFilterMethod> = {
  [SelectionFilter.Class]: classFilter,
  [SelectionFilter.ClassProfile]: profileClassFilter,
  [SelectionFilter.Relationship]: relatioshipFilter,
  [SelectionFilter.RelationshipProfile]: profileRelationshipFilter,
  [SelectionFilter.Generalization]: generalizationFilter,
};

function classFilter(
  nodeSelection: string[],
  areVisualModelIdentifiers: boolean,
  filteredNodeSelection: string[],
  edgeSelection: string[],
  filteredEdgeSelection: string[],
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  nodeSelection.map(selectedClassId => {
    const selectedClassSemanticId = getSemanticClassIdentifier(
      selectedClassId, areVisualModelIdentifiers, visualModel);
    if(contextEntities.classes.findIndex(cclass => cclass.id === selectedClassSemanticId) >= 0) {
      filteredNodeSelection.push(selectedClassId);
    }
  });
}

function profileClassFilter(
  nodeSelection: string[],
  areVisualModelIdentifiers: boolean,
  filteredNodeSelection: string[],
  edgeSelection: string[],
  filteredEdgeSelection: string[],
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  nodeSelection.map(selectedClassId => {
    const selectedClassSemanticId = getSemanticClassIdentifier(
      selectedClassId, areVisualModelIdentifiers, visualModel);
    if(contextEntities.classProfiles.findIndex(profile => profile.id === selectedClassSemanticId) >= 0) {
      filteredNodeSelection.push(selectedClassId);
    }
  });

  // The edges representing class profile
  edgeSelection.map(selectedEdgeId => {
    const selectedEdgeSemanticId = getSemanticEdgeIdentifier(selectedEdgeId, areVisualModelIdentifiers, visualModel);
    if(selectedEdgeSemanticId === "CLASS-PROFILE-EDGE") {
      filteredEdgeSelection.push(selectedEdgeId);
    }
  });
}

function relatioshipFilter(
  nodeSelection: string[],
  areVisualModelIdentifiers: boolean,
  filteredNodeSelection: string[],
  edgeSelection: string[],
  filteredEdgeSelection: string[],
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  edgeSelection.map(selectedEdgeId => {
    const selectedEdgeSemanticId = getSemanticEdgeIdentifier(
      selectedEdgeId, areVisualModelIdentifiers, visualModel);
    if(contextEntities.relationships.findIndex(relationship => relationship.id === selectedEdgeSemanticId) >= 0) {
      filteredEdgeSelection.push(selectedEdgeId);
    }
  });
}

function profileRelationshipFilter(
  nodeSelection: string[],
  areVisualModelIdentifiers: boolean,
  filteredNodeSelection: string[],
  edgeSelection: string[],
  filteredEdgeSelection: string[],
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  edgeSelection.map(selectedEdgeId => {
    const selectedEdgeSemanticId = getSemanticEdgeIdentifier(selectedEdgeId, areVisualModelIdentifiers, visualModel);
    if(contextEntities.relationshipProfiles.findIndex(relationshipProfile =>
      relationshipProfile.id === selectedEdgeSemanticId) >= 0) {
      filteredEdgeSelection.push(selectedEdgeId);
    }
  });
}

function generalizationFilter(
  nodeSelection: string[],
  areVisualModelIdentifiers: boolean,
  filteredNodeSelection: string[],
  edgeSelection: string[],
  filteredEdgeSelection: string[],
  contextEntities: ClassesContextEntities,
  visualModel: VisualModel | null
): void {
  edgeSelection.map(selectedEdgeId => {
    const selectedEdgeSemanticId = getSemanticEdgeIdentifier(selectedEdgeId, areVisualModelIdentifiers, visualModel);
    const isGeneralization = contextEntities.generalizations
      .findIndex(generalization => generalization.id === selectedEdgeSemanticId) >= 0;
    if(isGeneralization) {
      filteredEdgeSelection.push(selectedEdgeId);
    }
  });
}
