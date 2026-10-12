import { mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { migrateUp } from "./migration-runner.ts";
import { loadMigrations } from "./load-migrations.ts";

/** Migrates a file or an existing connection without closing caller-owned connections. */
export async function migrateDatabase(databasePath: string | URL | DatabaseSync): Promise<void> {
  const migrations = await loadMigrations();
  if (databasePath instanceof DatabaseSync) {
    await migrateUp(databasePath, migrations);
    return;
  }
  const filename = databasePath instanceof URL ? fileURLToPath(databasePath) : databasePath;
  if (filename !== ":memory:") {
    await mkdir(dirname(filename), { recursive: true });
  }
  const database = new DatabaseSync(filename);
  try {
    database.exec("PRAGMA busy_timeout = 5000");
    await migrateUp(database, migrations);
  } finally {
    database.close();
  }
}
