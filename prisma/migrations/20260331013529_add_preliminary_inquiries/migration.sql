-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "followUpNotes" TEXT,
ADD COLUMN     "followUpOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followUpStatus" TEXT,
ADD COLUMN     "hasPendingFollowUp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateTable
CREATE TABLE "PreliminaryInquiry" (
    "id" TEXT NOT NULL,
    "inquiryNumber" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "complainantName" TEXT,
    "complainantEmail" TEXT,
    "complainantPhone" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "convertedCaseId" TEXT,
    "responseMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreliminaryInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreliminaryInquiry_inquiryNumber_key" ON "PreliminaryInquiry"("inquiryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PreliminaryInquiry_convertedCaseId_key" ON "PreliminaryInquiry"("convertedCaseId");

-- CreateIndex
CREATE INDEX "PreliminaryInquiry_source_idx" ON "PreliminaryInquiry"("source");

-- CreateIndex
CREATE INDEX "PreliminaryInquiry_status_idx" ON "PreliminaryInquiry"("status");

-- CreateIndex
CREATE INDEX "PreliminaryInquiry_inquiryNumber_idx" ON "PreliminaryInquiry"("inquiryNumber");

-- CreateIndex
CREATE INDEX "PreliminaryInquiry_assignedToId_idx" ON "PreliminaryInquiry"("assignedToId");

-- AddForeignKey
ALTER TABLE "PreliminaryInquiry" ADD CONSTRAINT "PreliminaryInquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreliminaryInquiry" ADD CONSTRAINT "PreliminaryInquiry_convertedCaseId_fkey" FOREIGN KEY ("convertedCaseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
