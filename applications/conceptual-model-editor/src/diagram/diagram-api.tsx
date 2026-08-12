import { AlignmentHorizontalPosition, AlignmentVerticalPosition } from "../action/align-nodes";
import {
  type Node,
  type Edge,
  type Group,
  type GroupWithContent,
  type Position,
  type ViewportDimensions,
  type Waypoint,
  type DiagramNodeTypes,
  type VisualModelDiagramNode,
} from "./diagram-model";

interface GroupActions {

  /**
   * @returns The list of groups registered in diagram.
   */
  getGroups(): Group[];

  /**
   * Registers new {@link groups} to the diagram.
   * @param groups are the groups to be registered.
   */
  addGroups(groups: GroupWithContent[], hideAddedTopLevelGroups: boolean): void;

  /**
   * Removes given groups from diagram.
   * @param groups is list of identifiers of the to be removed groups.
   */
  removeGroups(groups: string[]): void;

  /**
   * Sets the content of given {@link group} to given {@link content}.
   * @param group is the group to set content for.
   * @param content is the new content of the group.
   */
  setGroup(group: Group, content: string[]): void;

  /**
   * The content of {@link group} as node identifiers.
   * @param group is the group to get content for.
   * @returns The content of group as node identifiers.
   */
  getGroupContent(group: Group): string[];

}

interface NodeActions {

  /**
   * @returns The nodes registered inside diagram.
   */
  getNodes(): DiagramNodeTypes[];

  /**
   * Adds given {@link nodes} to the diagram.
   * @param nodes is the list of nodes to be added to the diagram.
   */
  addNodes(nodes: DiagramNodeTypes[]): void;

  /**
   * Updates diagram's nodes matching the given ones.
   * @param nodes are the updated versions of the matching nodes.
   */
  updateNodes(nodes: DiagramNodeTypes[]): void;

  /**
   * Updates the nodes' positions.
   * @param nodes is map, where identifier of node is mapped to the node's new position.
   */
  updateNodesPosition(nodes: { [identifier: string]: Position }): void;

  /**
   * Removes nodes whose identifiers match the given ones.
   * @param identifiers are identifiers of the to be removed nodes.
   */
  removeNodes(identifiers: string[]): void;

  /**
   * @param identifier is the id of the node.
   * @returns The width of given node in the diagram component.
   *  Null if the width couldn't be measured. For example when the node isn't in diagram, etc.
   */
  getNodeWidth(identifier: string): number | null;

  /**
   * @param identifier is the id of the node.
   * @returns The height of given node in the diagram component.
   *  Null if the height couldn't be measured. For example when the node isn't in diagram, etc.
   */
  getNodeHeight(identifier: string): number | null;
}

interface EdgeActions {

  /**
   * @returns The Edges registered inside diagram.
   */
  getEdges(): Edge[];

  /**
   * Adds given {@link edges} to the diagram.
   * @param edges is the list of edges to be added to the diagram.
   */
  addEdges(edges: Edge[]): void;

  /**
   * Updates diagram's edges matching the given ones.
   * @param edges are the updated versions of the matching edges.
   */
  updateEdges(edges: Edge[]): void;

  /**
   * Sets edges' waypoints.
   * @param positions is the map of the edges together with new waypoints for them.
   */
  setEdgesWaypointPosition(positions: { [identifier: string]: Position[] }): void;

  /**
   * Removes edges whose identifiers match the given ones.
   * @param identifiers are identifiers of the to be removed edges.
   */
  removeEdges(identifiers: string[]): void;
}

interface SelectionActions {

  /**
   * @returns Currently selected nodes within diagram.
   */
  getSelectedNodes(): DiagramNodeTypes[];

  /**
   * Sets diagram's node selection to the given {@link nodes}.
   * @param selectedNodes are the identifiers of the nodes,
   *  which will become the new content of the node selection.
   */
  setSelectedNodes(selectedNodes: string[]): void;

  /**
   * @returns Currently selected edges within diagram.
   */
  getSelectedEdges(): Edge[];

  /**
   * Sets diagram's edge selection to the given edges.
   * @param edges are the identifiers of the edges,
   *  which will become the new content of the edge selection.
   */
  setSelectedEdges(edges: string[]): void;

}

interface ViewportActions {

