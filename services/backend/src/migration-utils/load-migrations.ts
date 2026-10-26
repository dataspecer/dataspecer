import { readdir } from "node:fs/promises";
import { createMigration, parseMigrationFiles, type Migration } from "./migration-runner.ts";

/**
 * Loads all migration files from the ../migrations/ directory.
 * Please note that this file is replaced during build with statically inlined imports.
 * Any changes should correspond to services/backend/bun-build.mjs.
 */
export async function loadMigrations(
  directory = new URL("../migrations/", import.meta.url),
): Promise<Migration[]> {
  const files = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile()).map(entry => entry.name);
  const migrations = parseMigrationFiles(files);
  return Promise.all(migrations.map(async migration => {
    const module = await import(new URL(migration.file, directory).href);
    return createMigration(migration.number, migration.name, module);
  }));
}
