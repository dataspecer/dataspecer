-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Branch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "projectId" INTEGER NOT NULL,
    "transactionId" INTEGER,
    "resourceId" INTEGER,
    CONSTRAINT "Branch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Branch_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Branch_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Branch" ("id", "name", "projectId", "transactionId") SELECT "id", "name", "projectId", "transactionId" FROM "Branch";
DROP TABLE "Branch";
ALTER TABLE "new_Branch" RENAME TO "Branch";
CREATE INDEX "Branch_projectId_idx" ON "Branch"("projectId");
CREATE UNIQUE INDEX "Branch_projectId_name_key" ON "Branch"("projectId", "name");
CREATE UNIQUE INDEX "Branch_projectId_resourceId_key" ON "Branch"("projectId", "resourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
