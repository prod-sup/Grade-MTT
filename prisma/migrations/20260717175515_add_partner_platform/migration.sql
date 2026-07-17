-- CreateTable
CREATE TABLE "PartnerAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "contactName" TEXT NOT NULL,
    "clubName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PartnerInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "invitedBy" TEXT,
    "partnerAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerInvite_partnerAccountId_fkey" FOREIGN KEY ("partnerAccountId") REFERENCES "PartnerAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerPasswordReset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "partnerAccountId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerPasswordReset_partnerAccountId_fkey" FOREIGN KEY ("partnerAccountId") REFERENCES "PartnerAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerAccountId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "watermarkUrl" TEXT,
    "phoneText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandSettings_partnerAccountId_fkey" FOREIGN KEY ("partnerAccountId") REFERENCES "PartnerAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAccount_email_key" ON "PartnerAccount"("email");

-- CreateIndex
CREATE INDEX "PartnerAccount_active_idx" ON "PartnerAccount"("active");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerInvite_token_key" ON "PartnerInvite"("token");

-- CreateIndex
CREATE INDEX "PartnerInvite_email_idx" ON "PartnerInvite"("email");

-- CreateIndex
CREATE INDEX "PartnerInvite_expiresAt_idx" ON "PartnerInvite"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPasswordReset_token_key" ON "PartnerPasswordReset"("token");

-- CreateIndex
CREATE INDEX "PartnerPasswordReset_partnerAccountId_idx" ON "PartnerPasswordReset"("partnerAccountId");

-- CreateIndex
CREATE INDEX "PartnerPasswordReset_expiresAt_idx" ON "PartnerPasswordReset"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandSettings_partnerAccountId_key" ON "BrandSettings"("partnerAccountId");

-- CreateIndex
CREATE INDEX "BrandSettings_status_idx" ON "BrandSettings"("status");
