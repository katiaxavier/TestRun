-- AlterTable
ALTER TABLE "Suite" ADD COLUMN "manualKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Suite_manualKey_key" ON "Suite"("manualKey");
