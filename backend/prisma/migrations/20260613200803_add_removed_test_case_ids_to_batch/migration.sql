-- AlterTable
ALTER TABLE "ExecutionBatch" ADD COLUMN "removedTestCaseIds" JSON NOT NULL DEFAULT '[]';
