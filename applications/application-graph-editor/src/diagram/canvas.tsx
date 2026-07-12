import { useCallback, useEffect } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { EdgeType } from "@dataspecer/app-generator/graph";
import { nextEdgeId } from "../graph/mutations.ts";
import { useEditorStore } from "../store.ts";
import { graphToFlow, type OperationFlowNode } from "./graph-to-flow.ts";
import { OperationNode } from "./operation-node.tsx";

const nodeTypes = { operation: OperationNode };

export function Canvas() {
  const graph = useEditorStore((state) => state.graph);
  const positions = useEditorStore((state) => state.positions);
  const selection = useEditorStore((state) => state.selection);

  const [nodes, setNodes, onNodesChange] = useNodesState<OperationFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (graph === null) {
      return;
    }
    const flow = graphToFlow(graph, positions);
    setNodes(
      flow.nodes.map((node) => ({
        ...node,
        selected: selection?.kind === "node" && selection.id === node.id,
      })),
    );
    setEdges(
      flow.edges.map((edge) => ({
        ...edge,
        selected: selection?.kind === "edge" && selection.id === edge.id,
      })),
    );
  }, [graph, positions, selection, setNodes, setEdges]);

  const onNodeDragStop = useCallback((_event: unknown, node: Node) => {
    useEditorStore.getState().setNodePosition(node.id, node.position);
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const { graph: current, addEdge } = useEditorStore.getState();
    if (current === null || !connection.source || !connection.target) {
      return;
    }
    addEdge({
      id: nextEdgeId(current, connection.source, connection.target),
      source: connection.source,
      target: connection.target,
      type: EdgeType.Transition,
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
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      deleteKeyCode={["Backspace", "Delete"]}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onConnect={onConnect}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      onSelectionChange={onSelectionChange}
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
