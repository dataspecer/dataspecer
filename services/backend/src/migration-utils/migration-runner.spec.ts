import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateUp, parseMigrationFiles, type Migration } from "./migration-runner.ts";

describe("migration filenames", () => {
  it("compares numbers regardless of leading zeroes", () => {
    expect(() => parseMigrationFiles(["init.ts", "001_first.ts", "1_other.ts"])).toThrow("Duplicate migration number 1");
    expect(parseMigrationFiles(["10_last.ts", "init.ts", "0009_middle.ts", "008_first.ts"]).map(file => file.number))
      .toEqual([0, 8, 9, 10]);
  });

  it.each([
    ["init.ts", "001_first.ts", "003_third.ts"],
    ["001_first.ts"],
    ["init.ts", "000_invalid.ts"],
    ["init.ts", "wrong.ts"],
  ])("rejects an invalid migration set %j", (...files) => {
    expect(() => parseMigrationFiles(files)).toThrow();
  });
});

describe("migration runner", () => {
  let database: DatabaseSync;
  let migrations: Migration[];

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    migrations = [
      { number: 0, name: "init", up: ({ nodeDatabaseSync }) => nodeDatabaseSync.exec("CREATE TABLE example (id INTEGER PRIMARY KEY)") },
      { number: 1, name: "add_name", up: ({ nodeDatabaseSync }) => nodeDatabaseSync.exec("ALTER TABLE example ADD COLUMN name TEXT") },
      { number: 2, name: "insert", up: ({ nodeDatabaseSync }) => nodeDatabaseSync.exec("INSERT INTO example VALUES (1, 'test')") },
      { number: 3, name: "add_reference", up: ({ nodeDatabaseSync }) => nodeDatabaseSync.exec("CREATE TABLE child (example_id INTEGER REFERENCES example(id))") },
    ];
  });

  afterEach(() => database.close());

  it("creates a fresh database, records all migrations, and does nothing on a second run", async () => {
    await migrateUp(database, migrations);
    const history = database.prepare("SELECT * FROM migrations ORDER BY number").all();
    expect(history.map(row => [row.number, row.name])).toEqual(migrations.map(migration => [migration.number, migration.name]));
    expect(history.every(row => typeof row.finished_at === "string" && !Number.isNaN(Date.parse(row.finished_at)))).toBe(true);
    expect(database.prepare("SELECT * FROM example").all()).toEqual([{ id: 1, name: "test" }]);
    expect(database.prepare("SELECT name FROM sqlite_master WHERE name = 'child'").get()).toBeDefined();
    const rerun = migrations.map(migration => ({ ...migration, up: vi.fn() }));
    await migrateUp(database, rerun);
    expect(rerun.every(migration => migration.up.mock.calls.length === 0)).toBe(true);
    expect(database.prepare("SELECT * FROM migrations ORDER BY number").all()).toEqual(history);
    expect(database.prepare("PRAGMA foreign_keys").get()!.foreign_keys).toBe(1);
  });

  it("initializes a squashed prefix and records only init and retained migrations", async () => {
    const squashed: Migration[] = [
      { number: 0, name: "init", up: ({ nodeDatabaseSync }) => nodeDatabaseSync.exec("CREATE TABLE example (id INTEGER)") },
      { number: 8, name: "add_name", up: ({ nodeDatabaseSync }) => nodeDatabaseSync.exec("ALTER TABLE example ADD COLUMN name TEXT") },
      { number: 9, name: "insert", up: ({ nodeDatabaseSync }) => nodeDatabaseSync.exec("INSERT INTO example VALUES (1, 'test')") },
    ];
    await migrateUp(database, squashed);
    expect(database.prepare("SELECT number FROM migrations ORDER BY number").all().map(row => row.number)).toEqual([0, 8, 9]);
    expect(database.prepare("SELECT * FROM example").get()).toEqual({ id: 1, name: "test" });
    await migrateUp(database, squashed);
    expect(database.prepare("SELECT COUNT(*) AS count FROM example").get()!.count).toBe(1);
  });

  it("upgrades an existing database without comparing removed migration names or running init", async () => {
    await migrateUp(database, migrations.slice(0, 3));
    database.exec("UPDATE migrations SET name = 'old_name' WHERE number BETWEEN 1 AND 2");
    const init = { ...migrations[0], up: vi.fn() };
    await migrateUp(database, [init, migrations[3]]);
    expect(init.up).not.toHaveBeenCalled();
    expect(database.prepare("SELECT MAX(number) AS number FROM migrations").get()!.number).toBe(3);
    expect(database.prepare("SELECT name FROM sqlite_master WHERE name = 'child'").get()).toBeDefined();
  });

  it("rejects a database too old for the retained files", async () => {
    await migrateUp(database, migrations.slice(0, 2));
    await expect(migrateUp(database, [migrations[0], migrations[3]])).rejects.toThrow("Use an older version");
    expect(database.prepare("SELECT MAX(number) AS number FROM migrations").get()!.number).toBe(1);
  });

  it("rejects a renamed applied migration before running pending migrations", async () => {
    await migrateUp(database, migrations.slice(0, 3));
    const pending = vi.fn();
    const changed = migrations.map(migration => migration.number === 2 ? { ...migration, name: "other_branch" }
      : migration.number === 3 ? { ...migration, up: pending } : migration);
    await expect(migrateUp(database, changed)).rejects.toThrow("name mismatch");
    expect(pending).not.toHaveBeenCalled();
  });

  it("rejects a database newer than the migration files", async () => {
    await migrateUp(database, migrations);
    await expect(migrateUp(database, migrations.slice(0, -1))).rejects.toThrow("newer than supported");
  });

  it("rejects gaps in applied history", async () => {
    await migrateUp(database, migrations);
    database.exec("DELETE FROM migrations WHERE number = 2");
    await expect(migrateUp(database, migrations)).rejects.toThrow("not sequential");
  });

  it("rolls back schema and history changes when a migration fails", async () => {
    await migrateUp(database, migrations);
    const failing: Migration = { number: 4, name: "failure", up: async ({ nodeDatabaseSync }) => {
      nodeDatabaseSync.exec("CREATE TABLE partial_change (id INTEGER)");
      throw new Error("failed");
    } };
    await expect(migrateUp(database, [...migrations, failing])).rejects.toThrow("4_failure failed");
    expect(database.prepare("SELECT name FROM sqlite_master WHERE name = 'partial_change'").get()).toBeUndefined();
    expect(database.prepare("SELECT MAX(number) AS number FROM migrations").get()!.number).toBe(3);
    expect(database.prepare("PRAGMA foreign_keys").get()!.foreign_keys).toBe(1);
  });

  it("rolls back initialization and the history table if a fresh upgrade fails", async () => {
    await expect(migrateUp(database, [migrations[0], { number: 8, name: "failure", up: () => { throw new Error("failed"); } }]))
      .rejects.toThrow("8_failure failed");
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()).toEqual([]);
  });

  it("checks foreign keys before committing", async () => {
    await migrateUp(database, migrations);
    const invalid: Migration = { number: 4, name: "invalid_reference", up: ({ nodeDatabaseSync }) => {
      nodeDatabaseSync.exec("INSERT INTO child (example_id) VALUES (999)");
    } };
    await expect(migrateUp(database, [...migrations, invalid])).rejects.toThrow("foreign-key violations");
    expect(database.prepare("SELECT * FROM child").all()).toEqual([]);
  });

  it("refuses to initialize an untracked nonempty database", async () => {
    database.exec("CREATE TABLE unknown (id INTEGER)");
    await expect(migrateUp(database, migrations)).rejects.toThrow("Migration history is empty but the database is not");
    expect(database.prepare("SELECT name FROM sqlite_master WHERE name = 'unknown'").get()).toBeDefined();
  });

  describe("Prisma history conversion", () => {
    beforeEach(() => {
      database.exec(`CREATE TABLE _prisma_migrations (
        migration_name TEXT NOT NULL,
        finished_at DATETIME,
        rolled_back_at DATETIME
      );
      INSERT INTO _prisma_migrations VALUES ('20211121101731_initial_schema', 1700000000000, NULL)`);
      migrations = [
        { number: 0, name: "init", up: vi.fn() },
        { number: 2, name: "added_artifacts", up: vi.fn() },
        { number: 3, name: "test_upgrade", up: ({ nodeDatabaseSync }) => nodeDatabaseSync.exec("CREATE TABLE example (id INTEGER)") },
      ];
    });

    it.each([1, 2])("converts Prisma history at version %i and upgrades", async count => {
      if (count === 2) {
        database.exec("INSERT INTO _prisma_migrations VALUES ('20220102185555_added_artifacts', 1700000000000, NULL)");
      }
      await migrateUp(database, migrations);
      expect(database.prepare("SELECT name FROM sqlite_master WHERE name = '_prisma_migrations'").get()).toBeUndefined();
      expect(database.prepare("SELECT number, name FROM migrations ORDER BY number").all()).toEqual([
        { number: 1, name: "initial_schema" },
        { number: 2, name: "added_artifacts" },
        { number: 3, name: "test_upgrade" },
      ]);
      expect(database.prepare("SELECT finished_at FROM migrations WHERE number = 1").get()!.finished_at).toBe("2023-11-14T22:13:20.000Z");
      expect(migrations[0].up).not.toHaveBeenCalled();
      expect(migrations[1].up).toHaveBeenCalledTimes(count === 1 ? 1 : 0);
      expect(database.prepare("SELECT name FROM sqlite_master WHERE name = 'example'").get()).toBeDefined();
    });

    it("preserves Prisma mapping when the prefix has been removed", async () => {
      database.exec("INSERT INTO _prisma_migrations VALUES ('20220102185555_added_artifacts', 1700000000000, NULL)");
      await migrateUp(database, [migrations[0], migrations[2]]);
      expect(database.prepare("SELECT number, name FROM migrations ORDER BY number").all()).toEqual([
        { number: 1, name: "initial_schema" },
        { number: 2, name: "added_artifacts" },
        { number: 3, name: "test_upgrade" },
      ]);
    });

    it("leaves Prisma history intact when the upgrade fails", async () => {
      const history = database.prepare("SELECT * FROM _prisma_migrations").all();
      await expect(migrateUp(database, [migrations[0], migrations[2]])).rejects.toThrow("Use an older version");
      expect(database.prepare("SELECT * FROM _prisma_migrations").all()).toEqual(history);
      expect(database.prepare("SELECT name FROM sqlite_master WHERE name = 'migrations'").get()).toBeUndefined();
    });

    it("rejects unfinished Prisma migrations and ignores rolled-back attempts", async () => {
      database.exec("INSERT INTO _prisma_migrations VALUES ('failed_attempt', NULL, NULL)");
      await expect(migrateUp(database, migrations)).rejects.toThrow("did not finish");
      database.exec("UPDATE _prisma_migrations SET rolled_back_at = CURRENT_TIMESTAMP WHERE migration_name = 'failed_attempt'");
      await migrateUp(database, migrations);
      expect(database.prepare("SELECT COUNT(*) AS count FROM migrations").get()!.count).toBe(3);
    });

    it("rejects unknown Prisma migrations without removing history", async () => {
      database.exec("INSERT INTO _prisma_migrations VALUES ('20990101000000_unknown', CURRENT_TIMESTAMP, NULL)");
      await expect(migrateUp(database, migrations)).rejects.toThrow("Unknown Prisma migration");
      expect(database.prepare("SELECT COUNT(*) AS count FROM _prisma_migrations").get()!.count).toBe(2);
    });
  });
});
