# backend service

The backend service runs on Node.js 22.18+ or Bun 1.4+ and is a part of the Dataspecer application that manages data specifications and provides access to stores.

## Installation instructions

1. Clone the whole mono repository. `git clone ...`
2. Create copy of `./main.config.sample.js` as `./main.config.js` and modify the configuration.
3. Run `npm install` from the root of the repository to install and link all packages.
4. Run `npm run build` from root of the repository to build `@dataspecer/core` and other packages. All generated files are in the `./build` directory.
5. Start the server by `npm run start` from this directory. It creates or upgrades the database before accepting requests.

For development, using [Bun](https://bun.sh/) is recommended. To start live development server, run `bun run --hot src/main.ts` from this directory.

Database access uses Kysely with native `node:sqlite` through the adapter in
`src/database/database.ts`. Table types are defined in `src/database/schema.ts`;
no generated client or external SQLite driver is required. The existing custom
SQLite migration runner manages the schema.
The server applies migrations before accepting requests.
Code can call `migrateDatabase(databasePath, storeModel)` from `src/migration-utils/migrate-database.ts`.
with a filesystem path or file URL. The caller selects the database; the runner
creates its parent directory if necessary.

Add migrations as TypeScript files in `src/migrations`, such as `013_add_index.ts`,
exporting `up(context: MigrationContext)` for database changes and/or
`upBackupFile(backup: InMemoryBackupDirectory)` for ZIP backup changes. Both hooks
may be asynchronous; the backup hook modifies the parsed archive in place. At
least one hook is required. Keep the table types
in `src/database/schema.ts` in sync with schema changes.
Migration numbers must be unique and sequential. Use at least three digits in
filenames; leading zeroes do not affect comparison. Do not rename or modify
released migrations; add a new migration instead. Tests reject duplicate numbers,
including conflicts introduced by merges.

`init.ts` initializes an empty database to the state immediately before the first
retained numbered migration. Initially it does nothing because `001` is retained.
To squash history, update `init.ts` to create the schema of the removed prefix and
remove those numbered files. Keep at least one numbered migration, with no gaps
in the retained sequence. Fresh databases record `0, init` followed by the retained
migrations; existing databases keep their history, and names in the removed prefix
are not compared. Databases missing a required removed migration must first be
upgraded with an older release.

The runner manages `migrations(number, name, finished_at)` independently of the
migration files. It converts completed Prisma history using a permanent mapping
of the original eleven migrations, preserves completion timestamps, and removes
`_prisma_migrations`. Unresolved failed Prisma migrations must be resolved using an
older release first; rolled-back attempts are ignored. Schema changes and history
conversion run in one SQLite transaction and roll back together on failure.
Migration functions must not start or commit transactions themselves. The runner
temporarily disables foreign-key enforcement for table rebuilds and checks
references before commit. Only database changes share this transaction; file or
network changes made by a migration cannot be rolled back by SQLite.

Database and backup migrations share one numbering sequence. Each runner skips
hooks for the other target while still advancing its version; database history
therefore also records ZIP-only migrations. Both Node.js and bundled Bun builds
load the same hooks.

New ZIP exports contain a root `.migrations.json` with `{ "version": N }`, where
`N` is the latest migration number. Resource `_version` and `_exportVersion`
fields are independent of this archive version. Exports require an up-to-date
database, as ensured by server startup. Archives without the manifest are treated
as version 11 and run migration 012 onward. This also supports unversioned exports
created after database migration 012: without a legacy `modelAlias`, the backup
hook preserves the existing label, including all translations. Imports await all pending backup hooks
before creating resources. `init` is only for database initialization and is not
run on backups. Invalid or newer archive versions are rejected. Removing a prefix
of migration files also prevents direct import of backups missing those steps;
upgrade and re-export them with an older release first. If a backup hook fails,
the import is aborted without writing resources and the in-memory archive is
discarded.

All data are stored in the `database` directory.

## Running inside Docker

For Docker, there is a different entrypoint `./src/docker-main.ts` that prepares
the database and all the files. Inside Docker, the backend serves as a static
file server for the frontend.
