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
Code can call `migrateDatabase(databasePath)` from `src/migration-utils/migrate-database.ts`
with a filesystem path or file URL. The caller selects the database; the runner
creates its parent directory if necessary.

Add schema changes as TypeScript files in `src/migrations`, such as `012_add_index.ts`,
exporting `up(context: { nodeDatabaseSync: DatabaseSync })`. Keep the table types
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

All data are stored in the `database` directory.

## Running inside Docker

For Docker, there is a different entrypoint `./src/docker-main.ts` that prepares
the database and all the files. Inside Docker, the backend serves as a static
file server for the frontend.