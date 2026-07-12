import { BackendPackageService } from "@dataspecer/core-v2/project";
import {
  validateGraphSyntax,
  type ApplicationGraph,
  type SpecificationMetadata,
} from "@dataspecer/app-generator/graph";
import type { NodePositions } from "../store.ts";

const backendUrl = import.meta.env.VITE_BACKEND as string;

async function checkedFetch(...args: Parameters<typeof fetch>): Promise<Response> {
  const response = await fetch(...args);
  // 404 is handled by the app itself
  if (!response.ok && response.status !== 404) {
    throw new Error(`Backend request failed with status ${response.status}.`);
  }
  return response;
}

export const packageService = new BackendPackageService(backendUrl, checkedFetch);

// Node positions live in a second blob next to the graph.
const POSITIONS_BLOB = "visual";

export async function loadGraph(iri: string): Promise<ApplicationGraph> {
  const data = await packageService.getResourceJsonData(iri);
  if (data === null) {
    throw new Error(`No application graph found for resource "${iri}".`);
  }

  const syntax = validateGraphSyntax(data);
  if (!syntax.valid) {
    const first = syntax.violations[0];
    throw new Error(
      `The stored JSON is not a valid application graph ` +
        `(${syntax.violations.length} syntax violation(s), first: ${first.message})`,
    );
  }
  return data as ApplicationGraph;
}

export async function loadPositions(iri: string): Promise<NodePositions | null> {
  const data = await packageService.getResourceJsonData(iri, POSITIONS_BLOB);
  return data as NodePositions | null;
}

export async function saveGraph(
  iri: string,
  graph: ApplicationGraph,
  positions: NodePositions,
): Promise<void> {
  await packageService.setResourceJsonData(iri, graph);
  await packageService.setResourceJsonData(iri, positions, POSITIONS_BLOB);
}

export async function loadMetadata(dataSpecificationIri: string): Promise<SpecificationMetadata> {
  const response = await checkedFetch(
    `${backendUrl}/app-generator/metadata?iri=${encodeURIComponent(dataSpecificationIri)}`,
  );
  if (!response.ok) {
    throw new Error(`Metadata request failed with status ${response.status}.`);
  }
  return (await response.json()) as SpecificationMetadata;
}