  /**
   * @returns The current position of viewport and its width and height.
   */
  getViewport(): ViewportDimensions;

  /**
   * Sets the viewport's position to given coordinates.
   * @param x is the new x-coordinate of the viewport.
   * @param y is the new y-coordinate of the viewport.
   */
  setViewportToPosition(x: number, y: number): void;

  /**
   * Centers diagram's viewport to node with given identifier.
   * @param identifier is the identifier of the node to center viewport to.
   */
  centerViewportToNode(identifier: string): void;

  /**
   * Fits (change zoom and move) diagram's viewport to nodes with given identifiers.
   * @param identifiers are the identifiers of the nodes to fit into view
   */
  fitToView(identifiers: string[]): void;

  /**
   * Return content of the current diagram view as a SVG string.
   */
  renderToSvgString(): Promise<string | null>;

}

/**
 * Actions that can be executed on the editor component.
 */
export interface DiagramActions extends
  GroupActions, NodeActions, EdgeActions, SelectionActions, ViewportActions {

  /**
   * Sets content of the diagram.
   * @returns When the diagram is ready.
   */
  setContent(nodes: DiagramNodeTypes[], edges: Edge[], groups: GroupWithContent[]): Promise<void>;

  /**
   * Opens menu on given {@link canvasPosition}.
   * The menu appears when user drags edge to canvas.
   * @param sourceNode is the node from which the connection dragging started
   * @param canvasPosition is the canvas position where user dragged the connection and on which will the menu appear
   */
  openDragEdgeToCanvasMenu(sourceNode: DiagramNodeTypes, canvasPosition: Position): void;

  /**
   * Opens menu on given {@link canvasPosition}.
   * The menu appears when user clicks the actions button on selection.
   * @param sourceNode is the node on which the user clicked the button.
   * @param canvasPosition is the canvas position where the menu will appear.
   */
  openSelectionActionsMenu(sourceNode: DiagramNodeTypes, canvasPosition: Position): void;

  /**
   * Opens menu on given {@link canvasPosition}. The menu contains possible alignments.
   * @param sourceNode is the node on which the user clicked the button.
   * @param canvasPosition is the canvas position where the menu will appear.
   */
  openAlignmentMenu(sourceNode: DiagramNodeTypes, canvasPosition: Position): void

  /**
   * Opens menu on given {@link canvasPosition}.
   * The menu represents control panel for group with given {@link groupIdentifier}.
   * @param groupIdentifier is the identifier of the group.
   * @param canvasPosition is the position where the menu will appear.
   */
  openGroupMenu(groupIdentifier: string, canvasPosition: Position): void;

  /**
   * Sets correct highlighting values in context. We have to call it through the diagram API,
   * because we have access to the rendering library (reactflow) only in diagram component.
   * @param nodeIdentifiers are the identifiers of the nodes to highlight.
   */
  highlightNodesInExplorationModeFromCatalog(
    nodeIdentifiers: string[],
    modelOfClassWhichStartedHighlighting: string
  ): void;
}

/**
 * Node related functionality of the diagram.
 */
interface DiagramNodes {

  /**
   * Called when user opens node's detail.
   */
  onShowNodeDetail: (diagramNode: Node) => void;

  /**
   * Called when user starts editing entity represented by the node.
   */
  onEditRepresentedByNode: (diagramNode: Node) => void;

  /**
   * Called when user chooses to edit the visual node.
   */
  onEditVisualNode: (diagramNode: Node) => void;

  /**
   * Called when user starts creating node's profile.
   */
  onCreateNodeProfile: (diagramNode: Node) => void;

  /**
   * Called when user wants to create new copy of the node on canvas.
   */
  onDuplicateNode: (diagramNode: DiagramNodeTypes) => void;

  /**
   * Adds all relationships related to the content of the diagram node
   */
  onAddAllRelationships: (visualModelDiagramNode: VisualModelDiagramNode) => void;

  /**
   * Called when user hides node, i. e. removes it from canvas.
   */
  onHideNode: (diagramNode: DiagramNodeTypes) => void;

  /**
   * Called when user deletes node.
   */
  onDeleteNode: (diagramNode: Node) => void;

  /**
   * Called when user chooses to create new class from diagram's canvas menu.
   */
  onCanvasOpenCreateClassDialog: (nodeIdentifier: string, canvasPosition: Position) => void;

