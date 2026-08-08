import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStoreApi,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
  type NodeChange,
  type OnConnectStartParams,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { isEqual } from "es-toolkit";
import { connectionEdge } from "../graph/mutations.ts";
import type { GraphElementRef } from "../graph/graph-element-ref.ts";
import { newNode, nodeBlockedReason } from "../graph/new-node.ts";
import { useEditorStore } from "../store.ts";
import { useValidation } from "../hooks/use-validation.ts";
import { connectableTargets, flaggedIds } from "../validation/violations.ts";
import { CanvasContextMenu } from "./canvas-context-menu.tsx";
import { CanvasToolbar } from "./canvas-toolbar.tsx";
import { ConnectionLine } from "./connection-line.tsx";
import { FloatingEdge } from "./floating-edge.tsx";
import { projectEdges, projectNodes, type OperationFlowNode } from "./graph-to-flow.ts";
import { OperationNode } from "./operation-node.tsx";
import { OPERATION_FILL } from "./operation-style.ts";
import { centeredOn, paneToGraph } from "./pane-position.ts";

const NOTHING_DIMMED: ReadonlySet<string> = new Set();

const nodeTypes = { operation: OperationNode };
const edgeTypes = { floating: FloatingEdge };

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasFlow />
    </ReactFlowProvider>
  );
}

function CanvasFlow() {
  const graph = useEditorStore((state) => state.graph);
  const focusRequest = useEditorStore((state) => state.focusRequest);
  const fitRequest = useEditorStore((state) => state.fitRequest);
  const positions = useEditorStore((state) => state.positions);
  const highlight = useEditorStore((state) => state.highlight);
  const selectRequest = useEditorStore((state) => state.selectRequest);
  const selectedNodes = useEditorStore((state) => state.selectedNodes);
  const selectedEdges = useEditorStore((state) => state.selectedEdges);
  const canvasTool = useEditorStore((state) => state.canvasTool);

  const [nodes, setNodes, onNodesChange] = useNodesState<OperationFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  // what the last right click hit, so the context menu knows which actions to offer
  const [contextTarget, setContextTarget] = useState<GraphElementRef>(null);
  const flow = useReactFlow();
  const flowStore = useStoreApi();
  // nodes the current edge drag cannot connect to, empty while nothing is being dragged
  const [dimmed, setDimmed] = useState<ReadonlySet<string>>(NOTHING_DIMMED);
  const canceled = useRef(false);

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
    // pass in what React Flow holds now, so an unchanged node keeps its object and the size
    // measured on it
    const selected = { nodes: new Set(selectedNodes), edges: new Set(selectedEdges) };
    setNodes((current) => projectNodes(graph, positions, flagged, highlight, dimmed, current));
    setEdges((current) => projectEdges(graph, flagged, highlight, selected, current));
  }, [graph, positions, highlight, flagged, dimmed, selectedNodes, selectedEdges, setNodes, setEdges]);

  // when a panel asks to select an element, it becomes the only selected one
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

  // dim the nodes this drag is not allowed to reach
  const onConnectStart = useCallback((_event: unknown, params: OnConnectStartParams) => {
    canceled.current = false;
    const { graph: current, metadata } = useEditorStore.getState();
    const source = current?.nodes.find((node) => node.id === params.nodeId);
    if (current === null || source === undefined) {
      return;
    }
    const connectable = connectableTargets(current, source, metadata);
    setDimmed(new Set(current.nodes.map((node) => node.id).filter((id) => !connectable.has(id))));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const { graph: current, addEdge } = useEditorStore.getState();
    if (canceled.current || current === null) {
      return;
    }
    const source = current.nodes.find((node) => node.id === connection.source);
    const target = current.nodes.find((node) => node.id === connection.target);
    if (source === undefined || target === undefined) {
      return;
    }
    addEdge(connectionEdge(current, source, target));
  }, []);

  // a connection dropped on empty canvas becomes a new node with the edge to it
  const onConnectEnd = useCallback(
    (_event: unknown, connection: FinalConnectionState) => {
      setDimmed(NOTHING_DIMMED);
      // clear the flag here, otherwise the next connection would be dropped as well
      const escaped = canceled.current;
      canceled.current = false;
      const source = connection.fromNode?.id;
      if (escaped || connection.toNode !== null || !source || !connection.to) {
        return;
      }
      const {
        graph: current,
        metadata,
        addConnectedNode,
        setActionError,
      } = useEditorStore.getState();
      if (current === null) {
        return;
      }
      const blocked = nodeBlockedReason(metadata);
      if (blocked !== null) {
        setActionError(blocked);
        return;
      }
      const sourceNode = current.nodes.find((node) => node.id === source);
      if (sourceNode === undefined) {
        return;
      }
      const created = newNode(current, metadata);
      addConnectedNode(
        created,
        centeredOn(paneToGraph(flow.getViewport(), connection.to)),
        connectionEdge(current, sourceNode, created),
      );
    },
    [flow],
  );

  const onNodesDelete = useCallback((deleted: Node[]) => {
    const { removeNode } = useEditorStore.getState();
    deleted.forEach((node) => removeNode(node.id));
  }, []);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const { removeEdge } = useEditorStore.getState();
    deleted.forEach((edge) => removeEdge(edge.id));
  }, []);

  useEffect(() => {
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !flowStore.getState().connection.inProgress) {
        return;
      }
      flowStore.getState().cancelConnection();
      canceled.current = true;
      setDimmed(NOTHING_DIMMED);
    };
    document.addEventListener("keydown", cancelOnEscape);
    return () => document.removeEventListener("keydown", cancelOnEscape);
  }, [flowStore]);

  useEffect(() => {
    if (fitRequest === 0) {
      return;
    }
    // fit after two frames, so the freshly projected nodes are rendered and measured first
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void flow.fitView({ duration: 300, padding: 0.15, maxZoom: 1 });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [fitRequest, flow]);

  // the latest focus request brings its element into view
  useEffect(() => {
    const { graph: current } = useEditorStore.getState();
    if (focusRequest === null || current === null) {
      return;
    }
    const edge = current.edges.find((candidate) => candidate.id === focusRequest.id);
    const wanted = edge ? [edge.source, edge.target] : [focusRequest.id];
    const nodeIds = wanted.filter((id) => flow.getNode(id) !== undefined);
    if (nodeIds.length === 0) {
      return;
    }
    void flow.fitView({
      nodes: nodeIds.map((id) => ({ id })),
      duration: 300,
      maxZoom: 1.2,
      padding: 0.4,
    });
  }, [focusRequest, flow]);

  // the sidebar shows a single element, so it takes the first one the canvas has selected
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
    <CanvasContextMenu target={contextTarget} onClose={() => setContextTarget(null)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={ConnectionLine}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={36}
        connectOnClick={false}
        selectionOnDrag={canvasTool === "select"}
        panOnDrag={canvasTool === "pan" ? true : [1]}
        fitView
        // the default lower bound of 0.5 cannot fit a spread out graph into the pane
        minZoom={0.2}
        deleteKeyCode={["Backspace", "Delete"]}
        onNodesChange={onNodesChangeWithPositions}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
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

/** Operation colors for the minimap, so the shape of the graph stays recognizable. */
function minimapNodeColor(node: OperationFlowNode): string {
  return OPERATION_FILL[node.data.node.operation];
}
