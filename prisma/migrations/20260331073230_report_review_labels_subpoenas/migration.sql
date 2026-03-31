-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "subjectId" TEXT;

-- AlterTable
ALTER TABLE "EvidenceItem" ADD COLUMN     "exhibitNumber" TEXT;

-- AlterTable
ALTER TABLE "TrainingAssignment" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "bookingStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "purchaseOrderNumber" TEXT;

-- AlterTable
ALTER TABLE "TrainingCourse" ADD COLUMN     "cost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TrainingRecord" ADD COLUMN     "cost" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ReportReview" (
    "id" TEXT NOT NULL,
    "reportRunId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "comments" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldLabel" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "customLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FieldLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubpoenaPackage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedTo" TEXT,
    "issuedDate" TIMESTAMP(3),
    "returnDate" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "documentIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubpoenaPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEvaluation" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportReview_reportRunId_idx" ON "ReportReview"("reportRunId");

-- CreateIndex
CREATE INDEX "ReportReview_submittedById_idx" ON "ReportReview"("submittedById");

-- CreateIndex
CREATE INDEX "ReportReview_status_idx" ON "ReportReview"("status");

-- CreateIndex
CREATE INDEX "FieldLabel_entityType_idx" ON "FieldLabel"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "FieldLabel_entityType_fieldName_key" ON "FieldLabel"("entityType", "fieldName");

-- CreateIndex
CREATE INDEX "SubpoenaPackage_caseId_idx" ON "SubpoenaPackage"("caseId");

-- CreateIndex
CREATE INDEX "SubpoenaPackage_status_idx" ON "SubpoenaPackage"("status");

-- CreateIndex
CREATE INDEX "CourseEvaluation_courseId_idx" ON "CourseEvaluation"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEvaluation_courseId_userId_key" ON "CourseEvaluation"("courseId", "userId");

-- CreateIndex
CREATE INDEX "Document_subjectId_idx" ON "Document"("subjectId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportReview" ADD CONSTRAINT "ReportReview_reportRunId_fkey" FOREIGN KEY ("reportRunId") REFERENCES "ReportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportReview" ADD CONSTRAINT "ReportReview_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportReview" ADD CONSTRAINT "ReportReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubpoenaPackage" ADD CONSTRAINT "SubpoenaPackage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubpoenaPackage" ADD CONSTRAINT "SubpoenaPackage_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEvaluation" ADD CONSTRAINT "CourseEvaluation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEvaluation" ADD CONSTRAINT "CourseEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
