/*
  Warnings:

  - You are about to drop the column `changedInEditable` on the `MergeState` table. All the data in the column will be lost.
  - You are about to drop the column `conflicts` on the `MergeState` table. All the data in the column will be lost.
  - You are about to drop the column `createdInEditable` on the `MergeState` table. All the data in the column will be lost.
  - You are about to drop the column `diffTree` on the `MergeState` table. All the data in the column will be lost.
  - You are about to drop the column `diffTreeSize` on the `MergeState` table. All the data in the column will be lost.
  - You are about to drop the column `removedInEditable` on the `MergeState` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "MergeStateData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mergeStateId" INTEGER NOT NULL,
    "changedInEditable" TEXT NOT NULL DEFAULT '[]',
    "removedInEditable" TEXT NOT NULL DEFAULT '[]',
    "createdInEditable" TEXT NOT NULL DEFAULT '[]',
    "conflicts" TEXT NOT NULL DEFAULT '[]',
    "diffTree" TEXT NOT NULL DEFAULT '{}',
    "diffTreeSize" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MergeStateData_mergeStateId_fkey" FOREIGN KEY ("mergeStateId") REFERENCES "MergeState" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "editable" TEXT NOT NULL
);
INSERT INTO "new_MergeState" ("editable", "filesystemTypeMergeFrom", "filesystemTypeMergeTo", "id", "lastCommitHashMergeFrom", "lastCommitHashMergeTo", "lastCommonCommitHash", "rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo", "rootIriMergeFrom", "rootIriMergeTo", "uuid") SELECT "editable", "filesystemTypeMergeFrom", "filesystemTypeMergeTo", "id", "lastCommitHashMergeFrom", "lastCommitHashMergeTo", "lastCommonCommitHash", "rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo", "rootIriMergeFrom", "rootIriMergeTo", "uuid" FROM "MergeState";
DROP TABLE "MergeState";
ALTER TABLE "new_MergeState" RENAME TO "MergeState";
CREATE UNIQUE INDEX "MergeState_uuid_key" ON "MergeState"("uuid");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "MergeStateData_mergeStateId_key" ON "MergeStateData"("mergeStateId");
