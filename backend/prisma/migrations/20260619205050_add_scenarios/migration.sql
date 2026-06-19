-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionTestCaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scenario_executionTestCaseId_fkey" FOREIGN KEY ("executionTestCaseId") REFERENCES "ExecutionTestCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionTestCaseId" TEXT,
    "scenarioId" TEXT,
    "type" TEXT NOT NULL,
    "jiraKey" TEXT,
    "title" TEXT NOT NULL,
    "severity" TEXT,
    "status" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Issue_executionTestCaseId_fkey" FOREIGN KEY ("executionTestCaseId") REFERENCES "ExecutionTestCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Issue_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Issue" ("createdAt", "executionTestCaseId", "id", "jiraKey", "severity", "status", "title", "type", "updatedAt") SELECT "createdAt", "executionTestCaseId", "id", "jiraKey", "severity", "status", "title", "type", "updatedAt" FROM "Issue";
DROP TABLE "Issue";
ALTER TABLE "new_Issue" RENAME TO "Issue";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
