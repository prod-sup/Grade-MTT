-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventDate" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "dayOfWeek" TEXT NOT NULL,
    "dayOrder" INTEGER NOT NULL DEFAULT 0,
    "startTime" TEXT NOT NULL,
    "startFraction" REAL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "type" TEXT NOT NULL,
    "gameType" TEXT,
    "koType" TEXT,
    "gtd" REAL,
    "buyIn" REAL,
    "fee" REAL,
    "adminFee" REAL,
    "reentry" REAL,
    "addon" REAL,
    "ticketAward" TEXT,
    "personalizedAward" TEXT,
    "payout" TEXT,
    "calculatedPayout" TEXT,
    "sizeBuyIn" TEXT,
    "action" REAL,
    "maxTable" INTEGER,
    "structure" TEXT,
    "stackInicial" INTEGER,
    "stackReentry" INTEGER,
    "stackAddon" TEXT,
    "rebuyCondition" TEXT,
    "blindsEarly" INTEGER,
    "blindsPostLateReg" INTEGER,
    "blindsFinalTable" INTEGER,
    "breakLateReg" TEXT,
    "lateRegLevels" INTEGER,
    "lateRegTime" TEXT,
    "numPlayers" TEXT,
    "earlyBird" TEXT,
    "chat" TEXT,
    "timeBank" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GRADE',
    "seriesName" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tournament" ("action", "addon", "adminFee", "blindsEarly", "blindsFinalTable", "blindsPostLateReg", "breakLateReg", "buyIn", "calculatedPayout", "category", "chat", "createdAt", "dayOfWeek", "dayOrder", "earlyBird", "featured", "fee", "gameType", "gtd", "id", "koType", "lateRegLevels", "lateRegTime", "maxTable", "name", "numPlayers", "payout", "personalizedAward", "rebuyCondition", "reentry", "seriesName", "shortName", "sizeBuyIn", "sourceRow", "sourceSheet", "stackAddon", "stackInicial", "stackReentry", "startFraction", "startTime", "structure", "ticketAward", "timeBank", "type", "updatedAt", "visible") SELECT "action", "addon", "adminFee", "blindsEarly", "blindsFinalTable", "blindsPostLateReg", "breakLateReg", "buyIn", "calculatedPayout", "category", "chat", "createdAt", "dayOfWeek", "dayOrder", "earlyBird", "featured", "fee", "gameType", "gtd", "id", "koType", "lateRegLevels", "lateRegTime", "maxTable", "name", "numPlayers", "payout", "personalizedAward", "rebuyCondition", "reentry", "seriesName", "shortName", "sizeBuyIn", "sourceRow", "sourceSheet", "stackAddon", "stackInicial", "stackReentry", "startFraction", "startTime", "structure", "ticketAward", "timeBank", "type", "updatedAt", "visible" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE INDEX "Tournament_eventDate_idx" ON "Tournament"("eventDate");
CREATE INDEX "Tournament_archived_idx" ON "Tournament"("archived");
CREATE INDEX "Tournament_dayOrder_startTime_idx" ON "Tournament"("dayOrder", "startTime");
CREATE INDEX "Tournament_type_idx" ON "Tournament"("type");
CREATE INDEX "Tournament_category_idx" ON "Tournament"("category");
CREATE INDEX "Tournament_visible_idx" ON "Tournament"("visible");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
