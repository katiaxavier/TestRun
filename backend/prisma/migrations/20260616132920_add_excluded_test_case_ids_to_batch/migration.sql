-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExecutionBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "suiteIds" JSONB NOT NULL,
    "testedFeature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "excludedTestCaseIds" JSONB NOT NULL DEFAULT [],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ExecutionBatch" ("createdAt", "id", "name", "status", "suiteIds", "testedFeature", "updatedAt") SELECT "createdAt", "id", "name", "status", "suiteIds", "testedFeature", "updatedAt" FROM "ExecutionBatch";
DROP TABLE "ExecutionBatch";
ALTER TABLE "new_ExecutionBatch" RENAME TO "ExecutionBatch";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
