import { DatabaseSync } from 'node:sqlite';

export function up(context: {
  nodeDatabaseSync: DatabaseSync,
}) {
  context.nodeDatabaseSync.exec(`-- CreateTable
CREATE TABLE "Package" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parentPackageId" INTEGER,
    "iriChunk" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}'
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_parentPackageId_iriChunk_key" ON "Package"("parentPackageId", "iriChunk");

-- Insert data
INSERT INTO "Package" ("parentPackageId", "iriChunk", "metadata") VALUES (NULL, 'https://dataspecer.com/packages', '{}');
  `);
}
