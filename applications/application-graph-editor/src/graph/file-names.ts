import { toAppName, type ApplicationGraph } from '@dataspecer/app-generator/graph';

/** Names the exported JSON file after the graph. */
export function exportFileName(graph: ApplicationGraph): string {
  return `${toAppName(graph.name)}.json`;
}

/**
 * Names the downloaded application archive.
 */
export function archiveFileName(graph: ApplicationGraph): string {
  return `${toAppName(graph.name)}.zip`;
}
