export type JsonObject = unknown;

export interface InMemoryBackupDirectory {
  directories: Map<string, InMemoryBackupDirectory>;
  files: Map<string, JsonObject>;
}

export function createInMemoryBackup(): InMemoryBackupDirectory {
  return { directories: new Map(), files: new Map() };
}

export function addJsonFileToBackup(backup: InMemoryBackupDirectory, path: string, value: JsonObject): void {
  const parts = path.split("/");
  const fileName = parts.pop();
  if (fileName === undefined || fileName.length === 0 || path.startsWith("/") || parts.some((part) => part === ".." || part === "." || part.length === 0)) {
    throw new Error(`Invalid import backup path "${path}".`);
  }

  let directory = backup;
  for (const part of parts) {
    let child = directory.directories.get(part);
    if (child === undefined) {
      child = createInMemoryBackup();
      directory.directories.set(part, child);
    }
    directory = child;
  }
  if (directory.files.has(fileName)) {
    throw new Error(`Duplicate import backup file "${path}".`);
  }
  directory.files.set(fileName, value);
}
