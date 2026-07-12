-- Adds the mandatory clientId column. Existing transactions are backfilled
-- with their numerical id, which cannot collide with the client-generated
-- uuids and is never referenced by already recorded undo operations.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- RedefineTables
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upEvents" TEXT,
    "downEvents" TEXT,
    CONSTRAINT "Transaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("id", "projectId", "clientId", "createdAt", "upEvents", "downEvents")
SELECT "id", "projectId", CAST("id" AS TEXT), "createdAt", "upEvents", "downEvents" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";

-- CreateIndex
CREATE INDEX "Transaction_projectId_idx" ON "Transaction"("projectId");
CREATE INDEX "Transaction_projectId_clientId_idx" ON "Transaction"("projectId", "clientId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
