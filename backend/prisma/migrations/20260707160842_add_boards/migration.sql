-- AlterTable
ALTER TABLE "ExecutionBatch" ADD COLUMN     "boardId" TEXT;

-- AlterTable
ALTER TABLE "Suite" ADD COLUMN     "boardId" TEXT;

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "jiraBoardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Board_jiraBoardId_key" ON "Board"("jiraBoardId");

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suite" ADD CONSTRAINT "Suite_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionBatch" ADD CONSTRAINT "ExecutionBatch_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

