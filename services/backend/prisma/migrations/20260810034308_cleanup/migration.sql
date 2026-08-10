/*
  Warnings:

  - You are about to drop the `DataSpecification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DataStructure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Package` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DataSpecificationReuse` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `transactionId` on table `Branch` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "DataSpecification_storeId_key";

-- DropIndex
DROP INDEX "DataSpecification_pimSchema_key";

-- DropIndex
DROP INDEX "DataStructure_psmSchema_key";

-- DropIndex
DROP INDEX "Package_parentPackageId_iriChunk_key";

-- DropIndex
DROP INDEX "_DataSpecificationReuse_B_index";

-- DropIndex
DROP INDEX "_DataSpecificationReuse_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DataSpecification";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DataStructure";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Package";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_DataSpecificationReuse";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Branch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "projectId" INTEGER NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "resourceId" INTEGER,
    CONSTRAINT "Branch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Branch_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Branch_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Branch" ("id", "name", "projectId", "resourceId", "transactionId") SELECT "id", "name", "projectId", "resourceId", "transactionId" FROM "Branch";
DROP TABLE "Branch";
ALTER TABLE "new_Branch" RENAME TO "Branch";
CREATE INDEX "Branch_projectId_idx" ON "Branch"("projectId");
CREATE UNIQUE INDEX "Branch_projectId_name_key" ON "Branch"("projectId", "name");
CREATE UNIQUE INDEX "Branch_projectId_resourceId_key" ON "Branch"("projectId", "resourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
