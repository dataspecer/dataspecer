import { ViolationCode } from './validation/violation-codes.ts';
import type { Violation } from './validation/types.ts';
import { ViolationSeverity } from './validation/types.ts';
import type { ApplicationGraph } from './graph/types.ts';
import { validateGraphStructure } from './validation/validate-structure.ts';
import { validateGraphSyntax } from './validation/validate-syntax.ts';
import { DataspecerMetadataMappingError } from './metadata/dataspecer-specification-metadata-provider.ts';
import type { DataspecerMetadataProvider, SpecificationMetadata } from './metadata/types.ts';
import { analyzeGraphSemantics } from './validation/analyze-semantics.ts';

export interface ValidateApplicationGraphInput {
  graph: unknown;
  metadataProvider: DataspecerMetadataProvider;
}

export interface ValidateApplicationGraphResult {
  valid: boolean;
  violations: Violation[];
  /** The parsed graph, present once syntax validation passed. */
  graph?: ApplicationGraph;
  /** Metadata enriched with association kinds from the graph config, present when valid. */
  enrichedMetadata?: SpecificationMetadata;
}

/**
 * Runs the full validation pipeline: syntax, structural rules, metadata resolution, and semantic analysis.
 */
export async function validateApplicationGraph(
  input: ValidateApplicationGraphInput
): Promise<ValidateApplicationGraphResult> {
  const syntaxResult = validateGraphSyntax(input.graph);
  if (!syntaxResult.valid || !syntaxResult.graph) {
    return { valid: false, violations: syntaxResult.violations };
  }

  const graph: ApplicationGraph = syntaxResult.graph;
  // structural rules need no metadata, so graph mistakes are reported fast
  const structureResult = validateGraphStructure(graph);
  if (!structureResult.valid) {
    return { valid: false, violations: structureResult.violations, graph };
  }

  let metadata: SpecificationMetadata;
  try {
    metadata = await input.metadataProvider.getSpecificationMetadata(graph.dataSpecificationIri);
  } catch (error) {
    return { valid: false, violations: metadataResolutionViolations(error), graph };
  }

  const analysis = analyzeGraphSemantics(graph, metadata);
  if (!analysis.valid) {
    return { valid: false, violations: analysis.violations, graph };
  }

  return {
    valid: true,
    violations: [],
    graph,
    enrichedMetadata: analysis.enrichedMetadata,
  };
}

function metadataResolutionViolations(error: unknown): Violation[] {
  if (error instanceof DataspecerMetadataMappingError) {
    return error.issues.map((issue) => ({
      code: ViolationCode.MetadataResolutionFailed,
      message: issue.message,
      ...(issue.path ? { path: issue.path } : {}),
      severity: ViolationSeverity.Error,
    }));
  }

  return [
    {
      code: ViolationCode.MetadataResolutionFailed,
      message: `Unable to resolve Dataspecer specification metadata: ${
        error instanceof Error ? error.message : String(error)
      }`,
      severity: ViolationSeverity.Error,
    },
  ];
}
