import type { DatabaseSync } from "node:sqlite";

export type Migration = {
  number: number;
  name: string;
  up: (context: { nodeDatabaseSync: DatabaseSync }) => void | Promise<void>;
};

export function parseMigrationFiles(files: readonly string[], strict: boolean = false): { file: string; number: number; name: string }[] {
  if (!strict) {
    files = files.filter(file => /\.(ts|js)$/.test(file) && !file.endsWith(".d.ts"));
  }

  const migrations = files.map(file => {
    if (/^init\.(ts|js)$/.test(file)) {
      return { file, number: 0, name: "init" };
    }
    const match = /^(\d+)_(.+)\.(ts|js)$/.exec(file);
    if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) < 1) {
      throw new Error(`Invalid migration filename: ${file}. Expected a positive number followed by _name.ts.`);
    }
    return { file, number: Number(match[1]), name: match[2] };
  }).sort((a, b) => a.number - b.number);
  validateMigrationSequence(migrations);
  return migrations;
}

function validateMigrationSequence(migrations: readonly { number: number; name: string }[]): void {
  if (migrations[0]?.number !== 0 || migrations[0]?.name !== "init") {
    throw new Error("Missing init migration.");
  }
  if (migrations.length < 2) {
    throw new Error("At least one numbered migration must be retained.");
  }
  for (let i = 1; i < migrations.length; i++) {
    const previous = migrations[i - 1];
    const current = migrations[i];
    if (!Number.isSafeInteger(current.number) || current.number < 0 || !current.name) {
      throw new Error("Invalid migration number or name.");
    }
    if (current.number === previous.number) {
      throw new Error(`Duplicate migration number ${current.number}: ${previous.name}, ${current.name}.`);
    }
    if (current.number < previous.number || (previous.number !== 0 && current.number !== previous.number + 1)) {
      throw new Error(`Migration files are not sequential at ${current.number}.`);
    }
  }
}

function prepareHistory(database: DatabaseSync): void {
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
  const hasMigrations = tables.some(table => table.name === "migrations");
  if (hasMigrations) {
    return;
  }

  database.exec(`CREATE TABLE migrations (
    number INTEGER NOT NULL PRIMARY KEY CHECK (number >= 0),
    name TEXT NOT NULL,
    finished_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migrate from Prisma

  const hasPrisma = tables.some(table => table.name === "_prisma_migrations");
  if (!hasPrisma) {
    return;
  }
  const rows = database.prepare("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations").all();
  const insert = database.prepare("INSERT INTO migrations (number, name, finished_at) VALUES (?, ?, ?)");
  const prismaMigrationNames = [
    "20211121101731_initial_schema",
    "20220102185555_added_artifacts",
    "20220223204021_refactoring",
    "20220323170806_tags_added",
    "20220609203714_artifacts_configuration",
    "20221013210917_specification_type",
    "20221209095606_cim_adapters",
    "20231127125531_package_schema",
    "20240410015358_core_v2",
    "20241023165321_system_table",
    "20260810082321_operations",
  ];
  for (const row of rows) {
    if (row.rolled_back_at !== null) {
      continue;
    }
    if (row.finished_at === null) {
      throw new Error(`Prisma migration ${row.migration_name} did not finish. Resolve it with an older version of the tool first.`);
    }
    const index = prismaMigrationNames.indexOf(String(row.migration_name));
    if (index === -1) {
      throw new Error(`Unknown Prisma migration ${row.migration_name}; this version of the tool cannot migrate this database.`);
    }
    const finishedAt = typeof row.finished_at === "number" || typeof row.finished_at === "bigint"
      ? new Date(Number(row.finished_at)).toISOString()
      : row.finished_at;
    insert.run(index + 1, prismaMigrationNames[index].split("_").slice(1).join("_"), finishedAt);
  }
  database.exec("DROP TABLE _prisma_migrations");
}

function pendingMigrations(database: DatabaseSync, migrations: readonly Migration[]): readonly Migration[] {
  const history = database.prepare("SELECT number, name FROM migrations ORDER BY number").all();
  if (history.length === 0) {
    const existingTable = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'migrations'").get();
    if (existingTable) {
      throw new Error("Migration history is empty but the database is not. Use an older version of the tool to migrate it first.");
    }
    return migrations;
  }
  const first = migrations[1].number;
  const latest = migrations[migrations.length - 1].number;
  const current = Number(history[history.length - 1].number);
  if (current > latest) {
    throw new Error(`Database migration ${current} is newer than supported migration ${latest}. Use a newer version of the tool.`);
  }
  for (let i = 0; i < history.length; i++) {
    const row = history[i];
    const number = Number(row.number);
    if (!Number.isSafeInteger(number) || number < 0 || (number === 0 && row.name !== "init")) {
      throw new Error(`Invalid migration history at ${row.number}.`);
    }
    const previous = i > 0 ? Number(history[i - 1].number) : null;
    if ((previous === null && number > 1) || (previous !== null && previous !== 0 && number !== previous + 1)) {
      throw new Error(`Migration history is not sequential at ${number}.`);
    }
  }
  for (const migration of migrations.slice(1)) {
    if (migration.number > current) {
      break;
    }
    const applied = history.find(row => row.number === migration.number);
    if (!applied || applied.name !== migration.name) {
      throw new Error(`Migration ${migration.number} name mismatch: database has ${applied?.name ?? "no entry"}, files have ${migration.name}.`);
    }
  }
  if (current !== 0 && current < first - 1) {
    throw new Error(`Database migration ${current} is too old; migration ${current + 1} is no longer available. Use an older version of the tool to migrate it first.`);
  }
  return migrations.filter(migration => migration.number > current);
}

/** Apply schema and history changes atomically while holding the SQLite write lock. */
export async function migrateUp(database: DatabaseSync, migrations: readonly Migration[]): Promise<void> {
  const ordered = [...migrations].sort((a, b) => a.number - b.number);
  validateMigrationSequence(ordered);
  const foreignKeys = database.prepare("PRAGMA foreign_keys").get()!.foreign_keys;
  // SQLite cannot change foreign-key enforcement inside a transaction.
  database.exec("PRAGMA foreign_keys = OFF");
  let transactionStarted = false;
  try {
    database.exec("BEGIN IMMEDIATE");
    transactionStarted = true;
    prepareHistory(database);
    const pending = pendingMigrations(database, ordered);
    if (pending.length > 0) {
      console.log(`${pending.length} pending migration(s) to be applied.`);
    }
    const insert = database.prepare("INSERT INTO migrations (number, name) VALUES (?, ?)");
    for (const migration of pending) {
      try {
        console.log(`applying migration ${migration.name}...`);
        await migration.up({ nodeDatabaseSync: database });
        insert.run(migration.number, migration.name);
      } catch (cause) {
        throw new Error(`Migration ${migration.number}_${migration.name} failed.`, { cause });
      }
    }
    if (pending.length > 0 && database.prepare("PRAGMA foreign_key_check").all().length > 0) {
      throw new Error("Migration left foreign-key violations; changes have been rolled back.");
    }
    database.exec("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      database.exec("ROLLBACK");
    }
    throw error;
  } finally {
    database.exec(`PRAGMA foreign_keys = ${foreignKeys ? "ON" : "OFF"}`);
  }
}
