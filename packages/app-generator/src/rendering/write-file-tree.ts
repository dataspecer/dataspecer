import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative } from 'node:path';

import type { FileTree } from '../rendering/file-tree.ts';

export interface WriteFileTreeOptions {
  outputDirectory: string;
  allowOverwrite?: boolean;
}

export interface WriteFileTreeResult {
  writtenFiles: string[];
}

export async function writeFileTree(
  fileTree: FileTree,
  options: WriteFileTreeOptions
): Promise<WriteFileTreeResult> {
  await ensureWritableOutputDirectory(options);

  const writtenFiles: string[] = [];
  for (const [filePath, content] of fileTree.entries()) {
    const targetPath = getSafeTargetPath(options.outputDirectory, filePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, 'utf8');
    writtenFiles.push(filePath);
  }

  return { writtenFiles };
}

async function ensureWritableOutputDirectory(options: WriteFileTreeOptions): Promise<void> {
  await mkdir(options.outputDirectory, { recursive: true });
  const entries = await readdir(options.outputDirectory);

  if (!options.allowOverwrite && entries.length > 0) {
    throw new Error(
      `Output directory "${options.outputDirectory}" is not empty. Set allowOverwrite to write into it.`
    );
  }
}

function getSafeTargetPath(outputDirectory: string, filePath: string): string {
  if (isAbsolute(filePath)) {
    throw new Error(`Generated file path "${filePath}" must be relative.`);
  }

  const targetPath = normalize(join(outputDirectory, filePath));
  const relativePath = relative(outputDirectory, targetPath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Generated file path "${filePath}" escapes the output directory.`);
  }

  return targetPath;
}
