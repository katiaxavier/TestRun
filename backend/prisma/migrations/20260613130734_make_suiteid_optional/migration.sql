-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Execution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "suiteId" TEXT,
    "batchId" TEXT,
    "sprint" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "testedFeature" TEXT,
    "responsible" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Execution_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "Suite" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Execution_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ExecutionBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Execution" ("batchId", "createdAt", "endDate", "id", "responsible", "sprint", "startDate", "status", "suiteId", "testedFeature", "updatedAt", "version") SELECT "batchId", "createdAt", "endDate", "id", "responsible", "sprint", "startDate", "status", "suiteId", "testedFeature", "updatedAt", "version" FROM "Execution";
DROP TABLE "Execution";
ALTER TABLE "new_Execution" RENAME TO "Execution";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
