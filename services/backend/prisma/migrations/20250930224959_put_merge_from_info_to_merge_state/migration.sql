/*
  Warnings:

  - You are about to drop the column `mergeFromBranch` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `mergeFromHash` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `mergeFromIri` on the `Resource` table. All the data in the column will be lost.
  - Added the required column `branchMergeFrom` to the `MergeState` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchMergeTo` to the `MergeState` table without a default value. This is not possible if the table is not empty.

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
    "branchMergeTo" TEXT NOT NULL,
    "lastCommitHashMergeFrom" TEXT NOT NULL DEFAULT '',
    "rootFullPathToMetaMergeFrom" TEXT NOT NULL DEFAULT '',
    "rootIriMergeFrom" TEXT NOT NULL DEFAULT '',
    "filesystemTypeMergeFrom" TEXT NOT NULL,
    "branchMergeFrom" TEXT NOT NULL,
    "lastCommonCommitHash" TEXT NOT NULL DEFAULT '',
    "editable" TEXT NOT NULL,
    "mergeStateCause" TEXT NOT NULL,
    "isUpToDate" BOOLEAN NOT NULL DEFAULT true,
    "conflictCount" INTEGER NOT NULL
);
INSERT INTO "new_MergeState" ("conflictCount", "editable", "filesystemTypeMergeFrom", "filesystemTypeMergeTo", "id", "isUpToDate", "lastCommitHashMergeFrom", "lastCommitHashMergeTo", "lastCommonCommitHash", "mergeStateCause", "rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo", "rootIriMergeFrom", "rootIriMergeTo", "uuid") SELECT "conflictCount", "editable", "filesystemTypeMergeFrom", "filesystemTypeMergeTo", "id", "isUpToDate", "lastCommitHashMergeFrom", "lastCommitHashMergeTo", "lastCommonCommitHash", "mergeStateCause", "rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo", "rootIriMergeFrom", "rootIriMergeTo", "uuid" FROM "MergeState";
DROP TABLE "MergeState";
ALTER TABLE "new_MergeState" RENAME TO "MergeState";
CREATE UNIQUE INDEX "MergeState_uuid_key" ON "MergeState"("uuid");
CREATE TABLE "new_Resource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parentResourceId" INTEGER,
    "iri" TEXT NOT NULL,
    "representationType" TEXT NOT NULL,
    "dataStoreId" TEXT NOT NULL DEFAULT '{}',
    "userMetadata" TEXT NOT NULL DEFAULT '{}',
    "linkedGitRepositoryURL" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT 'main.',
    "projectIri" TEXT NOT NULL DEFAULT '',
    "representsBranchHead" BOOLEAN NOT NULL DEFAULT true,
    "lastCommitHash" TEXT NOT NULL DEFAULT '',
    "isSynchronizedWithRemote" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtreeModifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Resource" ("branch", "createdAt", "dataStoreId", "id", "iri", "isSynchronizedWithRemote", "lastCommitHash", "linkedGitRepositoryURL", "modifiedAt", "parentResourceId", "projectIri", "representationType", "representsBranchHead", "subtreeModifiedAt", "userMetadata") SELECT "branch", "createdAt", "dataStoreId", "id", "iri", "isSynchronizedWithRemote", "lastCommitHash", "linkedGitRepositoryURL", "modifiedAt", "parentResourceId", "projectIri", "representationType", "representsBranchHead", "subtreeModifiedAt", "userMetadata" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
CREATE UNIQUE INDEX "Resource_iri_key" ON "Resource"("iri");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
