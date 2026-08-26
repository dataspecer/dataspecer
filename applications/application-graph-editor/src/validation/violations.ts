import { differenceBy, partition } from "es-toolkit";
import {
  analyzeGraphSemantics,
  validateGraphStructure,
  validateGraphSyntax,
  ViolationSeverity,
  type ApplicationGraph,
  type ApplicationNode,
  type SpecificationMetadata,
  type Violation,
} from "@dataspecer/app-generator/graph";
import type { GraphElementRef } from "@/graph/graph-element-ref.ts";
import { connectionEdge } from "@/graph/mutations.ts";

/**
 * Every violation the editor can find on its own. Syntax comes first, because the later rules
 * need a well formed graph. Aggregate rules need the specification metadata and are skipped
 * while it is unavailable.
 */
function localViolations(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata | null,
): Violation[] {
  const syntax = validateGraphSyntax(graph);
  if (!syntax.valid || !syntax.graph) {
    return syntax.violations;
  }
  // an empty graph has not been created yet
  if (graph.nodes.length === 0) {
    return [];
  }
  if (metadata === null) {
    return validateGraphStructure(graph).violations;
  }
  // the semantic analysis runs the structural rules as part of its pass
  return analyzeGraphSemantics(graph, metadata).violations;
}

export function hasValidSyntax(graph: ApplicationGraph): boolean {
  return validateGraphSyntax(graph).valid;
}

function violationKey(violation: Violation): string {
  return JSON.stringify([
    violation.code,
    violation.sourceCode ?? null,
    violation.path ?? null,
    violation.message,
  ]);
}

/**
 * Every violation the editor can find, plus the ones the last generation attempt returned.
 */
export function combinedViolations(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata | null,
  fromGeneration: Violation[] | null,
): Violation[] {
  const local = localViolations(graph, metadata);
  if (fromGeneration === null) {
    return local;
  }
  return [...local, ...differenceBy(fromGeneration, local, violationKey)];
}

/**
 * The nodes an edge from the source is allowed to reach. Every candidate edge is validated in a copy of the graph, and
 * the target stays open when that adds no error the graph did not have already. An edge that only warns can still be
 * connected, because it works.
 */
export function connectableTargets(
  graph: ApplicationGraph,
  source: ApplicationNode,
  metadata: SpecificationMetadata | null,
): Set<string> {
  const before = localViolations(graph, metadata);
  const connectable = new Set<string>();
  for (const target of graph.nodes) {
    const candidate = connectionEdge(graph, source, target);
    // appended, so the existing edges keep the paths their violations point at
    const after = localViolations({ ...graph, edges: [...graph.edges, candidate] }, metadata);
    const added = differenceBy(after, before, violationKey);
    if (!added.some((violation) => violation.severity === ViolationSeverity.Error)) {
      connectable.add(target.id);
    }
  }
  return connectable;
}

/** Violations with the graph they were computed from, so paths resolve against the right one. */
export interface ValidationSnapshot {
  graph: ApplicationGraph;
  violations: Violation[];
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

/** Resolves a violation path such as "/nodes/3/config/..." to the node or edge it points at. */
export function violationTarget(graph: ApplicationGraph, violation: Violation): GraphElementRef {
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

/** The violations pointing at one node or edge, for its form. */
export function violationsFor(
  graph: ApplicationGraph,
  violations: Violation[],
  kind: "node" | "edge",
  id: string,
): Violation[] {
  return violations.filter((violation) => {
    const target = violationTarget(graph, violation);
    return target?.kind === kind && target.id === id;
  });
}

export type ViolationLevel = "error" | "warning";

export interface FlaggedIds {
  nodes: Map<string, ViolationLevel>;
  edges: Map<string, ViolationLevel>;
}

/**
 * Collects the node and edge IDs the violations point at, for canvas highlighting. An element
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
