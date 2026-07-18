import { deburr, kebabCase } from "es-toolkit";
import {
  validateGraphSyntax,
  type ApplicationGraph,
} from "@dataspecer/app-generator/graph";

export type ParseGraphResult = { graph: ApplicationGraph } | { error: string };

/**
 * Parses graph JSON from an import or the JSON panel. Only syntactically valid graphs are accepted. Structural and
 * semantic violations are allowed through, the problems panel reports them.
 */
export function parseGraph(text: string): ParseGraphResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (caught) {
    return { error: `Not valid JSON: ${caught instanceof Error ? caught.message : caught}` };
  }

  const syntax = validateGraphSyntax(data);
  if (!syntax.valid || !syntax.graph) {
    const first = syntax.violations[0];
    return {
      error:
        `Not a valid application graph ` +
        `(${syntax.violations.length} syntax violation(s), first: ${first.message})`,
    };
  }
  return { graph: syntax.graph };
}

function baseFileName(graph: ApplicationGraph): string {
  return kebabCase(deburr(graph.name)) || "application-graph";
}

/** Names the exported JSON file after the graph. */
export function exportFileName(graph: ApplicationGraph): string {
  return `${baseFileName(graph)}.json`;
}

/**
 * Names the downloaded application archive. Matches the name the backend derives, both sides
 * kebab case the deburred graph name, so reading it from the response is not needed.
 */
export function archiveFileName(graph: ApplicationGraph): string {
  return `${baseFileName(graph)}.zip`;
}
