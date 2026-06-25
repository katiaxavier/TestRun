-- CreateTable
CREATE TABLE "TestCaseScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testCaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestCaseScenario_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionTestCaseId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scenario_executionTestCaseId_fkey" FOREIGN KEY ("executionTestCaseId") REFERENCES "ExecutionTestCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scenario_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TestCaseScenario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Scenario" ("comments", "createdAt", "executionTestCaseId", "id", "name", "status", "updatedAt") SELECT "comments", "createdAt", "executionTestCaseId", "id", "name", "status", "updatedAt" FROM "Scenario";
DROP TABLE "Scenario";
ALTER TABLE "new_Scenario" RENAME TO "Scenario";
CREATE TABLE "new_Suite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jiraKey" TEXT,
    "title" TEXT NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Suite" ("createdAt", "id", "jiraKey", "title", "updatedAt") SELECT "createdAt", "id", "jiraKey", "title", "updatedAt" FROM "Suite";
DROP TABLE "Suite";
ALTER TABLE "new_Suite" RENAME TO "Suite";
CREATE UNIQUE INDEX "Suite_jiraKey_key" ON "Suite"("jiraKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
