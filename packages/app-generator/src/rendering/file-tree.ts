import { sortBy } from 'es-toolkit';

export type FileTreeContent = Record<string, string>;

export class FileTree {
  private readonly files = new Map<string, string>();

  set(path: string, content: string): void {
    this.files.set(normalizePath(path), ensureTrailingNewline(content));
  }

  get(path: string): string | undefined {
    return this.files.get(normalizePath(path));
  }

  entries(): Array<[string, string]> {
    return sortBy([...this.files.entries()], [([path]) => path]);
  }

  paths(): string[] {
    return this.entries().map(([path]) => path);
  }

  toObject(): FileTreeContent {
    return Object.fromEntries(this.entries());
  }
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+/, '');
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}
