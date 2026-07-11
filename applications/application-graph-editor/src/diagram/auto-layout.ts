import ELK from "elkjs/lib/elk.bundled.js";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import type { NodePositions } from "../store.ts";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 72;

const elk = new ELK();

/** Computes canvas positions for the whole graph with a layered layout. */
export async function autoLayout(graph: ApplicationGraph): Promise<NodePositions> {
  const result = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "90",
    },
    children: graph.nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  });

  const positions: NodePositions = {};
  for (const child of result.children ?? []) {
    positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
  }
  return positions;
}
