import { BackendPackageService } from "@dataspecer/core-v2/project";
import { validateGraphSyntax, type ApplicationGraph } from "@dataspecer/app-generator/graph";

const backendUrl = import.meta.env.VITE_BACKEND as string;

export const packageService = new BackendPackageService(backendUrl, (...args) => fetch(...args));

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
