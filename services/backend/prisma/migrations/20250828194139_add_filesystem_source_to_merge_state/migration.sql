/*
  Warnings:

  - Added the required column `filesystemTypeMergeFrom` to the `MergeState` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filesystemTypeMergeTo` to the `MergeState` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MergeState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "lastCommitHashMergeTo" TEXT NOT NULL DEFAULT '',
    "rootFullPathToMetaMergeTo" TEXT NOT NULL DEFAULT '',
    "rootIriMergeTo" TEXT NOT NULL DEFAULT '',
    "filesystemTypeMergeTo" TEXT NOT NULL,
    "lastCommitHashMergeFrom" TEXT NOT NULL DEFAULT '',
    "rootFullPathToMetaMergeFrom" TEXT NOT NULL DEFAULT '',
    "rootIriMergeFrom" TEXT NOT NULL DEFAULT '',
    "filesystemTypeMergeFrom" TEXT NOT NULL,
    "lastCommonCommitHash" TEXT NOT NULL DEFAULT '',
    "editable" TEXT NOT NULL,
    "changedInEditable" TEXT NOT NULL DEFAULT '[]',
    "removedInEditable" TEXT NOT NULL DEFAULT '[]',
    "createdInEditable" TEXT NOT NULL DEFAULT '[]',
    "conflicts" TEXT NOT NULL DEFAULT '[]',
    "diffTree" TEXT NOT NULL DEFAULT '{}',
    "diffTreeSize" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_MergeState" ("changedInEditable", "conflicts", "createdInEditable", "diffTree", "diffTreeSize", "editable", "id", "lastCommitHashMergeFrom", "lastCommitHashMergeTo", "lastCommonCommitHash", "removedInEditable", "rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo", "rootIriMergeFrom", "rootIriMergeTo", "uuid") SELECT "changedInEditable", "conflicts", "createdInEditable", "diffTree", "diffTreeSize", "editable", "id", "lastCommitHashMergeFrom", "lastCommitHashMergeTo", "lastCommonCommitHash", "removedInEditable", "rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo", "rootIriMergeFrom", "rootIriMergeTo", "uuid" FROM "MergeState";
DROP TABLE "MergeState";
ALTER TABLE "new_MergeState" RENAME TO "MergeState";
CREATE UNIQUE INDEX "MergeState_uuid_key" ON "MergeState"("uuid");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
