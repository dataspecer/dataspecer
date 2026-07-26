import { ViolationCode } from './validation/violation-codes.ts';
import type { Violation } from './validation/types.ts';
import { ViolationSeverity } from './validation/types.ts';
import { buildGenerationModel } from './generation-model/build-generation-model.ts';
import type { GenerationModel } from './generation-model/types.ts';
import type { DataspecerMetadataProvider } from './metadata/types.ts';
import { writeFileTree } from './rendering/write-file-tree.ts';
import type { FileTreeContent } from './rendering/file-tree.ts';
import { renderGeneratedApp } from './rendering/render-generated-app.ts';
import { formatGeneratedApp } from './rendering/format-generated-app.ts';
import { validateApplicationGraph } from './validate-application-graph.ts';

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
  const validation = await validateApplicationGraph({
    graph: input.graph,
    metadataProvider: input.metadataProvider,
  });
  if (!validation.valid || !validation.graph || !validation.enrichedMetadata) {
    return failure(validation.violations);
  }

  const generationModel = buildGenerationModel(validation.graph, validation.enrichedMetadata);
  let fileTree = renderGeneratedApp(generationModel);
  try {
    fileTree = await formatGeneratedApp(fileTree);
  } catch (error) {
    return {
      success: false,
      violations: [
        {
          code: ViolationCode.GenerateFormatFailed,
          message: error instanceof Error ? error.message : String(error),
          severity: ViolationSeverity.Error,
        },
      ],
      files: {},
      writtenFiles: [],
      generationModel,
    };
  }
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
    violations: validation.violations,
    files,
    writtenFiles,
    generationModel,
  };
}

function failure(violations: Violation[]): GenerateAppResult {
  return {
    success: false,
    violations: violations,
    files: {},
    writtenFiles: [],
  };
}
