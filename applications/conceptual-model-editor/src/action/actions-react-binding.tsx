import React, { useContext, useMemo } from "react";

import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  Waypoint,
  WritableVisualModel,
  isVisualProfileRelationship,
  isVisualRelationship,
  isWritableVisualModel
} from "@dataspecer/core-v2/visual-model";

import { type DialogApiContextType } from "../dialog/dialog-service";
import { DialogApiContext } from "../dialog/dialog-context";
import { createLogger } from "../application";
import { ClassesContext, type ClassesContextType, UseClassesContextType, useClassesContext } from "../context/classes-context";
import { useNotificationServiceWriter } from "../notification";
import { type UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ModelGraphContext, useModelGraphContext, UseModelGraphContextType, type ModelGraphContextType } from "../context/model-context";
import { type DiagramCallbacks, type Waypoint as DiagramWaypoint, Edge, Position, useDiagram } from "../diagram/";
import type { UseDiagramType } from "../diagram/diagram-hook";
import { type Options, useOptions } from "../configuration/options";
import { openDetailDialogAction } from "./open-detail-dialog";
import { openModifyDialogAction } from "./open-modify-dialog";
import { openCreateProfileDialogAction } from "./open-create-profile-dialog";
import { openCreateConnectionDialogAction } from "./open-create-connection";
import { openCreateClassDialogAction } from "./open-create-class-dialog";
import { openCreateVocabularyAction } from "./open-create-vocabulary";
import { addSemanticClassToVisualModelAction } from "./add-class-to-visual-model";
import { addSemanticClassProfileToVisualModelAction } from "./add-class-profile-to-visual-model";
import { addSemanticGeneralizationToVisualModelAction } from "./add-generalization-to-visual-model";
import { addSemanticRelationshipToVisualModelAction } from "./add-relationship-to-visual-model";
import { addSemanticRelationshipProfileToVisualModelAction } from "./add-relationship-profile-to-visual-model";
import { EntityToDelete, checkIfIsAttributeOrAttributeProfile, convertToEntitiesToDeleteType, findTopLevelGroupInVisualModel, getSelections, getViewportCenterForClassPlacement, setSelectionsInDiagram } from "./utilities";
import { removeFromSemanticModelsAction } from "./remove-from-semantic-model";
import { openCreateAttributeDialogAction } from "./open-create-attribute-dialog";
import { openCreateAssociationDialogAction } from "./open-create-association-dialog";
import { addEntitiesFromSemanticModelToVisualModelAction } from "./add-entities-from-semantic-model-to-visual-model";
import { addEntityNeighborhoodToVisualModelAction } from "./add-entity-neighborhood-to-visual-model";
import { createDefaultProfilesAction } from "./create-default-profiles";
import { openCreateClassDialogWithModelDerivedFromClassAction } from "./open-create-class-dialog-with-derived-model";
import { EntityToAddToVisualModel, addSemanticEntitiesToVisualModelAction } from "./add-semantic-entities-to-visual-model";
import { UserGivenAlgorithmConfigurations, LayoutedVisualEntities } from "@dataspecer/layout";
import { layoutActiveVisualModelAction } from "./layout-visual-model";
import { toggleAnchorAction } from "./toggle-anchor";
import { SelectionFilterState } from "../dialog/selection/filter-selection-dialog-controller";
import { SelectionFilter, Selections, SelectionsWithIdInfo, filterSelectionAction } from "./filter-selection-action";
import { createExtendSelectionDialog } from "../dialog/selection/extend-selection-dialog";
import { ExtendSelectionState } from "../dialog/selection/extend-selection-dialog-controller";
import { ExtensionType, NodeSelection, VisibilityFilter, extendSelectionAction, getSelectionForWholeSemanticModel } from "./extend-selection-action";
import { createFilterSelectionDialog } from "../dialog/selection/filter-selection-dialog";
import { EntityModel } from "@dataspecer/core-v2";
import { openCreateAttributeForEntityDialogAction } from "./open-add-attribute-for-entity-dialog";
import { addGroupToVisualModelAction } from "./add-group-to-visual-model";
import { removeTopLevelGroupFromVisualModelAction } from "./remove-group-from-visual-model";
import { openCreateClassDialogAndCreateAssociationAction, openCreateClassDialogAndCreateGeneralizationAction } from "./open-create-class-dialog-with-edge";
import { removeAttributesFromVisualModelAction } from "./remove-attributes-from-visual-model";
import { ShiftAttributeDirection, shiftAttributePositionAction } from "./shift-attribute";
import { openEditNodeAttributesDialogAction } from "./open-edit-node-attributes-dialog";
import { openEditAttributeDialogAction } from "./open-edit-attribute-dialog";
import { openEditAttributeProfileDialogAction } from "./open-edit-attribute-profile-dialog";
import { findSourceModelOfEntity } from "../service/model-service";
import { isInMemorySemanticModel } from "../utilities/model";
import { isSemanticModelAttribute, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelAttributeProfile } from "../dataspecer/semantic-model";
import { createCmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { createVisualNodeDuplicateAction } from "./create-visual-node-duplicate";
import { removeFromVisualModelByVisualAction } from "./remove-from-visual-model-by-visual";
import { removeFromVisualModelByRepresentedAction } from "./remove-from-visual-model-by-represented";
import { centerViewportToVisualEntityByRepresentedAction } from "./center-viewport-to-visual-entity";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";
import { removeAttributesFromVisualNodeAction } from "./remove-attributes-from-node";
import { AttributeDialogState } from "../dialog/attribute/edit-attribute-dialog-state";
import { AttributeProfileDialogState } from "../dialog/attribute-profile/edit-attribute-profile-dialog-state";
import { openEditAssociationDialogAction } from "./open-edit-association-dialog";
import { isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { openEditAssociationProfileDialogAction } from "./open-edit-association-profile-dialog";
import { changeVisualModelAction } from "./change-visual-model";
import { QueryParamsContextType, useQueryParamsContext } from "@/context/query-params-context";
import { openCreateVisualModelDialogAction } from "./open-create-new-visual-model-dialog";
import { openEditSemanticModelDialogAction } from "./open-edit-semantic-model-dialog";
import { ModelDsIdentifier } from "@/dataspecer/entity-model";
import { openSearchExternalSemanticModelDialogAction } from "./open-search-external-semantic-model-dialog";

const LOG = createLogger(import.meta.url);

/**
 * Contains actions used for dialog manipulation.
 */
interface DialogActions {

  /**
   * Opens dialog, which purpose is to add new model into editor.
   */
  openCreateModelDialog: () => void;

  /**
   * Opens dialog, which purpose is to alow user adit a semantic model.
   */
  openEditSemanticModelDialog: (identifier: string) => void;

  /**
   * Remove semantic model and all it's entities.
   */
  deleteSemanticModel: (identifier: string) => void;

  /**
   * Opens dialog, which purpose is to show the detail information of entity identified by {@link identifier}.
   * @param identifier is the identifier of the semantic entity.
   */
  openDetailDialog: (identifier: string) => void;

  /**
   * Opens dialog, which purpose is to modification of entity identified by {@link identifier}.
   * @param identifier is the identifier of the semantic entity.
   */
  openModifyDialog: (identifier: string) => void;

  /**
   * Opens dialog, which purpose is to create new class in model identified by {@link model}.
   * @param model is the identifier of the semantic model.
   */
  openCreateClassDialog: (model: string) => void;

  /**
   * Opens dialog, which purpose is to create new association in model identified by {@link model}.
   * @param model is the identifier of the semantic model.
   */
  openCreateAssociationDialog: (model: string) => void;

  /**
   * Opens dialog, which purpose is to create new attribute in model identified by {@link model}.
   * @param model is the identifier of the semantic model.
   */
  openCreateAttributeDialogForModel: (model: string) => void;

  /**
   * Opens dialog, which purpose is to create new attribute with domain class identified by {@link classIdentifier}.
   * On successful creation {@link onConfirmCallback} is called.
   * @param classIdentifier is the identifier of the class, which will be domain for the attribute.
   * @param onConfirmCallback This callback is called after we successfully create attribute.
   *                          Set to null, if there is no callback.
   */
  openCreateAttributeDialogForClass: (
    classIdentifier: string,
    onConfirmCallback: ((state: AttributeDialogState | AttributeProfileDialogState, createdAttributeIdentifier: string) => void) | null
  ) => void;

  // TODO RadStr: Document
  openEditNodeAttributesDialog: (nodeIdentifier: string) => void;

  /**
   * @deprecated Use specialized method for given entity type.
   */
  openCreateProfileDialog: (identifier: string) => void;

  /**
   * Open dialog to extend current selection.
   * @param selections are the visual identifiers of the selection.
   */
  openExtendSelectionDialog: (selections: Selections) => void;

  /**
   * Open dialog to filter current selection.
   */
  openFilterSelectionDialog: (selections: SelectionsWithIdInfo) => void;

}

/**
 * Contains actions used for manipulation with visual model .
 */
interface VisualModelActions {
  // TODO PRQuestion: How should we document these action methods? Since their implementation is usually
  //                  within the .*Action methods defined in different files in this directory.
  //                  So should the actual documentation look like: For further information about the action see {@link ...Action} method.
  //                  Can be seen on the centerViewportToVisualEntity method, where the Action method is already documented

  /**
   * Adds semantic entities identified by identifier to currently active visual model at optional position.
   * @param entities are the semantic entities to be added to visual model. For further info check the docs of {@link EntityToAddToVisualModel}
   */
  addSemanticEntitiesToVisualModel: (entities: EntityToAddToVisualModel[]) => void;

  /**
   * Adds semantic class identified by {@link identifier} to currently active visual model at given {@link position}.
   * @param model identifies the semantic model, where the semantic entity resides.
   * @param identifier identifies the semantic class to be added to visual model.
   * @param position is the position to put the newly created visual node at.
   * If the position is null then default placement is chosen.
   */
  addClassToVisualModel: (model: string, identifier: string, position: { x: number, y: number } | null) => void;

  /**
   * Adds semantic class profile identified by {@link identifier} to currently active visual model at given {@link position}.
   * @param model identifies the semantic model, where the semantic entity resides.
   * @param identifier identifies the semantic class profile to be added to visual model.
   * @param position is the position to put the newly created visual node at.
   * If the position is null then default placement is chosen.
   */
  addClassProfileToVisualModel: (model: string, identifier: string, position: { x: number, y: number } | null) => void;

  /**
   * Adds generalization identified by {@link identifier} to currently active visual model at given {@link position}.
   * @param model identifies the semantic model, where the semantic entity resides.
   * @param identifier identifies the generalization to be added to visual model.
   */
  addGeneralizationToVisualModel: (model: string, identifier: string) => void;

  /**
   * Adds relation (association) identified by {@link identifier} to currently active visual model at given {@link position}.
   * @param model identifies the semantic model, where the semantic entity resides.
   * @param identifier identifies the relation to be added to visual model.
   */
  addRelationToVisualModel: (model: string, identifier: string) => void;

  /**
   * Adds relation (association) profile identified by {@link identifier} to currently active visual model at given {@link position}.
   * @param model identifies the semantic model, where the semantic entity resides.
   * @param identifier identifies the relation profile to be added to visual model.
   */
  addRelationProfileToVisualModel: (model: string, identifier: string) => void;

  // TODO RadStr: Document
  addAttributeToVisualModel: (attribute: string, domainClass: string | null) => void;
  shiftAttributeUp: (attribute: string, domainNode: string | null) => void;
  shiftAttributeDown: (attribute: string, domainNode: string | null) => void;

  // TODO PRQuestion - different docs from this method and for the actual action
  /**
   * Uses the identifiers of the semantic entities unlike the {@link removeFromVisualModelByVisual},
   * which uses the visual identifiers.
   * Removes the visual entities identified by given {@link identifiers} from visual model.
   * Also removes related visual relationships from the visual model.
   * @param identifiers identify the entities, which visual representations will be removed from visual model.
   */
  removeFromVisualModelByRepresented: (identifiers: string[]) => void;

  /**
   * Uses the identifiers of the visual entities unlike the {@link removeFromVisualModelByRepresented},
   * which uses the semantic identifiers.
   * Removes the visual entities identified by given {@link identifiers} from visual model.
   * Also removes related visual relationships from the visual model.
   * @param identifiers identify the entities, which visual representations will be removed from visual model.
   */
  removeFromVisualModelByVisual: (identifiers: string[]) => void;

  // TODO RadStr: Document
  removeAttributesFromVisualModel: (attributes: string[]) => void;

  /**
   * Creates duplicate (copy) of node with given visual {@link identifier}.
   * The duplicated node contains all edges of the existing duplicates.
   * So for example if we have A -> B, A' -> C on canvas and we call this method for A'
   * then the newly created A'' will have following edges A'' -> C, but also A'' -> B.
   * @param identifier is the identifier of the visual node
   */
  createVisualNodeDuplicate: (identifier: string) => void;

  //

  /**
   * Opens dialog, which after confirmation creates new visual model with content equal to {@link nodeSelection} and
   * relevant edges from {@link edgeSelection}.
   */
  openCreateNewVisualModelFromSelectionDialog: (
    nodeSelection: string[],
    edgeSelection: string[],
    shouldSwitchToCreatedModel: boolean
  ) => void;

  /**
   * Changes active visual model to the one given in {@link newVisualModel}.
   */
  changeVisualModel: (newVisualModel: string) => void;

  /**
   * Opens dialog, which after confirmation creates new empty visual model.
   */
  openCreateNewVisualModelDialog: (shouldSwitchToCreatedModel: boolean) => void;

  //
  // TODO PRQuestion: Again document using {@link .*Action} or not?
  addEntitiesFromSemanticModelToVisualModel: (semanticModel: EntityModel | string) => Promise<void>;

  // TODO PRQuestion: Again document using {@link .*Action} or not?
  removeEntitiesInSemanticModelFromVisualModel: (semanticModel: EntityModel | string) => void;

  /**
   * Puts entities' neighborhood to visual model.
   * For classes it is classes connected to semantic class or class profile identified by {@link identifier}.
   * For relationships that is both ends and the relationship.
   * For attributes it adds the domain class to canvas.
   * @param identifier is the identifier of the semantic entity, whose neighborhood we will add to visual model.
   */
  addEntityNeighborhoodToVisualModel: (identifier: string) => Promise<void>;

}

/**
 * Contains actions, which are stored in the context for further use.
 */
export interface ActionsContextType extends DialogActions, VisualModelActions {

  /**
   * TODO: Rename to delete entity as it removes from semantic model as well as from visual.
   */
  deleteFromSemanticModels: (entitiesToDelete: EntityToDelete[]) => void;

  /**
   * Centers viewport to semantic entity identified by {@link identifier}.
   * Since we have multiple visual entites per one semantic, we need to somehow
   * choose the visual entity to center to. For that there is {@link currentlyIteratedEntity}.
   * The {@link currentlyIteratedEntity} is ANY integer.
   * It will will be used to index the array of visual entities (using modulo)
   */
  centerViewportToVisualEntityByRepresented: (
    model: string,
    identifier: string,
    currentlyIteratedEntity: number
  ) => void;

  layoutActiveVisualModel: (configuration: UserGivenAlgorithmConfigurations) => Promise<LayoutedVisualEntities | void>;

  /**
   * Calls action {@link extendSelectionAction} with correct context. For more info check {@link extendSelectionAction}
   */
  extendSelection: (
    nodeSelection: NodeSelection,
    extensionTypes: ExtensionType[],
    visibilityFilter: VisibilityFilter,
    semanticModelFilter: Record<string, boolean> | null,
    shouldExtendByNodeDuplicates: boolean,
  ) => Promise<Selections>;

  filterSelection: (
    selections: SelectionsWithIdInfo,
    filters: SelectionFilter[],
    visibilityFilter: VisibilityFilter,
    semanticModelFilter: Record<string, boolean> | null
  ) => Selections;

  highlightNodeInExplorationModeFromCatalog: (classIdentifier: string, modelOfClassWhichStartedHighlighting: string) => void;

  openSearchExternalSemanticModelDialog: (identifier: ModelDsIdentifier) => void;

  /**
   * As this context requires two way communication it is created and shared via the actions.
   */
  diagram: UseDiagramType | null;

}

const noOperationActionsContext: ActionsContextType = {
  openCreateModelDialog: noOperation,
  openEditSemanticModelDialog: noOperation,
  deleteSemanticModel: noOperation,
  openDetailDialog: noOperation,
  openModifyDialog: noOperation,
  openCreateClassDialog: noOperation,
  openCreateAssociationDialog: noOperation,
  openCreateAttributeDialogForModel: noOperation,
  openCreateAttributeDialogForClass: noOperation,
  openEditNodeAttributesDialog: noOperation,
  openCreateProfileDialog: noOperation,
  //
  addSemanticEntitiesToVisualModel: noOperation,
  addClassToVisualModel: noOperation,
  addClassProfileToVisualModel: noOperation,
  addGeneralizationToVisualModel: noOperation,
  addRelationToVisualModel: noOperation,
  addRelationProfileToVisualModel: noOperation,
  addAttributeToVisualModel: noOperation,
  shiftAttributeUp: noOperation,
  shiftAttributeDown: noOperation,
  deleteFromSemanticModels: noOperation,
  //
  removeFromVisualModelByRepresented: noOperation,
  removeFromVisualModelByVisual: noOperation,
  removeAttributesFromVisualModel: noOperation,
  createVisualNodeDuplicate: noOperation,
  centerViewportToVisualEntityByRepresented: noOperation,
  //
  openCreateNewVisualModelFromSelectionDialog: noOperation,
  changeVisualModel: noOperation,
  openCreateNewVisualModelDialog: noOperation,
  //
  addEntitiesFromSemanticModelToVisualModel: async () => {},
  removeEntitiesInSemanticModelFromVisualModel: noOperation,
  addEntityNeighborhoodToVisualModel: async () => {},
  layoutActiveVisualModel: noOperationAsync,
  //
  openExtendSelectionDialog: noOperation,
  openFilterSelectionDialog: noOperation,
  // TODO PRQuestion: How to define this - Should actions return values?, shouldn't it be just function defined in utils?
  extendSelection: async () => ({ nodeSelection: [], edgeSelection: [] }),
  filterSelection: () => ({ nodeSelection: [], edgeSelection: [] }),
  highlightNodeInExplorationModeFromCatalog: noOperation,
  openSearchExternalSemanticModelDialog: noOperation,
  diagram: null,
};

function noOperation() {
  LOG.error("[ACTIONS] Using uninitialized actions context!");
}

// TODO PRQuestion: I added back the async operation for layout action (but maybe it isn't action?).
function noOperationAsync() {
  LOG.error("[ACTIONS] Using uninitialized actions context!");
  return Promise.resolve();
}

export const ActionContext = React.createContext<ActionsContextType>(noOperationActionsContext);

export const ActionsContextProvider = (props: {
  children: React.ReactNode,
}) => {
  const options = useOptions();
  const dialogs = useContext(DialogApiContext);
  const classes = useContext(ClassesContext);
  const useClasses = useClassesContext();
  const notifications = useNotificationServiceWriter();
  const graph = useContext(ModelGraphContext);
  const useGraph = useModelGraphContext();
  const diagram = useDiagram();

  const queryParamsContext = useQueryParamsContext();

  const actions = useMemo(
    () => createActionsContext(
      options, dialogs, classes, useClasses, notifications, graph, useGraph, diagram, queryParamsContext),
    [options, dialogs, classes, useClasses, notifications, graph, useGraph, diagram, queryParamsContext]
  );

  return (
    <ActionContext.Provider value={actions}>
      {props.children}
    </ActionContext.Provider>
  );
};

let prevOptions: Options | null = null;
let prevDialogs: DialogApiContextType | null = null;
let prevClasses: ClassesContextType | null = null;
let prevUseClasses: UseClassesContextType | null = null;
let prevNotifications: UseNotificationServiceWriterType | null = null;
let prevGraph: ModelGraphContextType | null = null;
let prevUseGraph: UseModelGraphContextType | null = null;
let prevDiagram: UseDiagramType | null = null;
let prevQueryParamsContext: QueryParamsContextType | null = null;

function createActionsContext(
  options: Options | null,
  dialogs: DialogApiContextType | null,
  classes: ClassesContextType | null,
  useClasses: UseClassesContextType | null,
  notifications: UseNotificationServiceWriterType | null,
  graph: ModelGraphContextType | null,
  useGraph: UseModelGraphContextType | null,
  diagram: UseDiagramType,
  queryParamsContext: QueryParamsContextType | null,
): ActionsContextType {

  if (options === null || dialogs === null || classes === null ||
    useClasses === null || notifications === null || graph === null ||
    !diagram.areActionsReady || queryParamsContext === null || useGraph === null) {
    // We need to return the diagram object so it can be consumed by
    // the Diagram component and initialized.
    return {
      ...noOperationActionsContext,
      diagram,
    };
  }

  // Monitoring before we get all the dependencies fixed.
  const changed = [];
  if (prevOptions !== options) changed.push("options");
  if (prevDialogs !== dialogs) changed.push("dialogs");
  if (prevClasses !== classes) changed.push("classes");
  if (prevUseClasses !== useClasses) changed.push("prevUseClasses");
  if (prevNotifications !== notifications) changed.push("notifications");
  if (prevGraph !== graph) changed.push("graph");
  if (prevUseGraph !== useGraph) changed.push("useGraph");
  if (prevDiagram !== diagram) changed.push("diagram");
  if (prevQueryParamsContext !== queryParamsContext) changed.push("queryParamsContext");
  console.info("[ACTIONS] Creating new context object. ", { changed });
  prevOptions = options;
  prevDialogs = dialogs;
  prevClasses = classes;
  prevUseClasses = useClasses;
  prevNotifications = notifications;
  prevGraph = graph;
  prevUseGraph = useGraph;
  prevDiagram = diagram;
  prevQueryParamsContext = queryParamsContext;

  // For now we create derived state here, till is is available
  // as a context.

  const cmeExecutor = createCmeModelOperationExecutor(graph.models);

  //

  const openCreateProfileDialog = (identifier: string) => {
    withVisualModel(notifications, graph, (visualModel) => {
      const position = getViewportCenterForClassPlacement(diagram);
      openCreateProfileDialogAction(
        cmeExecutor, options, dialogs, notifications, classes, graph,
        visualModel, diagram, position, identifier);
    });
  };

  const openSearchExternalSemanticModelDialog = (identifier: ModelDsIdentifier) => {
    openSearchExternalSemanticModelDialogAction(
      notifications, dialogs, graph, identifier);
  };

  const openCreateConnectionDialog = (
    semanticSource: string,
    semanticTarget: string,
    visualSource: string,
    visualTarget: string
  ) => {
    withVisualModel(notifications, graph, (visualModel) => {
      openCreateConnectionDialogAction(
        cmeExecutor,  options, dialogs, notifications,
        graph, visualModel, semanticSource, semanticTarget, visualSource, visualTarget);
    });
  };

  const deleteVisualElements = (identifiers: string[]) => {
    const entitiesToDelete = convertToEntitiesToDeleteType(notifications, graph.models, identifiers);
    deleteFromSemanticModels(entitiesToDelete);
  };

  const changeNodesPositions = (changes: { [identifier: string]: Position }) => {
    withVisualModel(notifications, graph, (visualModel) => {
      for (const [identifier, position] of Object.entries(changes)) {
        visualModel.updateVisualEntity(identifier, { position });
      }
    });
  };

  const addWaypoint = (edge: Edge, index: number, waypoint: DiagramWaypoint) => {
    withVisualModel(notifications, graph, (visualModel) => {
      const visualEdge = visualModel.getVisualEntity(edge.identifier);
      if (visualEdge === null) {
        notifications.error("Ignore waypoint update of non-existing visual entity.")
        return;
      }
      if (isVisualRelationship(visualEdge) || isVisualProfileRelationship(visualEdge)) {
        const waypoints: Waypoint[] = [
          ...visualEdge.waypoints.slice(0, index),
          { x: waypoint.x, y: waypoint.y, anchored: null },
          ...visualEdge.waypoints.slice(index),
        ];
        visualModel.updateVisualEntity(edge.identifier, { waypoints });
      } else {
        notifications.error("Ignore waypoint update of non-edge visual type.")
      }
    });
  }

  const deleteWaypoint = (edge: Edge, index: number) => {
    withVisualModel(notifications, graph, (visualModel) => {
      const visualEdge = visualModel.getVisualEntity(edge.identifier);
      if (visualEdge === null) {
        notifications.error("Ignore waypoint update of non-existing visual entity.")
        return;
      }
      if (isVisualRelationship(visualEdge) || isVisualProfileRelationship(visualEdge)) {
        const waypoints: Waypoint[] = [
          ...visualEdge.waypoints.slice(0, index),
          ...visualEdge.waypoints.slice(index + 1),
        ];
        visualModel.updateVisualEntity(edge.identifier, { waypoints });
      } else {
        notifications.error("Ignore waypoint update of non-edge visual type.")
      }
    });
  }

  const changeWaypointPositions = (changes: { [edgeIdentifier: string]: { [waypointIndex: number]: DiagramWaypoint } }) => {
    withVisualModel(notifications, graph, (visualModel) => {
      for (const [identifier, waypointsChanges] of Object.entries(changes)) {
        const visualEdge = visualModel.getVisualEntity(identifier);
        if (visualEdge === null) {
          notifications.error("Ignore waypoint update of non-existing visual entity.")
          return;
        }
        if (isVisualRelationship(visualEdge) || isVisualProfileRelationship(visualEdge)) {
          const waypoints: Waypoint[] = [...visualEdge.waypoints];
          for (const [index, waypoint] of Object.entries(waypointsChanges)) {
            waypoints[Number(index)] = { ...waypoints[Number(index)], x: waypoint.x, y: waypoint.y };
          }
          console.log("onChangeWaypointPositions", { changes: changes, prev: visualEdge.waypoints, next: waypoints });
          visualModel.updateVisualEntity(identifier, { waypoints });
        } else {
          notifications.error("Ignore waypoint update of non-edge visual type.")
        }
      }
    });
  }

  const openCreateAttributeDialogForClass = (
    classIdentifier: string,
    onConfirmCallback: ((state: AttributeDialogState | AttributeProfileDialogState, createdAttributeIdentifier: string) => void) | null
  ) => {
    withVisualModel(notifications, graph, (visualModel) => {
      openCreateAttributeForEntityDialogAction(
        cmeExecutor, options, dialogs, classes, graph, notifications,
        visualModel, classIdentifier, onConfirmCallback);
    });
  };

  // Dialog actions.

  const openCreateModelDialog = () => {
    openCreateVocabularyAction(dialogs, graph);
  };

  const openEditSemanticModelDialog = (identifier: string ) => {
    withVisualModel(notifications, graph, (visualModel) => {
      openEditSemanticModelDialogAction(
        cmeExecutor, options, dialogs, graph, visualModel, identifier);
    });
  };

  const deleteSemanticModel = (identifier: string ) => {
    useGraph.removeModel(identifier);
  };

  const openDetailDialog = (identifier: string) => {
    openDetailDialogAction(options, dialogs, notifications, graph, identifier);
  };

  const openModifyDialog = (identifier: string) => {
    withVisualModel(notifications, graph, (visualModel) => {
      openModifyDialogAction(
        cmeExecutor, options, dialogs, notifications, classes, useClasses, graph,
        visualModel, identifier);
    });
  };

  const openCreateClassDialog = (model: string) => {
    const visualModel = graph.aggregatorView.getActiveVisualModel();
    const modelInstance = graph.models.get(model);
    if (modelInstance === null || modelInstance instanceof InMemorySemanticModel) {
      openCreateClassDialogAction(
        cmeExecutor, options, dialogs, classes, graph, notifications, visualModel,
        diagram, modelInstance, null, null);
    } else {
      notifications.error("Can not add to given model.");
    }
  };

  const openCreateAssociationDialog = (model: string) => {
    const visualModel = graph.aggregatorView.getActiveVisualModel();
    const modelInstance = graph.models.get(model);
    if (modelInstance === null || modelInstance instanceof InMemorySemanticModel) {
      openCreateAssociationDialogAction(
        cmeExecutor, options, dialogs, classes, graph, notifications, visualModel,
        modelInstance);
    } else {
      notifications.error("Can not add to given model.");
    }
  };

  const openCreateAttributeDialogForModel = (model: string) => {
    const visualModel = graph.aggregatorView.getActiveVisualModel();
    const modelInstance = graph.models.get(model);
    if (modelInstance === null || modelInstance instanceof InMemorySemanticModel) {
      openCreateAttributeDialogAction(
        cmeExecutor, options, dialogs, classes, graph, notifications,
        visualModel, modelInstance);
    } else {
      notifications.error("Can not add to given model.");
    }
  };

  const openEditNodeAttributesDialog = (nodeIdentifier: string) => {
    withVisualModel(notifications, graph, (visualModel) => {
      openEditNodeAttributesDialogAction(
        classes, graph, dialogs, notifications, options, visualModel, nodeIdentifier);
    });
  };

  // Visual model actions.

  const addSemanticEntitiesToVisualModel = (
    entities: EntityToAddToVisualModel[]
  ): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      addSemanticEntitiesToVisualModelAction(
        notifications, classes, graph, visualModel, diagram, entities);
    });
  };

  const addClassToVisualModel = (model: string, identifier: string, position: { x: number, y: number } | null): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      addSemanticClassToVisualModelAction(
        notifications, graph, classes, visualModel, diagram, identifier, model, position);
    });
  };

  const addClassProfileToVisualModel = (
    model: string,
    identifier: string,
    position: { x: number, y: number } | null
  ): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      addSemanticClassProfileToVisualModelAction(
        notifications, graph, classes, visualModel, diagram, identifier, model, position);
    });
  }

  const addGeneralizationToVisualModel = (
    model: string,
    identifier: string,
  ): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      addSemanticGeneralizationToVisualModelAction(
        notifications, graph, visualModel, identifier, model);
    });
  }

  const addRelationToVisualModel = (model: string, identifier: string): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      addSemanticRelationshipToVisualModelAction(
        notifications, graph, visualModel, identifier, model);
    });
  };

  const addRelationProfileToVisualModel = (model: string, identifier: string): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      addSemanticRelationshipProfileToVisualModelAction(
        notifications, graph, visualModel, identifier, model);
    });
  };

  const addAttributeToVisualModel = (attribute: string, domainClass: string | null): void => {
    if(domainClass === null) {
      notifications.error("Adding attribute to domain class which is null");
      return;
    }
    withVisualModel(notifications, graph, (visualModel) => {
      addSemanticAttributeToVisualModelAction(notifications, visualModel, domainClass, attribute, true);
    });
  };

  const shiftAttributeUp = (attribute: string, domainNode: string | null): void => {
    if(domainNode === null) {
      notifications.error("Shifting attribute in domain node which is null");
      return;
    }
    withVisualModel(notifications, graph, (visualModel) => {
      shiftAttributePositionAction(notifications, visualModel, domainNode, attribute, ShiftAttributeDirection.Up, 1);
    });
  };

  const shiftAttributeDown = (attribute: string, domainNode: string | null): void => {
    if(domainNode === null) {
      notifications.error("Shifting attribute in domain node which is null");
      return;
    }
    withVisualModel(notifications, graph, (visualModel) => {
      shiftAttributePositionAction(notifications, visualModel, domainNode, attribute, ShiftAttributeDirection.Down, 1);
    });
  };

  const removeFromVisualModelByRepresented = (identifiers: string[]): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      removeFromVisualModelByRepresentedAction(notifications, visualModel, identifiers);
    });
  };

  const removeFromVisualModelByVisual = (identifiers: string[]): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      removeFromVisualModelByVisualAction(notifications, visualModel, identifiers);
    });
  };

  const removeAttributesFromVisualModel = (attributes: string[]): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      removeAttributesFromVisualModelAction(notifications, classes, visualModel, attributes);
    });
  };

  const removeAttributesFromVisualNode = (attributes: string[], nodeIdentifier: string): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      removeAttributesFromVisualNodeAction(notifications, visualModel, nodeIdentifier, attributes);
    });
  };

  const createVisualNodeDuplicate = (identifier: string): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      createVisualNodeDuplicateAction(notifications, diagram, visualModel, identifier);
    });
  };

  // ...

  const deleteFromSemanticModels = (entitiesToDelete: EntityToDelete[]) => {
    // We start be removing from the visual model.
    withVisualModel(notifications, graph, (visualModel) => {
      const entityToDeleteWithAttributeData = entitiesToDelete.map(entityToDelete =>
        ({...entityToDelete,
          isAttributeOrAttributeProfile: checkIfIsAttributeOrAttributeProfile(
            entityToDelete.identifier, graph.models, entityToDelete.sourceModel)
        })
      );
      const attributesToBeDeleted = entityToDeleteWithAttributeData.filter(entity => entity.isAttributeOrAttributeProfile);
      const notAttributesToBeDeleted = entityToDeleteWithAttributeData.filter(entity => !entity.isAttributeOrAttributeProfile);
      removeFromVisualModelByRepresentedAction(
        notifications, visualModel,
        notAttributesToBeDeleted.map(entitiesToDelete => entitiesToDelete.identifier));
      removeAttributesFromVisualModelAction(
        notifications, classes, visualModel,
        attributesToBeDeleted.map(entitiesToDelete => entitiesToDelete.identifier));
    });
    removeFromSemanticModelsAction(notifications, graph, entitiesToDelete);
  };

  const centerViewportToVisualEntityByRepresented = (
    model: string,
    identifier: string,
    currentlyIteratedEntity: number
  ) => {
    centerViewportToVisualEntityByRepresentedAction(
      notifications, graph, classes, diagram, identifier, currentlyIteratedEntity, model);
  };

  const layoutActiveVisualModel = async (configuration: UserGivenAlgorithmConfigurations) => {
    withVisualModel(notifications, graph, (visualModel) => {
      return layoutActiveVisualModelAction(
        notifications, classes, diagram, graph, visualModel, configuration);
    });
  }

  const addEntitiesFromSemanticModelToVisualModel = async (semanticModel: EntityModel | string) => {
    if (typeof semanticModel === "string") {
      const newSemanticModel = graph.models.get(semanticModel);
      if (newSemanticModel === undefined) {
        return Promise.reject();
      }
      semanticModel = newSemanticModel;
    }
    //
    let promise: Promise<void> = Promise.resolve();
    withVisualModel(notifications, graph, (visualModel) => {
      promise = addEntitiesFromSemanticModelToVisualModelAction(
        notifications, classes, graph, diagram, visualModel, semanticModel);
    });
    return promise;
  };

  const removeEntitiesInSemanticModelFromVisualModel = (semanticModel: EntityModel | string) => {
    if (typeof semanticModel === "string") {
      const newSemanticModel = graph.models.get(semanticModel);
      if (newSemanticModel === undefined) {
        return Promise.reject();
      }
      semanticModel = newSemanticModel;
    }
    //
    withVisualModel(notifications, graph, (visualModel) => {
      const entitiesInModel = getSelectionForWholeSemanticModel(semanticModel, visualModel, false);
      removeFromVisualModelByRepresented(entitiesInModel.nodeSelection);
    });
  };

  const addEntityNeighborhoodToVisualModel = async (identifier: string) => {
    let promise: Promise<void> = Promise.resolve();
    withVisualModel(notifications, graph, (visualModel) => {
      promise = addEntityNeighborhoodToVisualModelAction(
        notifications, classes, graph, diagram, visualModel, identifier);
    });

    return promise;
  };

  const openCreateNewVisualModelFromSelectionDialog = (
    nodeSelection: string[],
    edgeSelection: string[],
    shouldSwitchToCreatedModel: boolean
  ) => {
    withVisualModel(notifications, graph, (visualModel) => {
      openCreateVisualModelDialogAction(
        notifications, options, dialogs, graph, useGraph, queryParamsContext,
        visualModel, nodeSelection, edgeSelection, shouldSwitchToCreatedModel);
    });
  };

  const changeVisualModel = (newVisualModel: string) => {
    changeVisualModelAction(graph, queryParamsContext, newVisualModel);
  };

  const openCreateNewVisualModelDialog = (shouldSwitchToCreatedModel: boolean) => {
    return openCreateNewVisualModelFromSelectionDialog([], [], shouldSwitchToCreatedModel);
  };

  const openExtendSelectionDialog = (selections: Selections) => {
    const onConfirm = (state: ExtendSelectionState) => {
      setSelectionsInDiagram(state.selections, diagram);
    };

    const onClose = () => {
      setSelectionsInDiagram(selections, diagram);
    };

    const setSelections = (selectionsToSetWith: Selections) => {
      setSelectionsInDiagram(selectionsToSetWith, diagram);
    };
    dialogs?.openDialog(createExtendSelectionDialog(onConfirm, onClose, true, selections, setSelections));
  };

  const openFilterSelectionDialog = (selections: SelectionsWithIdInfo) => {
    const onConfirm = (state: SelectionFilterState) => {
      const relevantSelectionFilters = state.selectionFilters.map(selectionFilter => {
        if (selectionFilter.checked) {
          return selectionFilter.selectionFilter;
        }
        return null;
      }).filter(selectionFilter => selectionFilter !== null);

      const filteredSelection = filterSelection(
        state.selections, relevantSelectionFilters, VisibilityFilter.OnlyVisible, null);
      setSelectionsInDiagram(filteredSelection, diagram);
    };

    const setSelections = (selections: Selections) => {
      setSelectionsInDiagram(selections, diagram);
    };
    dialogs?.openDialog(createFilterSelectionDialog(onConfirm, selections, setSelections));
  };

  const extendSelection = async (
    nodeSelection: NodeSelection,
    extensionTypes: ExtensionType[],
    visibilityFilter: VisibilityFilter,
    semanticModelFilter: Record<string, boolean> | null,
    shouldExtendByNodeDuplicates: boolean = true,
  ) => {
    const selectionExtension = await extendSelectionAction(
      notifications, graph, classes, nodeSelection,
      extensionTypes, visibilityFilter, false, semanticModelFilter,
      shouldExtendByNodeDuplicates);
    return selectionExtension.selectionExtension;
  };

  const filterSelection = (
    selections: SelectionsWithIdInfo,
    allowedClasses: SelectionFilter[],
    visibilityFilter: VisibilityFilter,
    semanticModelFilter: Record<string, boolean> | null
  ) => {
    return filterSelectionAction(
      notifications, graph, classes, selections, allowedClasses,
      visibilityFilter, semanticModelFilter);
  };

  const highlightNodeInExplorationModeFromCatalog = (
    classIdentifier: string,
    modelOfClassWhichStartedHighlighting: string
  ) => {
    withVisualModel(notifications, graph, (visualModel) => {
      const nodeIdentifiers = visualModel.getVisualEntitiesForRepresented(classIdentifier)
        .map(visualEntity => visualEntity.identifier);
      const isClassInVisualModel = nodeIdentifiers.length > 0;
      if (!isClassInVisualModel) {
        return;
      }

      diagram.actions().highlightNodesInExplorationModeFromCatalog(nodeIdentifiers, modelOfClassWhichStartedHighlighting);
    });
  }

  const callbacks: DiagramCallbacks = {
    onShowNodeDetail: (node) => openDetailDialog(node.externalIdentifier),

    onEditRepresentedByNode: (node) => openModifyDialog(node.externalIdentifier),

    onEditVisualNode: (node) => openEditNodeAttributesDialog(node.identifier),

    onCreateNodeProfile: (node) => openCreateProfileDialog(node.externalIdentifier),

    onDuplicateNode: (node) => createVisualNodeDuplicate(node.identifier),

    onHideNode: (node) => removeFromVisualModelByVisual([node.identifier]),

    onDeleteNode: (node) => deleteVisualElements([node.externalIdentifier]),

    onChangeNodesPositions: changeNodesPositions,

    onShowEdgeDetail: (node) => openDetailDialog(node.externalIdentifier),

    onEditEdge: (edge) => openModifyDialog(edge.externalIdentifier),

    onCreateEdgeProfile: (edge) => openCreateProfileDialog(edge.externalIdentifier),

    onHideEdge: (edge) => removeFromVisualModelByVisual([edge.identifier]),

    onDeleteEdge: (edge) => deleteVisualElements([edge.externalIdentifier]),

    onAddWaypoint: addWaypoint,

    onDeleteWaypoint: deleteWaypoint,

    onChangeWaypointPositions: changeWaypointPositions,

    onCreateAttributeForNode: (node) => openCreateAttributeDialogForClass(node.externalIdentifier, null),

    onCreateConnectionToNode: (source, target) => {
      openCreateConnectionDialog(
        source.externalIdentifier, target.externalIdentifier, source.identifier, target.identifier);
    },

    onCreateConnectionToNothing: (source, canvasPosition) => {
      console.log("Application.onCreateConnectionToNothing", { source, canvasPosition });
      diagram.actions().openDragEdgeToCanvasMenu(source, canvasPosition);
    },

    onSelectionDidChange: (nodes, edges) => {
      console.log("Application.onSelectionDidChange", { nodes, edges });
    },

    onToggleAnchorForNode: (nodeIdentifier) => {
      console.log("Application.onToggleAnchorForNode", { nodeIdentifier });
      withVisualModel(notifications, graph, (visualModel) => {
        const topLevelGroup = findTopLevelGroupInVisualModel(nodeIdentifier, visualModel);
        toggleAnchorAction(notifications, visualModel, topLevelGroup ?? nodeIdentifier);
      });
    },

    onShowSelectionActionsMenu: (source, canvasPosition) => {
      console.log("Application.onShowSelectionActions", { source, canvasPosition });
      diagram.actions().openSelectionActionsMenu(source, canvasPosition);
    },
    onLayoutSelection: () => {
      // TODO RadStr: Currently does nothing
    },

    onCreateGroup: () => {
      withVisualModel(notifications, graph, (visualModel) => {
        const { nodeSelection } = getSelections(diagram, false, true);
        const groupIdentifier = addGroupToVisualModelAction(visualModel, nodeSelection);
        // We also set anchor of all the underlying elements to null
        // We lose the old values this way, but unless the user makes mistake there is no reason for him to care -
        // He will dissolve the group after some time and by then he had already forgotten the old values
        // We do this for simplification of code:
        //   1) We don't have to always check if we are using group's anchor or the node's one
        //   2) We don't have easy access to the group from diagram, respectively to its' anchor value
        toggleAnchorAction(notifications, visualModel, groupIdentifier, null);
      });
    },

    onDissolveGroup: (identifier: string | null) => {
      console.info("diagram.actions().getNodes()", diagram.actions().getNodes());
      withVisualModel(notifications, graph, (visualModel) => {
        removeTopLevelGroupFromVisualModelAction(notifications, visualModel, identifier);
      });
    },

    onShowExpandSelection: () => {
      const selectionToExpand = getSelections(diagram, false, true);
      openExtendSelectionDialog(selectionToExpand);
    },

    onShowFilterSelection: () => {
      const selectionToFilter = getSelections(diagram, false, true);
      openFilterSelectionDialog({
        nodeSelection: selectionToFilter.nodeSelection,
        edgeSelection: selectionToFilter.edgeSelection,
        areVisualModelIdentifiers: true
      });
    },

    onCanvasOpenCreateClassDialog: (nodeIdentifier, positionToPlaceClassOn) => {
      withVisualModel(notifications, graph, (visualModel) => {
        openCreateClassDialogWithModelDerivedFromClassAction(
          cmeExecutor,notifications, graph, dialogs, classes, options,
          diagram, visualModel, nodeIdentifier, positionToPlaceClassOn, null);
      });
    },

    onCanvasOpenCreateClassDialogWithAssociation: (nodeIdentifier, positionToPlaceClassOn, isCreatedClassTarget) => {
      withVisualModel(notifications, graph, (visualModel) => {
        openCreateClassDialogAndCreateAssociationAction(
          cmeExecutor, notifications, dialogs, classes, options, graph,
          diagram, visualModel, nodeIdentifier, isCreatedClassTarget,
          positionToPlaceClassOn);
      });
    },

    onCanvasOpenCreateClassDialogWithGeneralization: (nodeIdentifier, positionToPlaceClassOn, isCreatedClassParent) => {
      withVisualModel(notifications, graph, (visualModel) => {
        openCreateClassDialogAndCreateGeneralizationAction(
          cmeExecutor, notifications, dialogs, classes, options, graph, diagram,
          visualModel, nodeIdentifier, isCreatedClassParent, positionToPlaceClassOn
        );
      });
    },

    onCreateNewViewFromSelection: () => {
      const { nodeSelection, edgeSelection } = getSelections(diagram, false, true);
      openCreateNewVisualModelFromSelectionDialog(nodeSelection, edgeSelection, false);
    },

    onProfileSelection: () => {
      const { nodeSelection, edgeSelection } = getSelections(diagram, true, false);
      withVisualModel(notifications, graph, (visualModel) => {
        createDefaultProfilesAction(
          cmeExecutor, notifications, graph, diagram, options, classes,
          visualModel, nodeSelection, edgeSelection, true);
      });
    },

    onHideSelection: () => {
      const { nodeSelection, edgeSelection } = getSelections(diagram, true, true);
      removeFromVisualModelByVisual(nodeSelection.concat(edgeSelection));
    },

    onDeleteSelection: () => {
      const { nodeSelection, edgeSelection } = getSelections(diagram, true, false);
      console.info("Removing selection from semantic model: ", { nodeSelection, edgeSelection });
      const selectionIdentifiers = nodeSelection.concat(edgeSelection);
      deleteVisualElements(selectionIdentifiers);
    },

    onRemoveAttributeFromNode: (attribute: string, nodeIdentifier: string) => {
      removeAttributesFromVisualNode([attribute], nodeIdentifier);
    },

    onEditEntityItem: (identifier: string) => {
      withVisualModel(notifications, graph, (visualModel) => {
        const model = findSourceModelOfEntity(identifier, graph.models);
        if(model === null) {
          notifications.error("Given attribute does not have source model.");
          return;
        }
        if(!isInMemorySemanticModel(model)) {
          notifications.error("Given attribute does have source model, but it is not writable.");
          return;
        }
        const entity = model.getEntities()[identifier];

        if(isSemanticModelAttribute(entity)) {
          openEditAttributeDialogAction(
            cmeExecutor, options, dialogs, classes, graph,
            visualModel, model, entity);
        } else if(isSemanticModelAttributeProfile(entity)) {
          openEditAttributeProfileDialogAction(
            cmeExecutor, options, dialogs, classes, graph,
            visualModel, model, entity);
        } else if (isSemanticModelRelationship(entity)) {
          openEditAssociationDialogAction(
            cmeExecutor, options, dialogs, classes, graph,
            visualModel, model, entity);
        } else if (isSemanticModelRelationshipProfile(entity)) {
          openEditAssociationProfileDialogAction(
            cmeExecutor, options, dialogs, classes, graph,
            visualModel, model, entity);
        } else {
          notifications.error("Can not edit given item.");
        }
      });
    },

    onMoveAttributeUp: function (attribute: string, nodeIdentifier: string): void {
      shiftAttributeUp(attribute, nodeIdentifier);
    },

    onMoveAttributeDown: function (attribute: string, nodeIdentifier: string): void {
      shiftAttributeDown(attribute, nodeIdentifier);
    },
  };

  diagram.setCallbacks(callbacks);

  return {
    openCreateModelDialog,
    openEditSemanticModelDialog,
    deleteSemanticModel,
    openDetailDialog,
    openModifyDialog,
    openCreateClassDialog,
    openCreateAssociationDialog,
    openCreateAttributeDialogForModel,
    openCreateAttributeDialogForClass,
    openEditNodeAttributesDialog,
    openCreateProfileDialog,
    openSearchExternalSemanticModelDialog,
    //
    addSemanticEntitiesToVisualModel,
    addClassToVisualModel,
    addClassProfileToVisualModel,
    addGeneralizationToVisualModel,
    addRelationToVisualModel,
    addRelationProfileToVisualModel,
    addAttributeToVisualModel,
    shiftAttributeUp,
    shiftAttributeDown,
    removeFromVisualModelByRepresented,
    removeFromVisualModelByVisual,
    removeAttributesFromVisualModel,
    //
    deleteFromSemanticModels,
    createVisualNodeDuplicate,
    centerViewportToVisualEntityByRepresented,

    openCreateNewVisualModelFromSelectionDialog,
    changeVisualModel,
    openCreateNewVisualModelDialog,
    addEntitiesFromSemanticModelToVisualModel,
    removeEntitiesInSemanticModelFromVisualModel,
    addEntityNeighborhoodToVisualModel,

    layoutActiveVisualModel,
    //
    openExtendSelectionDialog,
    openFilterSelectionDialog,
    extendSelection,
    filterSelection,
    highlightNodeInExplorationModeFromCatalog,
    diagram,
  };

}

function withVisualModel(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  callback: (visualModel: WritableVisualModel) => void,
): void {
  const visualModel = graph.aggregatorView.getActiveVisualModel();
  if (visualModel === null) {
    notifications.error("There is no active visual model.");
    return;
  }
  if (!isWritableVisualModel(visualModel)) {
    notifications.error("Visual model is not writable.");
    return;
  }
  callback(visualModel);
}

export const useActions = (): ActionsContextType => {
  return useContext(ActionContext);
};
