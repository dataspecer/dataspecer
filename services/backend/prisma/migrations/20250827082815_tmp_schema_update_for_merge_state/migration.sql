-- CreateTable
CREATE TABLE "MergeState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "lastCommitHashMergeTo" TEXT NOT NULL DEFAULT '',
    "rootFullPathMergeTo" TEXT NOT NULL DEFAULT '',
    "rootIriMergeTo" TEXT NOT NULL DEFAULT '',
    "lastCommitHashMergeFrom" TEXT NOT NULL DEFAULT '',
    "rootFullPathMergeFrom" TEXT NOT NULL DEFAULT '',
    "rootIriMergeFrom" TEXT NOT NULL DEFAULT '',
    "lastCommonCommitHash" TEXT NOT NULL DEFAULT '',
    "editable" TEXT NOT NULL,
    "changedInEditable" TEXT NOT NULL DEFAULT '[]',
    "removedInEditable" TEXT NOT NULL DEFAULT '[]',
    "createdInEditable" TEXT NOT NULL DEFAULT '[]',
    "conflicts" TEXT NOT NULL DEFAULT '[]'
);

-- CreateIndex
CREATE UNIQUE INDEX "MergeState_uuid_key" ON "MergeState"("uuid");
