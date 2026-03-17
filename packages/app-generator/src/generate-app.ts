import { ViolationCode } from './validation/violation-codes.ts';
import type { Violation } from './validation/types.ts';
import { ViolationSeverity } from './validation/types.ts';
import { buildGenerationModel } from './generation-model/build-generation-model.ts';
import type { GenerationModel } from './generation-model/types.ts';
import type { ApplicationGraph } from './graph/types.ts';
import { validateGraphSyntax } from './graph/validate-syntax.ts';
import type { DataspecerMetadataProvider } from './metadata/dataspecer-metadata-provider.ts';
import { writeFileTree } from './rendering/write-file-tree.ts';
import type { FileTreeContent } from './rendering/file-tree.ts';
import { renderGeneratedApp } from './rendering/render-generated-app.ts';
import { validateGraphSemantics } from './validation/validate-semantics.ts';

export interface GeneratePrototypeAppInput {
  graph: unknown;
  metadataProvider: DataspecerMetadataProvider;
  outputDirectory?: string;
  allowOverwrite?: boolean;
}

export interface GeneratePrototypeAppResult {
  success: boolean;
  violations: Violation[];
  files: FileTreeContent;
  writtenFiles: string[];
  generationModel?: GenerationModel;
}

export async function generateApp(
  input: GeneratePrototypeAppInput
): Promise<GeneratePrototypeAppResult> {
  const syntaxResult = validateGraphSyntax(input.graph);
  if (!syntaxResult.valid || !syntaxResult.graph) {
    return failure(syntaxResult.violations);
  }

  const graph: ApplicationGraph = syntaxResult.graph;
  const semanticResult = await validateGraphSemantics(graph, input.metadataProvider);
  if (!semanticResult.valid) {
    return failure(semanticResult.violations);
  }

  const metadata = await input.metadataProvider.getSpecificationMetadata(
    graph.dataSpecificationIri
  );
  const generationModel = buildGenerationModel(graph, metadata);
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

function failure(violations: Violation[]): GeneratePrototypeAppResult {
  return {
    success: false,
    violations: violations,
    files: {},
    writtenFiles: [],
  };
}
