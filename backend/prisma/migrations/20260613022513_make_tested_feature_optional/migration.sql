-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExecutionBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "suiteIds" JSONB NOT NULL,
    "sprint" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "testedFeature" TEXT,
    "responsible" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ExecutionBatch" ("createdAt", "endDate", "id", "name", "responsible", "sprint", "startDate", "status", "suiteIds", "testedFeature", "updatedAt", "version") SELECT "createdAt", "endDate", "id", "name", "responsible", "sprint", "startDate", "status", "suiteIds", "testedFeature", "updatedAt", "version" FROM "ExecutionBatch";
DROP TABLE "ExecutionBatch";
ALTER TABLE "new_ExecutionBatch" RENAME TO "ExecutionBatch";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
