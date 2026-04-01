-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "aiCategory" TEXT,
ADD COLUMN     "aiTags" TEXT;

-- AlterTable
ALTER TABLE "PreliminaryInquiry" ADD COLUMN     "riskFactors" JSONB,
ADD COLUMN     "riskScore" INTEGER;
