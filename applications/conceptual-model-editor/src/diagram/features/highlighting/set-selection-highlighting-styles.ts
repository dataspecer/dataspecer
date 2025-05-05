import { Edge, ReactFlowInstance, getConnectedEdges } from "@xyflow/react";
import { NodeType, selectMarkerEnd } from "../../diagram-controller";
import { ReactPrevSetStateType } from "../../utilities";

export const setHighlightingStylesBasedOnSelection = (
  reactflowInstance: ReactFlowInstance<any, any>,
  selectedNodes: string[],
  selectedEdges: string[],
  setNodes: ReactPrevSetStateType<NodeType[]>,
  setEdges: ReactPrevSetStateType<Edge<any>[]>,
) => {
  const highlightColor = highlightColorMap[0];
  const nextToHighlightedElementColor = highlightColorMap[1];

  setEdges(prevEdges => {
    const changedNodesBasedOnEdgeSelection: string[] = [];
    const changedCopiesOfPreviousEdges: Record<string, Edge<any>> = {};
    // Reset edges style
    prevEdges.forEach(edge => {
      storeEdgeCopyToGivenMap(edge, null, changedCopiesOfPreviousEdges);
    });
    // Set style of edges going from selected nodes
    selectedNodes.forEach(nodeIdentifier => {
      const reactflowNode = reactflowInstance.getNode(nodeIdentifier);
      // Something is wrong, we are most-likely working with old, no longer valid values of selected nodes.
      if(reactflowNode === undefined) {
        return prevEdges;
      }
      const connectedEdges = getConnectedEdges([reactflowNode], prevEdges);
      connectedEdges.forEach(edge => {
        storeEdgeCopyToGivenMap(edge, nextToHighlightedElementColor, changedCopiesOfPreviousEdges);
      });
    });
    // Set style of selected edges
    selectedEdges.forEach(selectedEdgeId => {
      const edge = prevEdges.find(prevEdge => prevEdge.id === selectedEdgeId);
      if(edge === undefined) {
        return;
      }

      storeEdgeCopyToGivenMap(edge, highlightColor, changedCopiesOfPreviousEdges);
      changedNodesBasedOnEdgeSelection.push(edge.source);
      changedNodesBasedOnEdgeSelection.push(edge.target);
    });
    // Set style of nodes
    // We unfortunately have to use the style property, because for some reason
    // the classname property takes effect only after something happens (for example user moves the viewport)
    // This fact actually also takes effect in the exploration highlighting mode - When user selects new class
    // using ctrl-selection then when the user doesn't do anything else, the node is not highlighting
    // (after sure for example moves the viewport, it is highlighted again)
    setNodes(prevNodes => prevNodes.map(node => {
      const isChangedBasedOnSelectedEdge = changedNodesBasedOnEdgeSelection.find(nodeId => nodeId === node.id) !== undefined;
      const isHighlighted = selectedNodes.find(id => node.id === id) !== undefined;

      let newOutline: string | undefined = undefined;
      if(isHighlighted) {
        newOutline = `0.25em solid ${highlightColor}`;
      }
      else if(isChangedBasedOnSelectedEdge) {
        newOutline = `0.25em solid ${nextToHighlightedElementColor}`;
      }
      // Else undefined

      if(newOutline === node.style?.outline) {
        return node;
      }
      return {
        ...node,
        style: {
          ...node.style,
          outline: newOutline,
        },
      };
    }));

    return prevEdges.map(edge => {
      return changedCopiesOfPreviousEdges[edge.id].style?.stroke === edge.style?.stroke ? edge : changedCopiesOfPreviousEdges[edge.id];
    });
  });
};

export type HighlightLevel = 0 | 1 | "no-highlight" | "highlight-opposite";

export const highlightColorMap: Record<HighlightLevel, string> = {
  "no-highlight": "rgba(0, 0, 0, 0)",
  "highlight-opposite": "rgba(0, 0, 0, 0)",
  0: "rgba(238, 58, 115, 1)",
  1: "rgba(0, 0, 0, 1)",
};

function storeEdgeCopyToGivenMap(
  edge: Edge<any>, newEdgeColor: string | null,
  changedCopiesOfPreviousEdges: Record<string, Edge<any>>
): void {
  if(newEdgeColor === null) {
    newEdgeColor = edge?.data?.color;
  }

  const changedEdge = changedCopiesOfPreviousEdges[edge.id] ?? ({ ...edge });
  changedEdge.style = { ...changedEdge.style, stroke: newEdgeColor ?? undefined };
  changedEdge.markerEnd = selectMarkerEnd(changedEdge.data, newEdgeColor);
  changedCopiesOfPreviousEdges[changedEdge.id] = changedEdge;
}
