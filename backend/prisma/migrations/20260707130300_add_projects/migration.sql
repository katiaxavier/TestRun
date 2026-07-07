-- DropIndex
DROP INDEX "Suite_jiraKey_key";

-- DropIndex
DROP INDEX "Suite_manualKey_key";

-- AlterTable
ALTER TABLE "ExecutionBatch" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "Suite" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "jiraProjectId" TEXT NOT NULL,
    "jiraProjectKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_jiraProjectId_key" ON "Project"("jiraProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_jiraProjectKey_key" ON "Project"("jiraProjectKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMembership_userId_projectId_key" ON "ProjectMembership"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Suite_projectId_jiraKey_key" ON "Suite"("projectId", "jiraKey");

-- CreateIndex
CREATE UNIQUE INDEX "Suite_projectId_manualKey_key" ON "Suite"("projectId", "manualKey");

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suite" ADD CONSTRAINT "Suite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionBatch" ADD CONSTRAINT "ExecutionBatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

