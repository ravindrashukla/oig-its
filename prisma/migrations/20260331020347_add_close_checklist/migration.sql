-- CreateTable
CREATE TABLE "CloseChecklist" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CloseChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CloseChecklist_caseId_idx" ON "CloseChecklist"("caseId");

-- AddForeignKey
ALTER TABLE "CloseChecklist" ADD CONSTRAINT "CloseChecklist_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloseChecklist" ADD CONSTRAINT "CloseChecklist_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
