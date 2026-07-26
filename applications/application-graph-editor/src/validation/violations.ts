import { differenceBy, partition } from "es-toolkit";
import {
  validateGraphStructure,
  validateGraphSyntax,
  ViolationSeverity,
  type ApplicationGraph,
  type Violation,
} from "@dataspecer/app-generator/graph";

/**
 * Client-side violations of the given graph: syntax first and structural rules. Semantic violations need specification
 * metadata and come from the backend validate endpoint instead.
 */
export function liveViolations(graph: ApplicationGraph): Violation[] {
  const syntax = validateGraphSyntax(graph);
  return syntax.valid ? validateGraphStructure(graph).violations : syntax.violations;
}

function violationKey(violation: Violation): string {
  return `${violation.code}|${violation.path ?? ""}|${violation.message}`;
}

/**
 * Live violations plus the backend's semantic results. The backend runs the same syntax and structural rules, so its
 * copies of the violations already shown live are dropped.
 */
export function combinedViolations(
  graph: ApplicationGraph,
  semanticValidation: { violations: Violation[]; forGraph: ApplicationGraph } | null,
): Violation[] {
  const live = liveViolations(graph);
  const semantic =
    semanticValidation !== null && semanticValidation.forGraph === graph
      ? differenceBy(semanticValidation.violations, live, violationKey)
      : [];
  return [...live, ...semantic];
}

export interface ViolationsBySeverity {
  errors: Violation[];
  warnings: Violation[];
}

export function bySeverity(violations: Violation[]): ViolationsBySeverity {
  const [errors, warnings] = partition(
    violations,
    (violation) => violation.severity === ViolationSeverity.Error,
  );
  return { errors, warnings };
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

export type ViolationLevel = "error" | "warning";

export interface FlaggedIds {
  nodes: Map<string, ViolationLevel>;
  edges: Map<string, ViolationLevel>;
}

/**
 * Collects the node and edge ids the violations point at, for canvas highlighting. An element
 * with both an error and a warning is flagged as an error.
 */
export function flaggedIds(graph: ApplicationGraph, violations: Violation[]): FlaggedIds {
  const result: FlaggedIds = { nodes: new Map(), edges: new Map() };
  for (const violation of violations) {
    const target = violationTarget(graph, violation);
    if (target === null) {
      continue;
    }
    const into = target.kind === "node" ? result.nodes : result.edges;
    const level = violation.severity === ViolationSeverity.Error ? "error" : "warning";
    if (level === "error" || !into.has(target.id)) {
      into.set(target.id, level);
    }
  }
  return result;
}
