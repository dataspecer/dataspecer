import { readdir } from "node:fs/promises";
import { parseMigrationFiles, type Migration } from "./migration-runner.ts";

// Bun builds replace this module with static imports of the migration files.
export async function loadMigrations(
  directory = new URL("../migrations/", import.meta.url),
): Promise<Migration[]> {
  const files = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile()).map(entry => entry.name);
  const migrations = parseMigrationFiles(files);
  return Promise.all(migrations.map(async migration => {
    const module = await import(new URL(migration.file, directory).href);
    if (typeof module.up !== "function") {
      throw new Error(`Migration ${migration.file} does not export an up function.`);
    }
    return { ...migration, up: module.up };
  }));
}
