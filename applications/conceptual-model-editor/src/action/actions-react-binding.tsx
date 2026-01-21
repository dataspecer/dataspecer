import React, { useContext, useMemo } from "react";

import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  Waypoint,
  WritableVisualModel,
  isVisualDiagramNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  isWritableVisualModel
} from "@dataspecer/visual-model";

import { type DialogApiContextType } from "../dialog/dialog-service";
import { DialogApiContext } from "../dialog/dialog-context";
import { createLogger } from "../application";
import {
  ClassesContext,
  type ClassesContextType,
  UseClassesContextType,
  useClassesContext,
} from "../context/classes-context";
import { useNotificationServiceWriter } from "../notification";
import { type UseNotificationServiceWriterType } from "../notification/notification-service-context";
import {
  ModelGraphContext,
  useModelGraphContext,
  UseModelGraphContextType,
  type ModelGraphContextType,
} from "../context/model-context";
import {
  type DiagramCallbacks,
  type Waypoint as DiagramWaypoint,
  Edge,
  isVisualModelDiagramNode,
  Position,
  useDiagram,
  VisualModelDiagramNode,
} from "../diagram/";
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
import {
  EntityToDelete,
  isAttributeOrAttributeProfile,
  convertToEntitiesToDeleteType,
  findTopLevelGroupInVisualModel,
  getSelections,
  getViewportCenterForClassPlacement,
  setSelectionsInDiagram,
  isVisualEdgeEnd,
} from "./utilities";
import { removeFromSemanticModelsAction } from "./remove-from-semantic-model";
import { openCreateAttributeDialogAction } from "./open-create-attribute-dialog";
import { openCreateAssociationDialogAction } from "./open-create-association-dialog";
import { addEntitiesFromSemanticModelToVisualModelAction } from "./add-entities-from-semantic-model-to-visual-model";
import { addEntityNeighborhoodToVisualModelAction } from "./add-entity-neighborhood-to-visual-model";
import { createDefaultProfilesAction } from "./create-default-profiles";
import { openCreateClassDialogWithModelDerivedFromClassAction } from "./open-create-class-dialog-with-derived-model";
import {
  EntityToAddToVisualModel,
  addSemanticEntitiesToVisualModelAction,
} from "./add-semantic-entities-to-visual-model";
import { UserGivenAlgorithmConfigurations, LayoutedVisualEntities } from "@dataspecer/layout";
import { layoutActiveVisualModelAction } from "./layout-visual-model";
import { toggleAnchorAction } from "./toggle-anchor";
import { SelectionFilterState } from "../dialog/selection/filter-selection-dialog-controller";
import { SelectionFilter, Selections, SelectionsWithIdInfo, filterSelectionAction } from "./filter-selection-action";
import { createExtendSelectionDialog } from "../dialog/selection/extend-selection-dialog";
import { ExtendSelectionState } from "../dialog/selection/extend-selection-dialog-controller";
import {
  ExtensionType,
  NodeSelection,
  VisibilityFilter,
  extendSelectionAction,
  getSelectionForWholeSemanticModel,
} from "./extend-selection-action";
import { createFilterSelectionDialog } from "../dialog/selection/filter-selection-dialog";
import { EntityModel } from "@dataspecer/core-v2";
import { openCreateAttributeForEntityDialogAction } from "./open-add-attribute-for-entity-dialog";
import { addGroupToVisualModelAction } from "./add-group-to-visual-model";
import { removeTopLevelGroupFromVisualModelAction } from "./remove-group-from-visual-model";
import { removeAttributesFromVisualModelAction } from "./remove-attributes-from-visual-model";
import { ShiftAttributeDirection, shiftAttributePositionAction } from "./shift-attribute";
import { openEditNodeAttributesDialogAction } from "./open-edit-node-attributes-dialog";
import { openEditAttributeDialogAction } from "./open-edit-attribute-dialog";
import { openEditAttributeProfileDialogAction } from "./open-edit-attribute-profile-dialog";
import { findSourceModelOfEntity } from "../service/model-service";
import { isInMemorySemanticModel } from "../dataspecer/semantic-model";
import { isSemanticModelAttribute, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelAttributeProfile } from "../dataspecer/semantic-model";
import { createCmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { createVisualEdgeEndpointDuplicateAction } from "./create-visual-edge-endpoint-duplicate";
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
import { openCreateVisualModelDialogAction } from "./open-create-visual-model-dialog";
import { openEditSemanticModelDialogAction } from "./open-edit-semantic-model-dialog";
import { EntityDsIdentifier, ModelDsIdentifier } from "@/dataspecer/entity-model";
import { openSearchExternalSemanticModelDialogAction } from "./open-search-external-semantic-model-dialog";
import { openEditVisualModelDialogAction } from "./open-edit-visual-model-dialog";
import { saveViewportPositionAction } from "./save-viewport-position";
import { LayoutConfigurationContextType, useLayoutConfigurationContext } from "@/context/layout-configuration-context";
import { openCreateClassDialogAndCreateGeneralizationAction } from "./open-create-class-dialog-with-generalization";
import { openCreateClassDialogAndCreateAssociationAction } from "./open-create-class-dialog-with-association";
import {
  alignHorizontallyAction,
  AlignmentHorizontalPosition,
  AlignmentVerticalPosition,
  alignVerticallyAction,
} from "./align-nodes";
import { openLayoutSelectionDialogAction } from "./open-layout-selection-dialog";
import { openLayoutVisualModelDialogAction } from "./open-layout-visual-model-dialog";
import { openVisualDiagramNodeInfoDialogAction } from "./open-visual-diagram-node-info-dialog";
import { openEditVisualDiagramNodeDialogAction } from "./open-edit-visual-diagram-node-dialog";
import { openCreateVisualDiagramNodeDialogAction } from "./open-create-visual-diagram-node-dialog";
import { addAllRelationshipsForVisualDiagramNodeToVisualModelAction } from "./add-all-relationships";
import {
  addVisualDiagramNodeForExistingModelToVisualModelAction,
} from "./create-visual-diagram-node-for-existing-model";
import { putVisualDiagramNodeContentToVisualModelAction } from "./put-visual-diagram-node-content-to-visual-model";
import {
  AddSemanticClassSurroundingsOperation,
  createCmeOperationExecutor,
  ReleaseSemanticClassSurroundingsOperation,
} from "../operation";
import { openProfileModelDialogAction } from "./open-profile-model-dialog";

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
    onConfirmCallback: (
      (state: AttributeDialogState | AttributeProfileDialogState, createdAttributeIdentifier: string) => void) | null
  ) => void;

  /**
   * Open dialog to edit node's attributes.
   */
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

  /**
   * Open dialog to layout visual model.
   */
  openPerformLayoutVisualModelDialog: () => void;

  openSearchExternalSemanticModelDialog: (identifier: ModelDsIdentifier) => void;

  openProfileModelDialog: (model: ModelDsIdentifier) => Promise<void>;

}

