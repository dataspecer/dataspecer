import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import {
  EdgeType,
  isValidRedirectOperation,
  isValidTransitionOperation,
} from "@dataspecer/app-generator/graph";
import { nextEdgeId } from "../graph/mutations.ts";
import { useEditorStore } from "../store.ts";
import { useViolations } from "../hooks/use-violations.ts";
import { flaggedIds } from "../validation/violations.ts";
import { CanvasContextMenu, type ContextTarget } from "./canvas-context-menu.tsx";
import { CanvasToolbar } from "./canvas-toolbar.tsx";
import { ConnectionLine } from "./connection-line.tsx";
import { FloatingEdge } from "./floating-edge.tsx";
import { graphToFlow, type OperationFlowNode } from "./graph-to-flow.ts";
import { OperationNode } from "./operation-node.tsx";

const nodeTypes = { operation: OperationNode };
const edgeTypes = { floating: FloatingEdge };

export function Canvas() {
  const graph = useEditorStore((state) => state.graph);
  const positions = useEditorStore((state) => state.positions);
  const selection = useEditorStore((state) => state.selection);

  const [nodes, setNodes, onNodesChange] = useNodesState<OperationFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  // what the last right click hit, so the context menu knows which actions to offer
  const [contextTarget, setContextTarget] = useState<ContextTarget>(null);

  const violations = useViolations(graph);
  const flagged = useMemo(
    () => (graph === null ? { nodes: new Map(), edges: new Map() } : flaggedIds(graph, violations)),
    [graph, violations],
  );

  useEffect(() => {
    if (graph === null) {
      return;
    }
    const flow = graphToFlow(graph, positions, flagged, selection);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [graph, positions, selection, flagged, setNodes, setEdges]);

  const onNodeDragStop = useCallback((_event: unknown, node: Node) => {
    useEditorStore.getState().setNodePosition(node.id, node.position);
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const { graph: current, addEdge } = useEditorStore.getState();
    if (current === null || !connection.source || !connection.target) {
      return;
    }
    const source = current.nodes.find((node) => node.id === connection.source);
    const target = current.nodes.find((node) => node.id === connection.target);
    // prefer the edge type the operation pair allows, transition when both or neither fit
    const type =
      source &&
      target &&
      !isValidTransitionOperation(source.operation, target.operation) &&
      isValidRedirectOperation(source.operation, target.operation)
        ? EdgeType.Redirect
        : EdgeType.Transition;
    addEdge({
      id: nextEdgeId(current, connection.source, connection.target),
      source: connection.source,
      target: connection.target,
      type,
    });
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    const { removeNode } = useEditorStore.getState();
    deleted.forEach((node) => removeNode(node.id));
  }, []);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const { removeEdge } = useEditorStore.getState();
    deleted.forEach((edge) => removeEdge(edge.id));
  }, []);

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const { selection: current, setSelection } = useEditorStore.getState();
    const next = params.nodes[0]
      ? ({ kind: "node", id: params.nodes[0].id } as const)
      : params.edges[0]
        ? ({ kind: "edge", id: params.edges[0].id } as const)
        : null;
    if (next?.kind !== current?.kind || next?.id !== current?.id) {
      setSelection(next);
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
      fitView
      deleteKeyCode={["Backspace", "Delete"]}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onConnect={onConnect}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      onSelectionChange={onSelectionChange}
      onNodeContextMenu={(_event, node) => {
        setContextTarget({ kind: "node", id: node.id });
        useEditorStore.getState().setSelection({ kind: "node", id: node.id });
      }}
      onEdgeContextMenu={(_event, edge) => {
        setContextTarget({ kind: "edge", id: edge.id });
        useEditorStore.getState().setSelection({ kind: "edge", id: edge.id });
      }}
      onPaneContextMenu={() => setContextTarget(null)}
    >
      <Background />
      <Controls showInteractive={false} />
      <CanvasToolbar />
      <FocusHandler />
      </ReactFlow>
    </CanvasContextMenu>
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
    const edge = graph.edges.find((candidate) => candidate.id === focusRequest.id);
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
