/*
  Warnings:

  - You are about to drop the `DataSpecification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DataStructure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Package` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DataSpecificationReuse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DataSpecification";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DataStructure";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Package";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_DataSpecificationReuse";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upEvents" TEXT,
    "downEvents" TEXT,
    CONSTRAINT "Transaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionParent" (
    "transactionId" INTEGER NOT NULL,
    "parentTransactionId" INTEGER NOT NULL,

    PRIMARY KEY ("transactionId", "parentTransactionId"),
    CONSTRAINT "TransactionParent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionParent_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "modelId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "Operation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Operation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "projectId" INTEGER NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "resourceId" INTEGER,
    CONSTRAINT "Branch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Branch_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Branch_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Transaction_projectId_idx" ON "Transaction"("projectId");

-- CreateIndex
CREATE INDEX "Transaction_projectId_clientId_idx" ON "Transaction"("projectId", "clientId");

-- CreateIndex
CREATE INDEX "Operation_transactionId_idx" ON "Operation"("transactionId");

-- CreateIndex
CREATE INDEX "Operation_projectId_idx" ON "Operation"("projectId");

-- CreateIndex
CREATE INDEX "Branch_projectId_idx" ON "Branch"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_projectId_name_key" ON "Branch"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_projectId_resourceId_key" ON "Branch"("projectId", "resourceId");