/**
 * Contains actions used for manipulation with visual model .
 */
interface VisualModelActions {

  /**
   * Adds semantic entities identified by identifier to currently active visual model at optional position.
   * @param entities are the semantic entities to be added to visual model. For further info check the
   *  docs of {@link EntityToAddToVisualModel}.
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
   * Adds semantic class profile identified by {@link identifier} to currently active visual model at
   * given {@link position}.
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
   * Adds relation (association) identified by {@link identifier} to currently active visual model at
   * given {@link position}.
   * @param model identifies the semantic model, where the semantic entity resides.
   * @param identifier identifies the relation to be added to visual model.
   */
  addRelationToVisualModel: (model: string, identifier: string) => void;

  /**
   * Adds relation (association) profile identified by {@link identifier} to currently active visual model at
   * given {@link position}.
   * @param model identifies the semantic model, where the semantic entity resides.
   * @param identifier identifies the relation profile to be added to visual model.
   */
  addRelationProfileToVisualModel: (model: string, identifier: string) => void;

  /**
   * Adds new visual diagram node, which is refering to provided visual model.
   */
  addVisualDiagramNodeForExistingModelToVisualModel: (visualModelToRepresent: string) => void;

  /**
   * Adds all relationships which are not currently visible on canvas and are going to some of the class inside the
   * represented visual model, which represents the {@link visualModelDiagramNode}.
   */
  addAllRelationshipsForVisualDiagramNodeToVisualModel: (visualModelDiagramNode: VisualModelDiagramNode) => void;

