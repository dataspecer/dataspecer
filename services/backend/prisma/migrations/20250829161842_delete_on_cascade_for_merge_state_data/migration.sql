-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MergeStateData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mergeStateId" INTEGER NOT NULL,
    "changedInEditable" TEXT NOT NULL DEFAULT '[]',
    "removedInEditable" TEXT NOT NULL DEFAULT '[]',
    "createdInEditable" TEXT NOT NULL DEFAULT '[]',
    "conflicts" TEXT NOT NULL DEFAULT '[]',
    "diffTree" TEXT NOT NULL DEFAULT '{}',
    "diffTreeSize" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MergeStateData_mergeStateId_fkey" FOREIGN KEY ("mergeStateId") REFERENCES "MergeState" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MergeStateData" ("changedInEditable", "conflicts", "createdInEditable", "diffTree", "diffTreeSize", "id", "mergeStateId", "removedInEditable") SELECT "changedInEditable", "conflicts", "createdInEditable", "diffTree", "diffTreeSize", "id", "mergeStateId", "removedInEditable" FROM "MergeStateData";
DROP TABLE "MergeStateData";
ALTER TABLE "new_MergeStateData" RENAME TO "MergeStateData";
CREATE UNIQUE INDEX "MergeStateData_mergeStateId_key" ON "MergeStateData"("mergeStateId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
