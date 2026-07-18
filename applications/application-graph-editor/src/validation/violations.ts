import {
  validateGraphStructure,
  validateGraphSyntax,
  type ApplicationGraph,
  type Violation,
} from "@dataspecer/app-generator/graph";

// keyed by graph identity, so every consumer of the same snapshot shares one validation run
const liveCache = new WeakMap<ApplicationGraph, Violation[]>();

/**
 * Client-side violations of the given graph: syntax first and structural rules. Semantic violations need specification
 * metadata and come from the backend validate endpoint instead.
 */
export function liveViolations(graph: ApplicationGraph): Violation[] {
  const cached = liveCache.get(graph);
  if (cached) {
    return cached;
  }
  const syntax = validateGraphSyntax(graph);
  const violations = syntax.valid ? validateGraphStructure(graph).violations : syntax.violations;
  liveCache.set(graph, violations);
  return violations;
}

export type ViolationTarget = { kind: "node" | "edge"; id: string } | null;

/** Resolves a violation path such as "/nodes/3/config/..." to the node or edge it points at. */
export function violationTarget(graph: ApplicationGraph, violation: Violation): ViolationTarget {
  const match = violation.path?.match(/^\/(nodes|edges)\/(\d+)/);
  if (!match) {
    return null;
  }
  const index = Number(match[2]);
  if (match[1] === "nodes") {
    const node = graph.nodes[index];
    return node ? { kind: "node", id: node.id } : null;
  }
  const edge = graph.edges[index];
  return edge ? { kind: "edge", id: edge.id } : null;
}

export interface InvalidIds {
  nodes: Set<string>;
  edges: Set<string>;
}

/** Collects the node and edge ids the violations point at (for canvas highlighting). */
export function invalidIds(graph: ApplicationGraph, violations: Violation[]): InvalidIds {
  const result: InvalidIds = { nodes: new Set(), edges: new Set() };
  for (const violation of violations) {
    const target = violationTarget(graph, violation);
    if (target?.kind === "node") {
      result.nodes.add(target.id);
    } else if (target?.kind === "edge") {
      result.edges.add(target.id);
    }
  }
  return result;
}