  /**
   * Add attribute to visual model, that is put the {@link attribute} each node representing {@link domainClass}.
   * Add it only to those nodes, which don't have it yet.
   */
  addAttributeToVisualModel: (attribute: string, domainClass: string | null) => void;

  /**
   * Moves {@link attribute} one position up on {@link domainNode} of attributes.
   */
  shiftAttributeUp: (attribute: string, domainNode: string | null) => void;

  /**
   * Moves {@link attribute} one position down on {@link domainNode} of attributes.
   */
  shiftAttributeDown: (attribute: string, domainNode: string | null) => void;

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

  /**
   * Remove all occurrences of {@link attributes} from visual model
   */
  removeAttributesFromVisualModel: (attributes: string[]) => void;

  /**
   * Creates duplicate (copy) of node with given visual {@link identifier}.
   * The duplicated node contains all edges of the existing duplicates.
   * So for example if we have A -> B, A' -> C on canvas and we call this method for A'
   * then the newly created A'' will have following edges A'' -> C, but also A'' -> B.
   * @param identifier is the identifier of the visual node
   */
  createVisualEdgeEndpointDuplicate: (identifier: string) => void;

  //

  /**
   * Opens dialog, which after confirmation creates new visual model with content equal to {@link nodeSelection} and
   * relevant edges from {@link edgeSelection}.
   *
   * @deprecated We have two other actions {@link openCreateVisualModelDialog} and {@link changeVisualModel}.
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
   * Open dialog to create and select new visual model.
   */
  openCreateVisualModelDialog: () => void;

  /**
   * Open edit dialog for edit.
   */
  openEditVisualModelDialog: (identifier: string) => void;

  /**
   * Saves the current viewport position to the active visual model.
   * This position will be restored when the model is loaded again.
   */
  saveViewportPosition: () => void;

  /**
   * Add entities from given semantic model identified by
   * {@link semanticModel} to currently active visual model.
   */
  addEntitiesFromSemanticModelToVisualModel: (semanticModel: EntityModel | string) => Promise<void>;

  /**
   * Remove all visual representations of entities present in {@link semanticModel} from active visual model.
   */
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
  ) => Selections;

  filterSelection: (
    selections: SelectionsWithIdInfo,
    filters: SelectionFilter[],
    visibilityFilter: VisibilityFilter,
    semanticModelFilter: Record<string, boolean> | null
  ) => Selections;

  highlightNodeInExplorationModeFromCatalog: (
    classIdentifier: string, modelOfClassWhichStartedHighlighting: string) => void;

  addSemanticClassSurroundings: (model: ModelDsIdentifier, entity: EntityDsIdentifier) => Promise<void>;

  releaseSemanticClassSurroundings: (model: ModelDsIdentifier, entity: EntityDsIdentifier) => Promise<void>;

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
  addVisualDiagramNodeForExistingModelToVisualModel: noOperation,
  addAllRelationshipsForVisualDiagramNodeToVisualModel: noOperation,
  shiftAttributeUp: noOperation,
  shiftAttributeDown: noOperation,
  deleteFromSemanticModels: noOperation,
  //
  removeFromVisualModelByRepresented: noOperation,
  removeFromVisualModelByVisual: noOperation,
  removeAttributesFromVisualModel: noOperation,
  createVisualEdgeEndpointDuplicate: noOperation,
  centerViewportToVisualEntityByRepresented: noOperation,
  //
  openCreateNewVisualModelFromSelectionDialog: noOperation,
  changeVisualModel: noOperation,
  openCreateVisualModelDialog: noOperation,
  openEditVisualModelDialog: noOperation,
  saveViewportPosition: noOperation,
  //
  addEntitiesFromSemanticModelToVisualModel: async () => { },
  removeEntitiesInSemanticModelFromVisualModel: noOperation,
  addEntityNeighborhoodToVisualModel: async () => { },
  layoutActiveVisualModel: noOperationAsync,
  //
  openExtendSelectionDialog: noOperation,
  openFilterSelectionDialog: noOperation,
  openPerformLayoutVisualModelDialog: noOperation,
  extendSelection: () => ({ nodeSelection: [], edgeSelection: [] }),
  filterSelection: () => ({ nodeSelection: [], edgeSelection: [] }),
  highlightNodeInExplorationModeFromCatalog: noOperation,
  openSearchExternalSemanticModelDialog: noOperation,
  addSemanticClassSurroundings: noOperationAsync,
  releaseSemanticClassSurroundings: noOperationAsync,
  openProfileModelDialog: noOperationAsync,
  diagram: null,
};

