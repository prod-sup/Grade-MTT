-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERACIONAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Handicap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "country" TEXT NOT NULL,
    "currencyLabel" TEXT,
    "multiplier" REAL NOT NULL DEFAULT 1.0,
    "utcOffset" REAL NOT NULL DEFAULT -3,
    "timezoneLabel" TEXT NOT NULL DEFAULT 'GMT-3',
    "ianaTimezone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateTable
CREATE TABLE "AccessLogs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "club" TEXT,
    "timezoneLabel" TEXT,
    "handicapId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessLogs_handicapId_fkey" FOREIGN KEY ("handicapId") REFERENCES "Handicap" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Handicap_country_key" ON "Handicap"("country");

-- CreateIndex
CREATE INDEX "Handicap_active_idx" ON "Handicap"("active");

-- CreateIndex
CREATE INDEX "Tournament_dayOrder_startTime_idx" ON "Tournament"("dayOrder", "startTime");

-- CreateIndex
CREATE INDEX "Tournament_type_idx" ON "Tournament"("type");

-- CreateIndex
CREATE INDEX "Tournament_category_idx" ON "Tournament"("category");

-- CreateIndex
CREATE INDEX "Tournament_visible_idx" ON "Tournament"("visible");

-- CreateIndex
CREATE INDEX "AccessLogs_email_idx" ON "AccessLogs"("email");

-- CreateIndex
CREATE INDEX "AccessLogs_handicapId_idx" ON "AccessLogs"("handicapId");
