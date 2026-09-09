import { DatabaseSync } from 'node:sqlite';

export function up(context: {
  nodeDatabaseSync: DatabaseSync,
}) {
  context.nodeDatabaseSync.exec(`-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DataSpecification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pimSchema" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "artifactsConfiguration" TEXT NOT NULL DEFAULT '[]',
    "cimAdapters" TEXT NOT NULL DEFAULT '[]',
    "type" TEXT NOT NULL DEFAULT 'http://dataspecer.com/vocabularies/data-specification/documentation'
);
INSERT INTO "new_DataSpecification" ("artifactsConfiguration", "id", "pimSchema", "storeId", "tags", "type") SELECT "artifactsConfiguration", "id", "pimSchema", "storeId", "tags", "type" FROM "DataSpecification";
DROP TABLE "DataSpecification";
ALTER TABLE "new_DataSpecification" RENAME TO "DataSpecification";
CREATE UNIQUE INDEX "DataSpecification_pimSchema_key" ON "DataSpecification"("pimSchema");
CREATE UNIQUE INDEX "DataSpecification_storeId_key" ON "DataSpecification"("storeId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
  `);
}
