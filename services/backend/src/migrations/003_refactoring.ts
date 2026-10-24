import { DatabaseSync } from 'node:sqlite';

export function up(context: {
  nodeDatabaseSync: DatabaseSync,
}) {
  context.nodeDatabaseSync.exec(`/*
    Manual migration file
*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DataSpecification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pimSchema" TEXT NOT NULL,
    "storeId" TEXT NOT NULL
);
INSERT INTO "new_DataSpecification" ("id", "pimSchema", "storeId") SELECT 'https://ofn.gov.cz/data-specification/' || id, 'INVALID:' || id, pimStore FROM "DataSpecification";
DROP TABLE "DataSpecification";
ALTER TABLE "new_DataSpecification" RENAME TO "DataSpecification";


CREATE UNIQUE INDEX "DataSpecification_pimSchema_key" ON "DataSpecification"("pimSchema");
CREATE UNIQUE INDEX "DataSpecification_storeId_key" ON "DataSpecification"("storeId");
CREATE TABLE "new_DataStructure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "psmSchema" TEXT NOT NULL,
    "belongsToDataSpecificationId" TEXT,
    CONSTRAINT "DataStructure_belongsToDataSpecificationId_fkey" FOREIGN KEY ("belongsToDataSpecificationId") REFERENCES "DataSpecification" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DataStructure" ("id", "storeId", psmSchema, belongsToDataSpecificationId) SELECT id, store, 'INVALID:' || id, 'https://ofn.gov.cz/data-specification/' || DataSpecificationId FROM "DataStructure";
DROP TABLE "DataStructure";
ALTER TABLE "new_DataStructure" RENAME TO "DataStructure";
CREATE UNIQUE INDEX "DataStructure_psmSchema_key" ON "DataStructure"("psmSchema");

UPDATE "_DataSpecificationReuse"
SET
A = 'https://ofn.gov.cz/data-specification/' || B,
B = 'https://ofn.gov.cz/data-specification/' || A;

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;


  `);
}
