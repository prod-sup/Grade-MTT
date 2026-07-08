-- AlterTable
ALTER TABLE "AccessLogs" ADD COLUMN "phone" TEXT;

-- CreateTable
CREATE TABLE "MarketingBanner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "MarketingBanner_type_idx" ON "MarketingBanner"("type");

-- CreateIndex
CREATE INDEX "MarketingBanner_active_idx" ON "MarketingBanner"("active");