  /**
   * Called when user chooses to create new class from diagram's canvas menu
   * with default association created afterwards.
   * @param isCreatedClassTarget if set to true, then the association points to the created class.
   *  If set to false the direction of the association is from the created class to the source class.
   */
  onCanvasOpenCreateClassDialogWithAssociation: (
    nodeIdentifier: string,
    canvasPosition: Position,
    isCreatedClassTarget: boolean
  ) => void;

  /**
   * Called when user choses to create new class from diagram's canvas menu
   * with generalization created afterwards.
   * @param isCreatedClassParent if set to true, then the the created class
   *  becomes parent of the source class. If set to false, it becomes child.
   */
  onCanvasOpenCreateClassDialogWithGeneralization: (
    nodeIdentifier: string,
    canvasPosition: Position,
    isCreatedClassParent: boolean
  ) => void;

  /**
   * Called when there is a change in node's positions in result
   * of user action. This method is not called when position is changed
   * using an API call.
   */
  onChangeNodesPositions: (changes: { [nodeIdentifier: string]: Position }) => void;

  /**
   * (Un)Anchors node with given identifier ({@link nodeIdentifier}).
   * If the given node is part of group, it is applied to the group.
   * @param nodeIdentifier is the identifier of the node to be (un)anchored.
   */
  onToggleAnchorForNode: (nodeIdentifier: string) => void;

  /**
   * Called when user starts creation of a new attribute for given node.
   */
  onCreateAttributeForNode: (diagramNode: Node) => void;

  /**
   * Called when user chooses to remove {@link attribute}.
   * @param attribute is the identifier the of the attribute to be removed
   * @param nodeIdentifier is the identifier of the node on which the attribute resides.
   */
  onRemoveAttributeFromNode: (attribute: string, nodeIdentifier: string) => void;

  /**
   * Called when user chooses to edit a node's concent.
   * @param identifier is the identifier the of the content to be edited
   */
  onEditEntityItem: (identifier: string) => void;

  /**
   * Called when user chooses to move given {@link attribute} move one position up.
   * @param nodeIdentifier is the identifier of the node on which the attribute resides.
   */
  onMoveAttributeUp: (attribute: string, nodeIdentifier: string) => void;

  /**
   * Called when user chooses to move given {@link attribute} move one position down.
   * @param nodeIdentifier is the identifier of the node on which the attribute resides.
   */
  onMoveAttributeDown: (attribute: string, nodeIdentifier: string) => void;
}

/**
 * Edge related functionality of the diagram.
 */
interface DiagramEdges {

  onShowEdgeDetail: (diagramEdge: Edge) => void;

  onEditEdge: (diagramEdge: Edge) => void;

  onCreateEdgeProfile: (diagramEdge: Edge) => void;

  onHideEdge: (diagramEdge: Edge) => void;

  onDeleteEdge: (diagramEdge: Edge) => void;

  /**
   * @param diagramEdge
   * @param index Index of waypoint to add waypoint after.
   * @param waypoint
   * @returns
   */
  onAddWaypoint: (diagramEdge: Edge, index: number, waypoint: Waypoint) => void;

  /**
   * This method is called when edge's waypoint is deleted.
   * @param diagramEdge is the edge containing deleted waypoint.
   * @param index is the index of the deleted waypoint
   */
  onDeleteWaypoint: (diagramEdge: Edge, index: number) => void;

  /**
   * This method is called when edges' waypoints change.
   * @param changes represent the changes. That is for each changed edge there is map of changed waypoints.
   */
  onChangeWaypointPositions: (changes: { [edgeIdentifier: string]: { [waypointIndex: number]: Waypoint } }) => void;

}

interface DiagramSelection {

  /**
   * This method is called when user changes the selection.
   * Callback is registered on both node and edge selection.
   * @param nodes are identifiers of the nodes representing the new node selection.
   * @param edges are identifiers of the edges representing the new edge selection.
   */
  onSelectionDidChange: (nodes: string[], edges: string[]) => void;

  /**
   * This method is called when user wants to see list of actions on selection.
   * @param source is the last selected node
   * @param canvasPosition is the position on canvas, where should be the list of actions shown.
   */
  onShowSelectionActionsMenu: (source: DiagramNodeTypes, canvasPosition: Position) => void;

