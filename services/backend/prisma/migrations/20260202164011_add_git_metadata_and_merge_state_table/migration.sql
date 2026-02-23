-- CreateTable
CREATE TABLE "MergeState" (
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

-- CreateTable
CREATE TABLE "MergeStateData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mergeStateId" INTEGER NOT NULL,
    "changedInEditable" TEXT NOT NULL DEFAULT '[]',
    "removedInEditable" TEXT NOT NULL DEFAULT '[]',
    "createdInEditable" TEXT NOT NULL DEFAULT '[]',
    "conflicts" TEXT NOT NULL DEFAULT '[]',
    "unresolvedConflicts" TEXT NOT NULL DEFAULT '[]',
    "diffTree" TEXT NOT NULL DEFAULT '{}',
    "diffTreeSize" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MergeStateData_mergeStateId_fkey" FOREIGN KEY ("mergeStateId") REFERENCES "MergeState" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Resource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parentResourceId" INTEGER,
    "iri" TEXT NOT NULL,
    "representationType" TEXT NOT NULL,
    "dataStoreId" TEXT NOT NULL DEFAULT '{}',
    "userMetadata" TEXT NOT NULL DEFAULT '{}',
    "linkedGitRepositoryURL" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT '',
    "projectIri" TEXT NOT NULL DEFAULT '',
    "representsBranchHead" BOOLEAN NOT NULL DEFAULT true,
    "lastCommitHash" TEXT NOT NULL DEFAULT '',
    "activeMergeStateCount" INTEGER NOT NULL DEFAULT 0,
    "hasUncommittedChanges" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtreeModifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Resource" ("createdAt", "dataStoreId", "id", "iri", "modifiedAt", "parentResourceId", "representationType", "subtreeModifiedAt", "userMetadata") SELECT "createdAt", "dataStoreId", "id", "iri", "modifiedAt", "parentResourceId", "representationType", "subtreeModifiedAt", "userMetadata" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
CREATE UNIQUE INDEX "Resource_iri_key" ON "Resource"("iri");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "MergeState_uuid_key" ON "MergeState"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "MergeState_rootFullPathToMetaMergeFrom_rootFullPathToMetaMergeTo_key" ON "MergeState"("rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo");

-- CreateIndex
CREATE UNIQUE INDEX "MergeStateData_mergeStateId_key" ON "MergeStateData"("mergeStateId");
