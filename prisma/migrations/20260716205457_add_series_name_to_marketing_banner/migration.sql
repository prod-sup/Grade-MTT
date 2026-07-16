-- AlterTable
ALTER TABLE "MarketingBanner" ADD COLUMN "seriesName" TEXT;

-- CreateIndex
CREATE INDEX "MarketingBanner_seriesName_idx" ON "MarketingBanner"("seriesName");
