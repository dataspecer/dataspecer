import { Kysely, SqliteDialect, type SqliteDatabase } from "kysely";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { Database, DatabaseSchema } from "./schema.ts";

/** Adapt native statements to Kysely's SQLite driver contract. */
export function adaptSqliteDatabase(database: DatabaseSync): SqliteDatabase {
  return {
    close: () => database.close(),
    prepare(sql) {
      const statement = database.prepare(sql);
      return {
        reader: statement.columns().length > 0,
        all: parameters => statement.all(...parameters.map(toSqliteParameter)),
        run: parameters => statement.run(...parameters.map(toSqliteParameter)),
        iterate: parameters => statement.iterate(...parameters.map(toSqliteParameter)),
      };
    },
  };
}

function toSqliteParameter(value: unknown): SQLInputValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return value;
  }
  throw new TypeError("Unsupported SQLite parameter type.");
}

/** Opens lazily so the migration runner can initialize the database first. */
export function createDatabase(filename: string | URL): Database {
  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: async () => {
        const database = new DatabaseSync(filename, { enableForeignKeyConstraints: true });
        try {
          database.exec("PRAGMA busy_timeout = 5000");
          return adaptSqliteDatabase(database);
        } catch (error) {
          database.close();
          throw error;
        }
      },
    }),
  });
}
