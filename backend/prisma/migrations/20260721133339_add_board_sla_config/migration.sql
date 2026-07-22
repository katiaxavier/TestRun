-- CreateTable
CREATE TABLE "BoardSlaConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "slaDays" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardSlaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardSlaConfig_projectId_boardId_key" ON "BoardSlaConfig"("projectId", "boardId");

-- AddForeignKey
ALTER TABLE "BoardSlaConfig" ADD CONSTRAINT "BoardSlaConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
