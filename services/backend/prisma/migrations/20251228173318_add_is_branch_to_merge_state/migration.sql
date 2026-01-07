/*
  Warnings:

  - Added the required column `isMergeFromBranch` to the `MergeState` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isMergeToBranch` to the `MergeState` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MergeState" (
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedDiffTreeAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "isMergeFromBranch" BOOLEAN NOT NULL,
    "isMergeToBranch" BOOLEAN NOT NULL,
    "commitMessage" TEXT NOT NULL DEFAULT '',
    "lastCommitHashMergeTo" TEXT NOT NULL DEFAULT '',
    "gitUrlMergeTo" TEXT NOT NULL DEFAULT '',
    "branchMergeTo" TEXT NOT NULL,
    "rootFullPathToMetaMergeTo" TEXT NOT NULL DEFAULT '',
    "rootIriMergeTo" TEXT NOT NULL DEFAULT '',
    "filesystemTypeMergeTo" TEXT NOT NULL,
    "lastCommitHashMergeFrom" TEXT NOT NULL DEFAULT '',
    "gitUrlMergeFrom" TEXT NOT NULL DEFAULT '',
    "branchMergeFrom" TEXT NOT NULL,
    "rootFullPathToMetaMergeFrom" TEXT NOT NULL DEFAULT '',
    "rootIriMergeFrom" TEXT NOT NULL DEFAULT '',
    "filesystemTypeMergeFrom" TEXT NOT NULL,
    "lastCommonCommitHash" TEXT NOT NULL DEFAULT '',
    "editable" TEXT NOT NULL,
    "mergeStateCause" TEXT NOT NULL,
    "isUpToDate" BOOLEAN NOT NULL DEFAULT true,
    "conflictCount" INTEGER NOT NULL
);
INSERT INTO "new_MergeState" ("branchMergeFrom", "branchMergeTo", "commitMessage", "conflictCount", "createdAt", "editable", "filesystemTypeMergeFrom", "filesystemTypeMergeTo", "gitUrlMergeFrom", "gitUrlMergeTo", "id", "isUpToDate", "lastCommitHashMergeFrom", "lastCommitHashMergeTo", "lastCommonCommitHash", "mergeStateCause", "modifiedDiffTreeAt", "rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo", "rootIriMergeFrom", "rootIriMergeTo", "uuid") SELECT "branchMergeFrom", "branchMergeTo", "commitMessage", "conflictCount", "createdAt", "editable", "filesystemTypeMergeFrom", "filesystemTypeMergeTo", "gitUrlMergeFrom", "gitUrlMergeTo", "id", "isUpToDate", "lastCommitHashMergeFrom", "lastCommitHashMergeTo", "lastCommonCommitHash", "mergeStateCause", "modifiedDiffTreeAt", "rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo", "rootIriMergeFrom", "rootIriMergeTo", "uuid" FROM "MergeState";
DROP TABLE "MergeState";
ALTER TABLE "new_MergeState" RENAME TO "MergeState";
CREATE UNIQUE INDEX "MergeState_uuid_key" ON "MergeState"("uuid");
CREATE UNIQUE INDEX "MergeState_rootFullPathToMetaMergeFrom_rootFullPathToMetaMergeTo_key" ON "MergeState"("rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
