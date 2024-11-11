import React, { useContext, useMemo } from "react";

import { type InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";

import { type DialogApiContextType } from "../dialog/dialog-service";
import { DialogApiContext } from "../dialog/dialog-context";
import { configuration, logger } from "../application";
import { type EditClassState } from "../dialog/class/edit-class-dialog-controller";
import { type ClassesContextType, ClassesContext, useClassesContext, UseClassesContextType } from "../context/classes-context";
import { useNotificationServiceWriter } from "../notification";
import { type UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ModelGraphContext, type ModelGraphContextType } from "../context/model-context";
import { createAddModelDialog } from "../dialog/model/create-model-dialog";
import { type CreateModelState } from "../dialog/model/create-model-dialog-controller";
import { createEditClassDialog } from "../dialog/class/edit-class-dialog";
import { createVocabulary } from "./create-vocabulary";
import { createClassAction } from "./create-class";
import { addNodeToVisualModelAction } from "./add-node-to-visual-model";
import { addRelationToVisualModelAction } from "./add-relation-to-visual-model";
import { deleteFromSemanticModelAction } from "./delete-from-semantic-model";
import { deleteFromVisualModelAction } from "./delete-from-visual-model";
import { Position, useDiagram, type DiagramCallbacks } from "../diagram/";
import type { UseDiagramType } from "../diagram/diagram-hook";
import { useOptions, type Options } from "../application/options";
import { centerViewportToVisualEntityAction } from "./center-viewport-to-visual-entity";
import { openDetailDialogAction } from "./open-detail-dialog";
import { openModifyDialogAction } from "./open-modify-dialog";
import { findSourceModelOfEntity } from "../service/model-service";
import { openCreateProfileDialogAction } from "./open-create-profile-dialog";
import { isVisualProfileRelationship, isVisualRelationship, isWritableVisualModel, Waypoint } from "@dataspecer/core-v2/visual-model";
import { openCreateConnectionDialogAction } from "./open-create-connection";
import { placePositionOnGrid, ReactflowDimensionsConstantEstimator } from "@dataspecer/layout";

export interface ActionsContextType {

  /**
   * Open dialog to add a new model.
   */
  openCreateModelDialog: () => void;

  /**
   * Open detail dialog, the type of the dialog is determined based on the
   * entity type.
   */
  openDetailDialog: (identifier: string) => void;

  /**
   * Open modification entity dialog, the type of the dialog is determined
   * based on the entity type.
   */
  openModifyDialog: (identifier: string) => void;

  /**
   * Open dialog to create a new class.
   * When position is provided the class is also inserted to the canvas.
   */
  openCreateClassDialog: (model: InMemorySemanticModel) => void;

  /**
   * Open dialog to create a profile for entity with given identifier.
   */
  openCreateProfileDialog: (identifier: string) => void;

  /**
   * Position is determined by the action.
   */
  addNodeToVisualModel: (model: string, identifier: string) => void;

  addNodeToVisualModelToPosition: (model: string, identifier: string, position: { x: number, y: number }) => void;

  addRelationToVisualModel: (model: string, identifier: string) => void;

  deleteFromSemanticModel: (model: string, identifier: string) => Promise<void>;

  removeFromVisualModel: (identifier: string) => void;

  centerViewportToVisualEntity: (model: string, identifier: string) => void;

  /**
   * As this context requires two way communication it is created and shared via the actions.
   */
  diagram: UseDiagramType | null;

}

const noOperationActionsContext = {
  openCreateModelDialog: noOperation,
  openDetailDialog: noOperation,
  openModifyDialog: noOperation,
  openCreateClassDialog: noOperation,
  openCreateProfileDialog: noOperation,
  addNodeToVisualModel: noOperation,
  addNodeToVisualModelToPosition: noOperation,
  addRelationToVisualModel: noOperation,
  deleteFromSemanticModel: noOperationAsync,
  removeFromVisualModel: noOperation,
  centerViewportToVisualEntity: noOperation,
  diagram: null,
};

export const ActionContext = React.createContext<ActionsContextType>(noOperationActionsContext);

function noOperation() {
  logger.error("[ACTIONS] Using uninitialized actions context!");
}

function noOperationAsync() {
  logger.error("[ACTIONS] Using uninitialized actions context!");
  return Promise.resolve();
}

export const ActionsContextProvider = (props: {
  children: React.ReactNode,
}) => {
  const options = useOptions();
  const dialogs = useContext(DialogApiContext);
  const classes = useContext(ClassesContext);
  const useClasses = useClassesContext();
  const notifications = useNotificationServiceWriter();
  const graph = useContext(ModelGraphContext);
  const diagram = useDiagram();

  const actions = useMemo(
    () => createActionsContext(
      options, dialogs, classes, useClasses, notifications, graph, diagram),
    [options, dialogs, classes, useClasses, notifications, graph, diagram]
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
let prevDiagram: UseDiagramType | null = null;

function createActionsContext(
  options: Options | null,
  dialogs: DialogApiContextType | null,
  classes: ClassesContextType | null,
  useClasses: UseClassesContextType | null,
  notifications: UseNotificationServiceWriterType | null,
  graph: ModelGraphContextType | null,
  diagram: UseDiagramType,
): ActionsContextType {
  if (options === null ||
    dialogs === null ||
    classes === null ||
    useClasses == null ||
    notifications === null ||
    graph === null ||
    !diagram.areActionsReady) {
    // We need to return the diagram object so it can be consumed by
    // the Diagram component and initialized.
    return {
      ...noOperationActionsContext,
      diagram,
    };
  }

  //
  const changed = [];
  if (prevOptions !== options) changed.push("options");
  if (prevDialogs !== dialogs) changed.push("dialogs");
  if (prevClasses !== classes) changed.push("classes");
  if (prevUseClasses !== useClasses) changed.push("prevUseClasses");
  if (prevNotifications !== notifications) changed.push("notifications");
  if (prevGraph !== graph) changed.push("graph");
  if (prevDiagram !== diagram) changed.push("diagram");
  console.info("[ACTIONS] Creating new context object. ", { changed });
  prevOptions = options;
  prevDialogs = dialogs;
  prevClasses = classes;
  prevUseClasses = useClasses;
  prevNotifications = notifications;
  prevGraph = graph;
  prevDiagram = diagram;
  //

  const openDetailDialog = (identifier: string) => {
    openDetailDialogAction(options, dialogs, notifications, graph, identifier);
  };

  const openModifyDialog = (identifier: string) => {
    openModifyDialogAction(
      options, dialogs, notifications, classes, useClasses, graph, identifier);
  };

  const openCreateModelDialog = () => {
    const onConfirm = (state: CreateModelState) => {
      createVocabulary(graph, state);
    };
    //
    dialogs?.openDialog(createAddModelDialog(onConfirm));
  };

  const openCreateClassDialog = (model: InMemorySemanticModel) => {
    const viewport = diagram.actions().getViewport();
    const position = {
      x: viewport.position.x + (viewport.width / 2),
      y: viewport.position.y + (viewport.height / 2),
    };
    //
    const onConfirm = (state: EditClassState) => {
      createClassAction(notifications, graph, model, position, state);
    };
    //
    dialogs?.openDialog(createEditClassDialog(model, options.language, onConfirm));
  };

  const openCreateProfileDialog = (identifier: string) => {
    const viewport = diagram.actions().getViewport();
    const position = {
      x: viewport.position.x + (viewport.width / 2),
      y: viewport.position.y + (viewport.height / 2),
    };
    //
    openCreateProfileDialogAction(
      options, dialogs, notifications, classes, useClasses, graph,
      position, identifier);
  };

  const openCreateConnectionDialog = (source: string, target: string) => {
    openCreateConnectionDialogAction(
      options, dialogs, notifications, useClasses, graph, source, target);
  };

  const addNodeToVisualModel = (model: string, identifier: string) => {
    // We position the new node to the center of the viewport.
    const viewport = diagram.actions().getViewport();

    const position = {
      x: viewport.position.x + (viewport.width / 2),
      y: viewport.position.y + (viewport.height / 2),
    };
    position.x -= ReactflowDimensionsConstantEstimator.getDefaultWidth() / 2;
    position.y -= ReactflowDimensionsConstantEstimator.getDefaultHeight() / 2;
    placePositionOnGrid(position, configuration().xSnapGrid, configuration().ySnapGrid);

    addNodeToVisualModelAction(notifications, graph, model, identifier, position);
  };

  const addNodeToVisualModelToPosition = (model: string, identifier: string, position: { x: number, y: number }) => {
    addNodeToVisualModelAction(notifications, graph, model, identifier, position);
  };

  const addRelationToVisualModel = (model: string, identifier: string) => {
    addRelationToVisualModelAction(notifications, graph, model, identifier);
  };

  const deleteFromSemanticModel = (model: string, identifier: string) => {
    return deleteFromSemanticModelAction(notifications, graph, model, identifier);
  };

  const removeFromVisualModel = (identifier: string) => {
    deleteFromVisualModelAction(notifications, graph, identifier);
  };

  const centerViewportToVisualEntity = (model: string, identifier: string) => {
    centerViewportToVisualEntityAction(notifications, graph, diagram, model, identifier);
  };

  const deleteVisualElement = (identifier: string) => {
    const model = findSourceModelOfEntity(identifier, graph.models);
    if (model === null) {
      notifications.error("Can't find model for entity.");
      return;
    }
    removeFromVisualModel(identifier);
    deleteFromSemanticModel(model.getId(), identifier);
  };

  const changeNodesPositions = (changes: { [identifier: string]: Position }) => {
    const visualModel = graph.aggregatorView.getActiveVisualModel();
    if (visualModel === null) {
      notifications.error("There is no active visual model.");
      return;
    }
    if (!isWritableVisualModel(visualModel)) {
      notifications.error("Visual model is not writable.");
      return;
    }
    //
    for (const [identifier, position] of Object.entries(changes)) {
      visualModel.updateVisualEntity(identifier, { position });
    }
  };

  // Prepare and set diagram callbacks.

  const callbacks: DiagramCallbacks = {

    onShowNodeDetail: (node) => openDetailDialog(node.externalIdentifier),

    onEditNode: (node) => openModifyDialog(node.externalIdentifier),

    onCreateNodeProfile: (node) => openCreateProfileDialog(node.externalIdentifier),

    onHideNode: (node) => removeFromVisualModel(node.externalIdentifier),

    onDeleteNode: (node) => deleteVisualElement(node.externalIdentifier),

    onChangeNodesPositions: changeNodesPositions,

    onShowEdgeDetail: (node) => openDetailDialog(node.externalIdentifier),

    onEditEdge: (edge) => openModifyDialog(edge.externalIdentifier),

    onCreateEdgeProfile: (edge) => openCreateProfileDialog(edge.externalIdentifier),

    onHideEdge: (edge) => removeFromVisualModel(edge.externalIdentifier),

    onDeleteEdge: (edge) => deleteVisualElement(edge.externalIdentifier),

    onAddWaypoint: (edge, index, waypoint) => {
      const visualModel = graph.aggregatorView.getActiveVisualModel();
      if (visualModel === null) {
        notifications.error("There is no active visual model.");
        return;
      }
      if (!isWritableVisualModel(visualModel)) {
        notifications.error("Visual model is not writable.");
        return;
      }
      //
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
    },

    onDeleteWaypoint: (edge, index) => {
      const visualModel = graph.aggregatorView.getActiveVisualModel();
      if (visualModel === null) {
        notifications.error("There is no active visual model.");
        return;
      }
      if (!isWritableVisualModel(visualModel)) {
        notifications.error("Visual model is not writable.");
        return;
      }
      //
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
    },

    onChangeWaypointPositions: (changes) => {
      const visualModel = graph.aggregatorView.getActiveVisualModel();
      if (visualModel === null) {
        notifications.error("There is no active visual model.");
        return;
      }
      if (!isWritableVisualModel(visualModel)) {
        notifications.error("Visual model is not writable.");
        return;
      }
      //
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
      console.log("Application.onChangeWaypointPositions", { changes });
    },

    onCreateConnectionToNode: (source, target) => {
      openCreateConnectionDialog(source.externalIdentifier, target.externalIdentifier);
    },

    onCreateConnectionToNothing: (source, position) => {
      console.log("Application.onCreateConnectionToNothing", { source, position });
    },

    onSelectionDidChange: (nodes, edges) => {
      console.log("Application.onSelectionDidChange", { nodes, edges });
    },

  };

  diagram.setCallbacks(callbacks);

  return {
    openCreateModelDialog,
    openDetailDialog,
    openModifyDialog,
    openCreateClassDialog,
    openCreateProfileDialog,
    addNodeToVisualModel,
    addNodeToVisualModelToPosition,
    addRelationToVisualModel,
    deleteFromSemanticModel,
    removeFromVisualModel,
    centerViewportToVisualEntity,
    diagram,
  };

}

export const useActions = (): ActionsContextType => {
  return useContext(ActionContext);
};
