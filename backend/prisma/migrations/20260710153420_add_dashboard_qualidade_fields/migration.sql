-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "jiraLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "jiraPriority" TEXT;

-- AlterTable
ALTER TABLE "Suite" ADD COLUMN     "epicKey" TEXT,
ADD COLUMN     "epicSummary" TEXT;

-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "automated" BOOLEAN NOT NULL DEFAULT false;

