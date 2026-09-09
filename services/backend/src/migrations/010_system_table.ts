import { DatabaseSync } from 'node:sqlite';

export function up(context: {
  nodeDatabaseSync: DatabaseSync,
}) {
  context.nodeDatabaseSync.exec(`-- CreateTable
CREATE TABLE "system" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- This value will be used for migrations in the future instead of Prisma migrations
INSERT INTO "system" ("key", "value") VALUES ('version-counter', '0');  `);
}
