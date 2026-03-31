"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentBrowser } from "@/components/documents/DocumentBrowser";

export default function CaseDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/cases/${caseId}`}>
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold tracking-tight">
                Case Documents
              </h1>
            </div>
          </div>
        </div>

        <Separator />

        {/* Upload section */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Upload Documents
          </h2>
          <DocumentUploader caseId={caseId} />
        </section>

        <Separator />

        {/* Browse section */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            All Documents
          </h2>
          <DocumentBrowser caseId={caseId} />
        </section>
      </div>
    </TooltipProvider>
  );
}
