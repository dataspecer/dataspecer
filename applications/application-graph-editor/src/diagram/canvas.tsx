import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from "@xyflow/react";
import { isEqual } from "es-toolkit";
import {
  EdgeType,
  isValidRedirectOperation,
  isValidTransitionOperation,
  type ApplicationNode,
} from "@dataspecer/app-generator/graph";
import { nextEdgeId } from "../graph/mutations.ts";
import { newNode, nodeBlockedReason } from "../graph/new-node.ts";
import { useEditorStore } from "../store.ts";
import { useValidation } from "../hooks/use-validation.ts";
import { flaggedIds } from "../validation/violations.ts";
import {
  CanvasContextMenu,
  type ContextTarget,
} from "./canvas-context-menu.tsx";
import { CanvasToolbar } from "./canvas-toolbar.tsx";
import { ConnectionLine } from "./connection-line.tsx";
import { FloatingEdge } from "./floating-edge.tsx";
import { projectEdges, projectNodes, type OperationFlowNode } from "./graph-to-flow.ts";
import { OperationNode } from "./operation-node.tsx";
import { OPERATION_FILL } from "./operation-style.ts";

const nodeTypes = { operation: OperationNode };
const edgeTypes = { floating: FloatingEdge };

export function Canvas() {
  const graph = useEditorStore((state) => state.graph);
  const positions = useEditorStore((state) => state.positions);
  const highlight = useEditorStore((state) => state.highlight);
  const selectRequest = useEditorStore((state) => state.selectRequest);
  const selectedNodes = useEditorStore((state) => state.selectedNodes);
  const selectedEdges = useEditorStore((state) => state.selectedEdges);
  const canvasTool = useEditorStore((state) => state.canvasTool);

  const [nodes, setNodes, onNodesChange] = useNodesState<OperationFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  // what the last right click hit, so the context menu knows which actions to offer
  const [contextTarget, setContextTarget] = useState<ContextTarget>(null);
  // the instance turns a drop point into canvas coordinates
  const flowRef = useRef<ReactFlowInstance<OperationFlowNode, Edge>>(undefined);

  const validation = useValidation();
  // flags are keyed by ID, so a snapshot from the previous keystroke still lines up
  const flagged = useMemo(
    () =>
      validation === null
        ? { nodes: new Map(), edges: new Map() }
        : flaggedIds(validation.graph, validation.violations),
    [validation],
  );

  useEffect(() => {
    if (graph === null) {
      return;
    }
    // the projection reads what React Flow currently holds, so unchanged nodes keep the objects
    // carrying their measured sizes
    const selected = { nodes: new Set(selectedNodes), edges: new Set(selectedEdges) };
    setNodes((current) => projectNodes(graph, positions, flagged, highlight, current));
    setEdges((current) => projectEdges(graph, flagged, highlight, selected, current));
  }, [graph, positions, highlight, flagged, selectedNodes, selectedEdges, setNodes, setEdges]);

  // a panel asking to select an element makes it the only selected one
  useEffect(() => {
    if (selectRequest === null) {
      return;
    }
    const { id } = selectRequest;
    setNodes((current) => withSelection(current, id));
    setEdges((current) => withSelection(current, id));
  }, [selectRequest, setNodes, setEdges]);

  // React Flow reports a move per node at the end of a drag and after a key press
  const onNodesChangeWithPositions = useCallback(
    (changes: NodeChange<OperationFlowNode>[]) => {
      onNodesChange(changes);
      const moves = changes.flatMap((change) =>
        change.type === "position" && change.dragging !== true && change.position
          ? [{ id: change.id, position: change.position }]
          : [],
      );
      if (moves.length > 0) {
        useEditorStore.getState().moveNodes(moves);
      }
    },
    [onNodesChange],
  );

  const onConnect = useCallback((connection: Connection) => {
    const { graph: current, addEdge } = useEditorStore.getState();
    if (current === null || !connection.source || !connection.target) {
      return;
    }
    const source = current.nodes.find((node) => node.id === connection.source);
    const target = current.nodes.find((node) => node.id === connection.target);
    addEdge({
      id: nextEdgeId(current, connection.source, connection.target),
      source: connection.source,
      target: connection.target,
      type: edgeTypeFor(source, target),
    });
  }, []);

  // dropping a connection on empty canvas creates the node it was reaching for
  const onConnectEnd = useCallback(
    (_event: unknown, connection: FinalConnectionState) => {
      const source = connection.fromNode?.id;
      if (connection.toNode !== null || !source || !connection.to) {
        return;
      }
      const {
        graph: current,
        metadata,
        addConnectedNode,
        setActionError,
      } = useEditorStore.getState();
      const flow = flowRef.current;
      if (current === null || flow === undefined) {
        return;
      }
      const blocked = nodeBlockedReason(metadata);
      if (blocked !== null) {
        setActionError(blocked);
        return;
      }
      const created = newNode(current, metadata);
      const sourceNode = current.nodes.find((node) => node.id === source);
      addConnectedNode(
        created,
        flow.screenToFlowPosition({ x: connection.to.x, y: connection.to.y }),
        {
          id: nextEdgeId(current, source, created.id),
          source,
          target: created.id,
          type: edgeTypeFor(sourceNode, created),
        },
      );
    },
    [],
  );

  const onNodesDelete = useCallback((deleted: Node[]) => {
    const { removeNode } = useEditorStore.getState();
    deleted.forEach((node) => removeNode(node.id));
  }, []);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const { removeEdge } = useEditorStore.getState();
    deleted.forEach((edge) => removeEdge(edge.id));
  }, []);

  // the sidebar shows one element, the first of whatever the canvas has selected
  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const store = useEditorStore.getState();
    const next = params.nodes[0]
      ? ({ kind: "node", id: params.nodes[0].id } as const)
      : params.edges[0]
        ? ({ kind: "edge", id: params.edges[0].id } as const)
        : null;
    if (next?.kind !== store.selection?.kind || next?.id !== store.selection?.id) {
      store.setSelection(next);
    }
    const nodeIds = params.nodes.map((node) => node.id);
    const edgeIds = params.edges.map((edge) => edge.id);
    if (!isEqual(nodeIds, store.selectedNodes) || !isEqual(edgeIds, store.selectedEdges)) {
      store.setSelectedElements(nodeIds, edgeIds);
    }
  }, []);

  return (
    <CanvasContextMenu target={contextTarget}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={ConnectionLine}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={36}
        selectionOnDrag={canvasTool === "select"}
        panOnDrag={canvasTool === "pan" ? true : [1]}
        fitView
        // the default lower bound of 0.5 cannot fit a spread out graph into the pane
        minZoom={0.2}
        deleteKeyCode={["Backspace", "Delete"]}
        onNodesChange={onNodesChangeWithPositions}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onInit={(instance) => (flowRef.current = instance)}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        onNodeContextMenu={(_event, node) => {
          setContextTarget({ kind: "node", id: node.id });
          setNodes((current) => withSelection(current, node.id));
          setEdges((current) => withSelection(current, node.id));
        }}
        onEdgeContextMenu={(_event, edge) => {
          setContextTarget({ kind: "edge", id: edge.id });
          setNodes((current) => withSelection(current, edge.id));
          setEdges((current) => withSelection(current, edge.id));
        }}
        onPaneContextMenu={() => setContextTarget(null)}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeColor={minimapNodeColor} className="!bottom-2 !right-2" />
        <CanvasToolbar />
        <FocusHandler />
      </ReactFlow>
    </CanvasContextMenu>
  );
}

