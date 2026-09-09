import { DatabaseSync } from 'node:sqlite';

export function up(context: {
  nodeDatabaseSync: DatabaseSync,
}) {
  context.nodeDatabaseSync.exec(`-- CreateTable
CREATE TABLE "DataSpecification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "pimStore" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DataStructure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "store" TEXT NOT NULL,
    "DataSpecificationId" TEXT NOT NULL,
    CONSTRAINT "DataStructure_DataSpecificationId_fkey" FOREIGN KEY ("DataSpecificationId") REFERENCES "DataSpecification" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DataSpecificationReuse" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    FOREIGN KEY ("A") REFERENCES "DataSpecification" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "DataSpecification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_DataSpecificationReuse_AB_unique" ON "_DataSpecificationReuse"("A", "B");

-- CreateIndex
CREATE INDEX "_DataSpecificationReuse_B_index" ON "_DataSpecificationReuse"("B");
  `);
}