function noOperation() {
  LOG.error("[ACTIONS] Using uninitialized actions context!");
}

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
  const layoutConfiguration = useLayoutConfigurationContext();

  const queryParamsContext = useQueryParamsContext();

  const actions = useMemo(
    () => createActionsContext(
      options, dialogs, classes, useClasses, notifications, graph, useGraph,
      diagram, layoutConfiguration, queryParamsContext),
    [
      options, dialogs, classes, useClasses, notifications, graph, useGraph,
      diagram, layoutConfiguration, queryParamsContext]
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
let prevLayoutConfiguration: LayoutConfigurationContextType | null = null;
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
  layoutConfiguration: LayoutConfigurationContextType,
  queryParamsContext: QueryParamsContextType | null,
): ActionsContextType {

  if (options === null || dialogs === null || classes === null ||
    useClasses === null || notifications === null || graph === null ||
    !diagram.areActionsReady || layoutConfiguration === null ||
    queryParamsContext === null || useGraph === null) {
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
  if (prevLayoutConfiguration !== layoutConfiguration) changed.push("layoutConfiguration");
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
  prevLayoutConfiguration = layoutConfiguration;
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
        cmeExecutor, options, dialogs, notifications,
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
        const node = visualModel.getVisualEntity(identifier);
        if (node === null || !isVisualEdgeEnd(node)) {
          notifications.error("Node which changed position can not be found in visual model.");
          return;
        }
        visualModel.updateVisualEntity(identifier, { position: { ...position, anchored: node.position.anchored } });
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

  const openEditSemanticModelDialog = (identifier: string) => {
    withVisualModel(notifications, graph, (visualModel) => {
      openEditSemanticModelDialogAction(
        cmeExecutor, options, dialogs, graph, visualModel, identifier);
    });
  };

  const deleteSemanticModel = (identifier: string) => {
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

  const addClassToVisualModel = (
    model: string,
    identifier: string,
    position: { x: number, y: number } | null,
  ): void => {
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
    if (domainClass === null) {
      notifications.error("Adding attribute to domain class which is null");
      return;
    }
    withVisualModel(notifications, graph, (visualModel) => {
      addSemanticAttributeToVisualModelAction(notifications, visualModel, domainClass, attribute, true);
    });
  };

  const addVisualDiagramNodeForExistingModelToVisualModel = (visualModelToRepresent: string): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      addVisualDiagramNodeForExistingModelToVisualModelAction(
        notifications, graph, diagram, visualModel, visualModelToRepresent);
    });
  };

  const addAllRelationshipsForVisualDiagramNodeToVisualModel = (
    visualModelDiagramNode: VisualModelDiagramNode
  ): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      addAllRelationshipsForVisualDiagramNodeToVisualModelAction(
        notifications, classes, graph, visualModel, visualModelDiagramNode);
    });
  };

  const shiftAttributeUp = (attribute: string, domainNode: string | null): void => {
    if (domainNode === null) {
      notifications.error("Shifting attribute in domain node which is null");
      return;
    }
    withVisualModel(notifications, graph, (visualModel) => {
      shiftAttributePositionAction(notifications, visualModel, domainNode, attribute, ShiftAttributeDirection.Up, 1);
    });
  };

  const shiftAttributeDown = (attribute: string, domainNode: string | null): void => {
    if (domainNode === null) {
      notifications.error("Shifting attribute in domain node which is null");
      return;
    }
    withVisualModel(notifications, graph, (visualModel) => {
      shiftAttributePositionAction(notifications, visualModel, domainNode, attribute, ShiftAttributeDirection.Down, 1);
    });
  };

  const removeFromVisualModelByRepresented = (identifiers: string[]): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      removeFromVisualModelByRepresentedAction(
        notifications, graph, classes, visualModel, identifiers);
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

  const createVisualEdgeEndpointDuplicate = (identifier: string): void => {
    withVisualModel(notifications, graph, (visualModel) => {
      createVisualEdgeEndpointDuplicateAction(notifications, diagram, visualModel, identifier);
    });
  };

  // ...

  const deleteFromSemanticModels = (entitiesToDelete: EntityToDelete[]) => {
    // We start be removing from the visual model.
    withVisualModel(notifications, graph, (visualModel) => {
      const entityToDeleteWithAttributeData = entitiesToDelete.map(entityToDelete =>
        ({
          ...entityToDelete,
          isAttributeOrAttributeProfile: isAttributeOrAttributeProfile(
            entityToDelete.identifier, graph.models, entityToDelete.sourceModel)
        })
      );
      const attributesToBeDeleted =
        entityToDeleteWithAttributeData.filter(entity => entity.isAttributeOrAttributeProfile);
      const notAttributesToBeDeleted =
        entityToDeleteWithAttributeData.filter(entity => !entity.isAttributeOrAttributeProfile);
      removeFromVisualModelByRepresentedAction(
        notifications, graph, classes, visualModel,
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

  const openCreateNewVisualModelDialog = () => {
    return openCreateNewVisualModelFromSelectionDialog([], [], true);
  };

  const openEditVisualModelDialog = (identifier: string) => {
    const visualModel = graph.visualModels.get(identifier);
    if (visualModel === null) {
      notifications.error("There is no active visual model.");
      return;
    }
    if (!isWritableVisualModel(visualModel)) {
      notifications.error("Visual model is not writable.");
      return;
    }
    openEditVisualModelDialogAction(options, dialogs, visualModel);
  };

  const saveViewportPosition = () => {
    const activeVisualModel = graph.aggregatorView.getActiveVisualModel();
    if (!isWritableVisualModel(activeVisualModel)) {
      notifications.error("Cannot save viewport position: visual model is not writable.");
      return;
    }
    saveViewportPositionAction(activeVisualModel, diagram);
    notifications.success("Viewport position saved. Click 'Save' button to persist changes.");
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

  const openPerformLayoutVisualModelDialog = () => {
    withVisualModel(notifications, graph, (visualModel) => {
      openLayoutVisualModelDialogAction(
        notifications, dialogs, classes, diagram, graph, layoutConfiguration, visualModel);
    });
  };

  const extendSelection = (
    nodeSelection: NodeSelection,
    extensionTypes: ExtensionType[],
    visibilityFilter: VisibilityFilter,
    semanticModelFilter: Record<string, boolean> | null,
    shouldExtendByNodeDuplicates: boolean = true,
  ): Selections => {
    const selectionExtension = extendSelectionAction(
      notifications, graph, classes, nodeSelection,
      extensionTypes, visibilityFilter, semanticModelFilter,
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

      diagram.actions().highlightNodesInExplorationModeFromCatalog(
        nodeIdentifiers, modelOfClassWhichStartedHighlighting);
    });
  }

  const addSemanticClassSurroundings = async (
    semanticModel: ModelDsIdentifier, entity: EntityDsIdentifier,
  ) => {
    const cmeOperationExecutor = createCmeOperationExecutor(
      [...graph.models.values()], [...graph.visualModels.values()]);
    await cmeOperationExecutor.execute<AddSemanticClassSurroundingsOperation>({
      type: "add-class-surroundings-operation",
      semanticModel,
      entity,
    });
  }

  const releaseSemanticClassSurroundings = async (
    semanticModel: ModelDsIdentifier, entity: EntityDsIdentifier,
  ) => {
    const cmeOperationExecutor = createCmeOperationExecutor(
      [...graph.models.values()], [...graph.visualModels.values()]);
    await cmeOperationExecutor.execute<ReleaseSemanticClassSurroundingsOperation>({
      type: "release-class-surroundings-operation",
      semanticModel,
      entity,
    });
  }

  const openProfileModelDialog = async (model: ModelDsIdentifier) => {
    withVisualModel(notifications, graph, (visualModel) => {
      const cmeOperationExecutor = createCmeOperationExecutor(
        [...graph.models.values()], [...graph.visualModels.values()]);
      openProfileModelDialogAction(
        cmeOperationExecutor, options, dialogs, notifications, graph,
        visualModel, model);
    });
  };

  const callbacks: DiagramCallbacks = {
    onShowNodeDetail: (node) => openDetailDialog(node.externalIdentifier),

    onEditRepresentedByNode: (node) => openModifyDialog(node.externalIdentifier),

    onEditVisualNode: (node) => openEditNodeAttributesDialog(node.identifier),

    onCreateNodeProfile: (node) => openCreateProfileDialog(node.externalIdentifier),

    onDuplicateNode: (node) => createVisualEdgeEndpointDuplicate(node.identifier),

    onAddAllRelationships: (visualModelDiagramNode) =>
      addAllRelationshipsForVisualDiagramNodeToVisualModel(visualModelDiagramNode),

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
      if (isVisualModelDiagramNode(source)) {
        // Do nothing
      }
      else {
        openCreateConnectionDialog(
          source.externalIdentifier, target.externalIdentifier, source.identifier, target.identifier);
      }
    },

    onCreateConnectionToNothing: (source, canvasPosition) => {
      console.log("Application.onCreateConnectionToNothing", { source, canvasPosition });
      if (isVisualModelDiagramNode(source)) {
        return;
      }
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
    onOpenAlignmentMenu: (source, canvasPosition) => {
      console.log("Application.onOpenAlignmentMenu", { source, canvasPosition });
      diagram.actions().openAlignmentMenu(source, canvasPosition);
    },
    onLayoutSelection: () => {
      const selection = getSelections(diagram, false, true);
      withVisualModel(notifications, graph, (visualModel) => {
        openLayoutSelectionDialogAction(
          notifications, dialogs, classes, diagram, graph,
          visualModel, selection.nodeSelection, selection.edgeSelection);
      });
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

    onCreateVisualModelDiagramNodeFromSelection: () => {
      withVisualModel(notifications, graph, (visualModel) => {
        const { nodeSelection, edgeSelection } = getSelections(diagram, false, true);
        openCreateVisualDiagramNodeDialogAction(
          notifications, options, dialogs, graph, useGraph, diagram, visualModel, nodeSelection, edgeSelection);
      });
    },

    onDissolveVisualModelDiagramNode: (visualModelDiagramNode: VisualModelDiagramNode) => {
      withVisualModel(notifications, graph, (visualModel) => {
        putVisualDiagramNodeContentToVisualModelAction(
          notifications, classes, graph, diagram, visualModel, visualModelDiagramNode);
        removeFromVisualModelByVisualAction(notifications, visualModel, [visualModelDiagramNode.identifier]);
      });
    },

    onMoveToVisualModelRepresentedByVisualModelDiagramNode: (visualModelDiagramNodeIdentifier: string) => {
      withVisualModel(notifications, graph, (visualModel) => {
        const visualDiagramNode = visualModel.getVisualEntity(visualModelDiagramNodeIdentifier);
        if (visualDiagramNode === null) {
          notifications.error("Given diagram node is not part of visual model");
          return;
        }

        if (!isVisualDiagramNode(visualDiagramNode)) {
          notifications.error("Given diagram node is not of type diagram node");
          return;
        }

        changeVisualModelAction(graph, queryParamsContext, visualDiagramNode.representedVisualModel);
      });
    },

    onEditVisualModelDiagramNode: (visualModelDiagramNode: VisualModelDiagramNode) => {
      withVisualModel(notifications, graph, (visualModel) => {
        openEditVisualDiagramNodeDialogAction(
          notifications, options, dialogs, graph, visualModel, visualModelDiagramNode);
      });
    },

    onShowInfoForVisualModelDiagramNode: (visualModelDiagramNode: VisualModelDiagramNode) => {
      withVisualModel(notifications, graph, (visualModel) => {
        openVisualDiagramNodeInfoDialogAction(
          notifications, options, dialogs, graph, visualModel, visualModelDiagramNode);
      });
    },

    onHideVisualModelDiagramNode: (visualModelDiagramNode: VisualModelDiagramNode) => {
      withVisualModel(notifications, graph, (visualModel) => {
        removeFromVisualModelByVisualAction(notifications, visualModel, [visualModelDiagramNode.identifier]);
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
          cmeExecutor, notifications, graph, dialogs, classes, options,
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
        if (model === null) {
          notifications.error("Given attribute does not have source model.");
          return;
        }
        if (!isInMemorySemanticModel(model)) {
          notifications.error("Given attribute does have source model, but it is not writable.");
          return;
        }
        const entity = model.getEntities()[identifier];

        if (isSemanticModelAttribute(entity)) {
          openEditAttributeDialogAction(
            cmeExecutor, options, dialogs, classes, graph,
            visualModel, model, entity);
        } else if (isSemanticModelAttributeProfile(entity)) {
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
    onAlignSelectionHorizontally: function (alignmentHorizontalPosition: AlignmentHorizontalPosition): void {
      withVisualModel(notifications, graph, (visualModel) => {
        const nodeSelection = getSelections(diagram, true, true).nodeSelection;
        alignHorizontallyAction(
          notifications, diagram, visualModel, nodeSelection, alignmentHorizontalPosition);
      });
    },
    onAlignSelectionVertically: (alignmentVerticalPosition: AlignmentVerticalPosition) => {
      withVisualModel(notifications, graph, (visualModel) => {
        const nodeSelection = getSelections(diagram, true, true).nodeSelection;
        alignVerticallyAction(
          notifications, diagram, visualModel, nodeSelection, alignmentVerticalPosition);
      });
    }
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
    addVisualDiagramNodeForExistingModelToVisualModel,
    addAllRelationshipsForVisualDiagramNodeToVisualModel,
    shiftAttributeUp,
    shiftAttributeDown,
    removeFromVisualModelByRepresented,
    removeFromVisualModelByVisual,
    removeAttributesFromVisualModel,
    //
    deleteFromSemanticModels,
    createVisualEdgeEndpointDuplicate,
    centerViewportToVisualEntityByRepresented,
    openCreateNewVisualModelFromSelectionDialog,
    changeVisualModel,
    openCreateVisualModelDialog: openCreateNewVisualModelDialog,
    openEditVisualModelDialog,
    saveViewportPosition,
    addEntitiesFromSemanticModelToVisualModel,
    removeEntitiesInSemanticModelFromVisualModel,
    addEntityNeighborhoodToVisualModel,

    openPerformLayoutVisualModelDialog,
    layoutActiveVisualModel,
    //
    openExtendSelectionDialog,
    openFilterSelectionDialog,
    extendSelection,
    filterSelection,
    highlightNodeInExplorationModeFromCatalog,
    addSemanticClassSurroundings,
    releaseSemanticClassSurroundings,
    openProfileModelDialog,
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