/** Marks one element as the only selected one, leaving the objects of the others alone. */
function withSelection<Element extends { id: string; selected?: boolean }>(
  elements: Element[],
  id: string,
): Element[] {
  return elements.map((element) =>
    Boolean(element.selected) === (element.id === id)
      ? element
      : { ...element, selected: element.id === id },
  );
}

/** Brings the node or edge of the latest focus request into view. */
function FocusHandler() {
  const focusRequest = useEditorStore((state) => state.focusRequest);
  const reactFlow = useReactFlow();

  useEffect(() => {
    if (focusRequest === null) {
      return;
    }
    const { graph } = useEditorStore.getState();
    if (graph === null) {
      return;
    }
    // an edge is brought into view through its two endpoints
    const edge = graph.edges.find(
      (candidate) => candidate.id === focusRequest.id,
    );
    const nodeIds = edge ? [edge.source, edge.target] : [focusRequest.id];
    void reactFlow.fitView({
      nodes: nodeIds.map((id) => ({ id })),
      duration: 300,
      maxZoom: 1.2,
      padding: 0.4,
    });
  }, [focusRequest, reactFlow]);

  return null;
}

/** Prefers the edge type the operation pair allows, transition when both or neither fit. */
function edgeTypeFor(
  source: ApplicationNode | undefined,
  target: ApplicationNode | undefined,
): EdgeType {
  if (
    source &&
    target &&
    !isValidTransitionOperation(source.operation, target.operation) &&
    isValidRedirectOperation(source.operation, target.operation)
  ) {
    return EdgeType.Redirect;
  }
  return EdgeType.Transition;
}

/** Operation colors for the minimap, so the shape of the graph stays recognizable. */
function minimapNodeColor(node: OperationFlowNode): string {
  return OPERATION_FILL[node.data.node.operation];
}
