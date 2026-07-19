import { deburr, kebabCase } from "es-toolkit";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";

function baseFileName(graph: ApplicationGraph): string {
  return kebabCase(deburr(graph.name)) || "application-graph";
}

/** Names the exported JSON file after the graph. */
export function exportFileName(graph: ApplicationGraph): string {
  return `${baseFileName(graph)}.json`;
}

/**
 * Names the downloaded application archive.
 */
export function archiveFileName(graph: ApplicationGraph): string {
  return `${baseFileName(graph)}.zip`;
}
