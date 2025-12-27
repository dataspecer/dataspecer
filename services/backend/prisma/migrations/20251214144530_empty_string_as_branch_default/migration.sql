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
INSERT INTO "new_Resource" ("activeMergeStateCount", "branch", "createdAt", "dataStoreId", "hasUncommittedChanges", "id", "iri", "lastCommitHash", "linkedGitRepositoryURL", "modifiedAt", "parentResourceId", "projectIri", "representationType", "representsBranchHead", "subtreeModifiedAt", "userMetadata") SELECT "activeMergeStateCount", "branch", "createdAt", "dataStoreId", "hasUncommittedChanges", "id", "iri", "lastCommitHash", "linkedGitRepositoryURL", "modifiedAt", "parentResourceId", "projectIri", "representationType", "representsBranchHead", "subtreeModifiedAt", "userMetadata" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
CREATE UNIQUE INDEX "Resource_iri_key" ON "Resource"("iri");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
