PRAGMA foreign_keys = ON;

-- CreateTable
CREATE TABLE "Branch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "transactionId" INTEGER,
    CONSTRAINT "Branch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Branch_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_projectId_name_key" ON "Branch"("projectId", "name");

-- CreateIndex
CREATE INDEX "Branch_projectId_idx" ON "Branch"("projectId");

-- Migrate: create a "main" branch for every project that already has transactions,
-- pointing to the latest transaction in that project.
INSERT INTO "Branch" ("name", "projectId", "transactionId")
SELECT 'main', "projectId", MAX("id")
FROM "Transaction"
GROUP BY "projectId";
