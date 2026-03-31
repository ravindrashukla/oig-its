-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseType" ADD VALUE 'OUTREACH';
ALTER TYPE "CaseType" ADD VALUE 'BRIEFING';

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "jurisdiction" TEXT,
ADD COLUMN     "leadAgency" TEXT,
ADD COLUMN     "partnerAgencies" TEXT;

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "caseId" DROP NOT NULL;
