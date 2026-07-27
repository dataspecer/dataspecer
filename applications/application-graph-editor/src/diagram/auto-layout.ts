import ELK from "elkjs/lib/elk.bundled.js";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import type { NodePositions } from "../store.ts";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 72;

const elk = new ELK();

type LayoutDirection = "DOWN" | "RIGHT";

/**
 * A stress layout places nodes by how far apart they are in the graph, which keeps the edges of
 * a densely linked graph short and crossing rarely. A layered layout follows the direction of the
 * edges instead, which suits a graph read as a flow.
 */
export type LayoutOptions =
  | { algorithm: "stress" }
  | { algorithm: "layered"; direction: LayoutDirection };

const DEFAULT_LAYOUT: LayoutOptions = { algorithm: "stress" };

// Below roughly this length the stress layout starts placing nodes on top of each other, above it
// the drawing only grows.
const DESIRED_EDGE_LENGTH = 400;

/** Computes canvas positions for the whole graph. */
export async function autoLayout(
  graph: ApplicationGraph,
  options: LayoutOptions = DEFAULT_LAYOUT,
): Promise<NodePositions> {
  const result = await elk.layout({
    id: "root",
    layoutOptions:
      options.algorithm === "stress"
        ? {
            "elk.algorithm": "stress",
            "elk.stress.desiredEdgeLength": String(DESIRED_EDGE_LENGTH),
          }
        : {
            "elk.algorithm": "layered",
            "elk.direction": options.direction,
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
