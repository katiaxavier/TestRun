-- DropForeignKey
ALTER TABLE "Suite" DROP CONSTRAINT "Suite_boardId_fkey";

-- AlterTable
ALTER TABLE "Suite" DROP COLUMN "boardId";

-- CreateTable
CREATE TABLE "_BoardToSuite" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BoardToSuite_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BoardToSuite_B_index" ON "_BoardToSuite"("B");

-- AddForeignKey
ALTER TABLE "_BoardToSuite" ADD CONSTRAINT "_BoardToSuite_A_fkey" FOREIGN KEY ("A") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BoardToSuite" ADD CONSTRAINT "_BoardToSuite_B_fkey" FOREIGN KEY ("B") REFERENCES "Suite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

