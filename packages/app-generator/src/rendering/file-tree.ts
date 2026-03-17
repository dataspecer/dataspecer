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
    return [...this.files.entries()].sort(([left], [right]) => {
      if (left < right) {
        return -1;
      }
      if (left > right) {
        return 1;
      }
      return 0;
    });
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
