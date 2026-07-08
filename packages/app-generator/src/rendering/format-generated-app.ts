import { extname } from 'node:path/posix';

import { format } from 'prettier';

import { FileTree } from './file-tree.ts';

const FORMATTABLE_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.ts',
  '.tsx',
]);

export async function formatGeneratedApp(fileTree: FileTree): Promise<FileTree> {
  const formatted = new FileTree();
  for (const [path, content] of fileTree.entries()) {
    formatted.set(path, await formatGeneratedFile(path, content));
  }
  return formatted;
}

async function formatGeneratedFile(path: string, content: string): Promise<string> {
  if (!FORMATTABLE_EXTENSIONS.has(extname(path))) {
    return content;
  }
  return format(content, { filepath: path, printWidth: 100 });
}
