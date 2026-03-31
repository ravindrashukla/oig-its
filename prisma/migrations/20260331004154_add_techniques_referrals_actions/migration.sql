-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "affectedProgram" TEXT,
ADD COLUMN     "complaintSource" TEXT,
ADD COLUMN     "crimeType" TEXT,
ADD COLUMN     "investigationApproach" TEXT,
ADD COLUMN     "suspectType" TEXT;

-- CreateTable
CREATE TABLE "InvestigativeTechnique" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "authorizedBy" TEXT,
    "findings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigativeTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "agencyType" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectAction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestigativeTechnique_caseId_idx" ON "InvestigativeTechnique"("caseId");

-- CreateIndex
CREATE INDEX "InvestigativeTechnique_type_idx" ON "InvestigativeTechnique"("type");

-- CreateIndex
CREATE INDEX "Referral_caseId_idx" ON "Referral"("caseId");

-- CreateIndex
CREATE INDEX "SubjectAction_caseId_idx" ON "SubjectAction"("caseId");

-- CreateIndex
CREATE INDEX "SubjectAction_subjectId_idx" ON "SubjectAction"("subjectId");

-- AddForeignKey
ALTER TABLE "InvestigativeTechnique" ADD CONSTRAINT "InvestigativeTechnique_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAction" ADD CONSTRAINT "SubjectAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAction" ADD CONSTRAINT "SubjectAction_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
