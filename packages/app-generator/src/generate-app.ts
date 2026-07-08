import { ViolationCode } from './validation/violation-codes.ts';
import type { Violation } from './validation/types.ts';
import { ViolationSeverity } from './validation/types.ts';
import { buildGenerationModel } from './generation-model/build-generation-model.ts';
import type { GenerationModel } from './generation-model/types.ts';
import type { ApplicationGraph } from './graph/types.ts';
import { validateGraphSyntax } from './validation/validate-syntax.ts';
import { DataspecerMetadataMappingError } from './metadata/dataspecer-specification-metadata-provider.ts';
import type { DataspecerMetadataProvider, SpecificationMetadata } from './metadata/types.ts';
import { writeFileTree } from './rendering/write-file-tree.ts';
import type { FileTreeContent } from './rendering/file-tree.ts';
import { renderGeneratedApp } from './rendering/render-generated-app.ts';
import { analyzeGraphSemantics } from './validation/analyze-semantics.ts';

export interface GenerateAppInput {
  graph: unknown;
  metadataProvider: DataspecerMetadataProvider;
  outputDirectory?: string;
  allowOverwrite?: boolean;
}

export interface GenerateAppResult {
  success: boolean;
  violations: Violation[];
  files: FileTreeContent;
  writtenFiles: string[];
  generationModel?: GenerationModel;
}

export async function generateApp(input: GenerateAppInput): Promise<GenerateAppResult> {
  const syntaxResult = validateGraphSyntax(input.graph);
  if (!syntaxResult.valid || !syntaxResult.graph) {
    return failure(syntaxResult.violations);
  }

  const graph: ApplicationGraph = syntaxResult.graph;
  let metadata: SpecificationMetadata;
  try {
    metadata = await input.metadataProvider.getSpecificationMetadata(graph.dataSpecificationIri);
  } catch (error) {
    return failure(metadataResolutionViolations(error));
  }

  const analysis = analyzeGraphSemantics(graph, metadata);
  if (!analysis.valid) {
    return failure(analysis.violations);
  }

  const generationModel = buildGenerationModel(graph, analysis.enrichedMetadata);
  const fileTree = renderGeneratedApp(generationModel);
  const files = fileTree.toObject();
  const writtenFiles: string[] = [];

  if (input.outputDirectory) {
    try {
      const writeResult = await writeFileTree(fileTree, {
        outputDirectory: input.outputDirectory,
        allowOverwrite: input.allowOverwrite,
      });
      writtenFiles.push(...writeResult.writtenFiles);
    } catch (error) {
      return {
        success: false,
        violations: [
          {
            code: ViolationCode.GenerateWriteFailed,
            message: error instanceof Error ? error.message : String(error),
            severity: ViolationSeverity.Error,
          },
        ],
        files,
        writtenFiles: [],
        generationModel,
      };
    }
  }

  return {
    success: true,
    violations: [],
    files,
    writtenFiles,
    generationModel,
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

function failure(violations: Violation[]): GenerateAppResult {
  return {
    success: false,
    violations: violations,
    files: {},
    writtenFiles: [],
  };
}