  /**
   * This method is called when user wants to see list of possible alignment actions.
   * @param source is the last selected node
   * @param canvasPosition is the position on canvas, where should be the list of actions shown.
   */
  onOpenAlignmentMenu: (source: DiagramNodeTypes, canvasPosition: Position) => void;

  /**
   * This method is called when user wants to layout selection.
   */
  onLayoutSelection: () => void;

  /**
   * This method is called when user wants to create group selection.
   */
  onCreateGroup: () => void;

  /**
   * This method is called when user wants to dissolve (destroy) existing group.
   * The top level group for given {@link identifier} is destroyed.
   */
  onDissolveGroup: (identifier: string | null) => void;

  /**
   * This method is called when user wants to show the dialog for expansion of selection.
   */
  onShowExpandSelection: () => void;

  /**
   * This method is called when user wants to show the dialog to filter the selection.
   */
  onShowFilterSelection: () => void;

  //

  /**
   * This method is called when user wants to create new visual model containing selection.
   */
  onCreateNewViewFromSelection: () => void;

  /**
   * This method is called when user wants to profile elements in selection.
   */
  onProfileSelection: () => void;

  /**
   * This method is called when user wants to remove selection from visual model, i.e. hide.
   */
  onHideSelection: () => void;

  /**
   * This method is called when user wants to remove selection from both semantic and visual model.
   */
  onDeleteSelection: () => void;

  /**
   * This method is called when user wants to create new visual diagram node from selection.
   * That is the selection is put into new visual model and new node is created which represents the created model.
   */
  onCreateVisualModelDiagramNodeFromSelection: () => void;

}

interface VisualModelDiagramNodes {

  /**
   * This method is called when user wants to dissolve node which represents visual model.
   * That is the diagram node is removed and its content is put on canvas.
   * @param visualModelDiagramNode is the visual diagram node.
   */
  onDissolveVisualModelDiagramNode: (visualModelDiagramNode: VisualModelDiagramNode) => void;

  /**
   * Opens visual model which is linked to the visual diagram node.
   * @param visualModelDiagramNodeIdentifier is the identifier of the visual diagram node.
   */
  onMoveToVisualModelRepresentedByVisualModelDiagramNode: (visualModelDiagramNodeIdentifier: string) => void;

  /**
   * Called when user starts editing node, which represents visual model.
   * @param visualModelDiagramNode is the node which is being edited.
   */
  onEditVisualModelDiagramNode: (visualModelDiagramNode: VisualModelDiagramNode) => void;

  /**
   * Called when user wants to see info about node, which represents visual model.
   * @param visualModelDiagramNode is the node which info wants the to user view.
   */
  onShowInfoForVisualModelDiagramNode: (visualModelDiagramNode: VisualModelDiagramNode) => void;

  /**
   * Called when user hides node representing visual model, i.e. removes it from canvas.
   * @param visualModelDiagramNode is the diagram node to be removed from canvas.
   */
  onHideVisualModelDiagramNode: (visualModelDiagramNode: VisualModelDiagramNode) => void;

  /**
   * Aligns selected nodes horizontally, the actual alignment type is given by {@link alignmentHorizontalPosition}.
   */
  onAlignSelectionHorizontally: (alignmentHorizontalPosition: AlignmentHorizontalPosition) => void;

  /**
   * Aligns selected nodes vertically, the actual alignment type is given by {@link alignmentVerticalPosition}.
   */
  onAlignSelectionVertically: (alignmentVerticalPosition: AlignmentVerticalPosition) => void;
}

/**
 * Callbacks to owner to handle required user actions.
 */
export interface DiagramCallbacks extends DiagramNodes, VisualModelDiagramNodes, DiagramEdges, DiagramSelection {

  /**
   * This property stores the method, which is called when user creates connection inside diagram.
   */
  onCreateConnectionToNode: (source: DiagramNodeTypes, target: DiagramNodeTypes) => void;

  /**
   * This method is called when user creates "empty" connection, i.e. connection from node to canvas.
   * @param source is the node at which the connection started
   * @param canvasPosition is the position on canvas, where the connection ended.
   */
  onCreateConnectionToNothing: (source: DiagramNodeTypes, canvasPosition: Position) => void;

}
