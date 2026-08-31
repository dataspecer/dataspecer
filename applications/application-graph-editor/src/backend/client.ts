import { BackendPackageService } from '@dataspecer/core-v2/project';
import type {
  ApplicationGraph,
  SpecificationMetadata,
  Violation,
} from '@dataspecer/app-generator/graph';
import { checkGraph } from '@/graph/parse-graph.ts';
import type { NodePositions } from '@/store.ts';

const backendUrl = import.meta.env.VITE_BACKEND as string;

async function checkedFetch(...args: Parameters<typeof fetch>): Promise<Response> {
  const response = await fetch(...args);
  // 404 is handled by the app itself
  if (!response.ok && response.status !== 404) {
    throw new Error(`Backend request failed with status ${response.status}.`);
  }
  return response;
}

const packageService = new BackendPackageService(backendUrl, checkedFetch);

// Node positions live in a second blob next to the graph.
const POSITIONS_BLOB = 'visual';

export type LoadGraphResult =
  | { kind: 'valid'; graph: ApplicationGraph }
  | { kind: 'invalid'; invalidValue: unknown };

export async function loadGraph(iri: string): Promise<LoadGraphResult> {
  const data = await packageService.getResourceJsonData(iri);
  if (data === null) {
    throw new Error(`No application graph found for resource "${iri}".`);
  }

  const checked = checkGraph(data);
  return checked.ok
    ? { kind: 'valid', graph: checked.graph }
    : { kind: 'invalid', invalidValue: data };
}

export async function loadPositions(iri: string): Promise<NodePositions | null> {
  const data = await packageService.getResourceJsonData(iri, POSITIONS_BLOB);
  return data as NodePositions | null;
}

export async function saveGraphAndPositions(
  iri: string,
  graph: ApplicationGraph,
  positions: NodePositions,
): Promise<void> {
  await packageService.setResourceJsonData(iri, graph);
  await packageService.setResourceJsonData(iri, positions, POSITIONS_BLOB);
}

export type GenerateResult = { ok: true; archive: Blob } | { ok: false; violations: Violation[] };

export async function generateApplication(graph: ApplicationGraph): Promise<GenerateResult> {
  const response = await fetch(`${backendUrl}/app-generator/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  });
  if (response.status === 400) {
    const body = (await response.json().catch(() => null)) as { violations?: Violation[] } | null;
    const violations = body?.violations;
    if (Array.isArray(violations)) {
      return { ok: false, violations };
    }
  }
  if (!response.ok) {
    throw new Error(`Generation failed with status ${response.status}.`);
  }
  return { ok: true, archive: await response.blob() };
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
