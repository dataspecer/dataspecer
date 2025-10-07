/*
  Warnings:

  - A unique constraint covering the columns `[rootFullPathToMetaMergeFrom,rootFullPathToMetaMergeTo]` on the table `MergeState` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MergeState_rootFullPathToMetaMergeFrom_rootFullPathToMetaMergeTo_key" ON "MergeState"("rootFullPathToMetaMergeFrom", "rootFullPathToMetaMergeTo");
