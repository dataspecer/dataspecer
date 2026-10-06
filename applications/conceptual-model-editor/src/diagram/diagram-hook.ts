import { useCallback, useMemo, useRef, useState } from "react";

import type { DiagramCallbacks, DiagramActions } from "./diagram-api";

export interface UseDiagramType {

  /**
   * True when actions are ready.
   * Do not use actions before this is true.
   */
  areActionsReady: boolean;

  actions: () => DiagramActions;

  setActions: (nextActions: DiagramActions) => void;

  callbacks: () => DiagramCallbacks;

  setCallbacks: (nextCallbacks: DiagramCallbacks) => void;

}

/**
 * Do not use actions before they are ready.
 */
export const useDiagram = (): UseDiagramType => {
  // We keep this as a state, to trigger re-render.
  const [areActionsReady, setActionsReady] = useState(false);

  // Following are only refs, as we provide getter to return the current value.
  const actions = useRef<DiagramActions>(noOperationDiagramActions);
  const callbacks = useRef<DiagramCallbacks>(noOperationCallbacks);

  const getActions = useCallback(() => actions.current, [actions]);

  const getCallbacks = useCallback(() => callbacks.current, [callbacks]);

  return useMemo(() => {
    return {
      areActionsReady,
      actions: getActions,
      setActions: (nextActions) => {
        setActionsReady(true);
        actions.current = nextActions;
      },
      callbacks: getCallbacks,
      setCallbacks: (nextCallbacks) => {
        callbacks.current = nextCallbacks;
      },
    };
  }, [areActionsReady, getActions, setActionsReady, actions, getCallbacks, callbacks]);
};

const noOperation = () => {
  console.warn("Calling no operation function. You need to wait before the context is ready.");
};

const noOperationNullAsync = () => {
  console.warn("Calling no operation function. You need to wait before the context is ready.");
  return Promise.resolve(null);
};

const noOperationAsync = () => {
  console.warn("Calling no operation function. You need to wait before the context is ready.");
  return Promise.resolve();
};

const noOperationArray = () => {
  console.warn("Calling no operation function. You need to wait before the context is ready. Returning empty array.");
  return [];
};

const noOperationThrow = () => {
  throw new Error("Function not implemented.  You need to wait before the context is ready.");
};

/**
 * No operation implementation of actions.
 */
const noOperationDiagramActions: DiagramActions = {
  getNodes: noOperationArray,
  addNodes: noOperation,
  updateNodes: noOperation,
  removeNodes: noOperation,
  getEdges: noOperationArray,
  addEdges: noOperation,
  updateEdges: noOperation,
  removeEdges: noOperation,
  setContent: noOperationAsync,
  setViewportToPosition: noOperation,
  centerViewportToNode: noOperation,
  fitToView: noOperation,
  getGroups: noOperationArray,
  addGroups: noOperation,
  removeGroups: noOperation,
  setGroup: noOperation,
  getGroupContent: noOperationArray,
  updateNodesPosition: noOperation,
  getNodeWidth: noOperationThrow,
  getNodeHeight: noOperationThrow,
  setEdgesWaypointPosition: noOperation,
  getSelectedNodes: noOperationArray,
  setSelectedNodes: noOperation,
  getSelectedEdges: noOperationArray,
  setSelectedEdges: noOperation,
  getViewport: noOperationThrow,
  renderToSvgString: noOperationNullAsync,
  openDragEdgeToCanvasMenu: noOperation,
  openSelectionActionsMenu: noOperation,
  openAlignmentMenu: noOperation,
  openGroupMenu: noOperation,
};

const noOperationCallbacks: DiagramCallbacks = {
  onShowNodeDetail: noOperation,
  onEditRepresentedByNode: noOperation,
  onCreateNodeProfile: noOperation,
  onDuplicateNode: noOperation,
  onAddAllRelationships: noOperation,
  onHideNode: noOperation,
  onDeleteNode: noOperation,
  onChangeNodesPositions: noOperation,
  onCreateAttributeForNode: noOperation,
  onShowEdgeDetail: noOperation,
  onEditEdge: noOperation,
  onCreateEdgeProfile: noOperation,
  onHideEdge: noOperation,
  onDeleteEdge: noOperation,
  onAddWaypoint: noOperation,
  onDeleteWaypoint: noOperation,
  onChangeWaypointPositions: noOperation,
  onSelectionDidChange: noOperation,
  onCreateConnectionToNode: noOperation,
  onCreateConnectionToNothing: noOperation,
  onToggleAnchorForNode: noOperation,
  onShowSelectionActionsMenu: noOperation,
  onOpenAlignmentMenu: noOperation,
  onLayoutSelection: noOperation,
  onCreateGroup: noOperation,
  onDissolveGroup: noOperation,
  onCreateVisualModelDiagramNodeFromSelection: noOperation,
  onDissolveVisualModelDiagramNode: noOperation,
  onMoveToVisualModelRepresentedByVisualModelDiagramNode: noOperation,
  onEditVisualModelDiagramNode: noOperation,
  onShowInfoForVisualModelDiagramNode: noOperation,
  onHideVisualModelDiagramNode: noOperation,
  onShowExpandSelection: noOperation,
  onShowFilterSelection: noOperation,
  onCanvasOpenCreateClassDialog: noOperation,
  onCanvasOpenCreateClassDialogWithAssociation: noOperation,
  onCanvasOpenCreateClassDialogWithGeneralization: noOperation,
  onCreateNewViewFromSelection: noOperation,
  onProfileSelection: noOperation,
  onHideSelection: noOperation,
  onDeleteSelection: noOperation,
  onRemoveAttributeFromNode: noOperation,
  onEditEntityItem: noOperation,
  onEditVisualNode: noOperation,
  onMoveAttributeUp: noOperation,
  onMoveAttributeDown: noOperation,
  onAlignSelectionHorizontally: noOperation,
  onAlignSelectionVertically: noOperation,
};
