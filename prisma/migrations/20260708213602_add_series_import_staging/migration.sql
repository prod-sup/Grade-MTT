-- CreateTable
CREATE TABLE "SeriesImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriesName" TEXT NOT NULL,
    "filename" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);

-- CreateTable
CREATE TABLE "SeriesImportRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "dayOrder" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "type" TEXT NOT NULL,
    "gtd" REAL,
    "buyIn" REAL,
    "status" TEXT NOT NULL,
    "matchBaseId" TEXT,
    "reviewNote" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "payload" TEXT NOT NULL,
    CONSTRAINT "SeriesImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "SeriesImport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SeriesImport_createdAt_idx" ON "SeriesImport"("createdAt");

-- CreateIndex
CREATE INDEX "SeriesImportRow_importId_rowIndex_idx" ON "SeriesImportRow"("importId", "rowIndex");

-- CreateIndex
CREATE INDEX "SeriesImportRow_importId_resolved_idx" ON "SeriesImportRow"("importId", "resolved");
