"use client";

import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileGeneric,
  Download,
  MessageSquare,
  Eye,
  History,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getDocumentDownloadUrl } from "@/hooks/useDocuments";
import type { Document, DocumentStatus } from "@/generated/prisma";

type DocumentWithCounts = Document & {
  _count: { comments: number; accessLogs: number };
};

interface DocumentCardProps {
  document: DocumentWithCounts;
  caseId: string;
}

const statusConfig: Record<DocumentStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  UPLOADED: {
    label: "Uploaded",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  REVIEWED: {
    label: "Reviewed",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  REDACTED: {
    label: "Redacted",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf" || mimeType.includes("word")) {
    return FileText;
  }
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType === "text/csv") {
    return FileSpreadsheet;
  }
  if (mimeType.startsWith("image/")) {
    return FileImage;
  }
  return FileGeneric;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentCard({ document: doc, caseId }: DocumentCardProps) {
  const Icon = getFileIcon(doc.mimeType);
  const status = statusConfig[doc.status];
  const downloadUrl = getDocumentDownloadUrl(caseId, doc.id);

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="size-5 shrink-0 text-muted-foreground" />
            <CardTitle className="truncate text-sm">{doc.title}</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 border-transparent font-medium", status.className)}
          >
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="truncate">{doc.fileName}</p>
          <p>
            {formatSize(doc.fileSize)} ·{" "}
            {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
          </p>
          {doc.version > 1 && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                v{doc.version}
              </Badge>
              {doc.previousVersionId && (
                <span className="flex items-center gap-0.5 text-muted-foreground cursor-pointer hover:text-foreground">
                  <History className="size-3" />
                  Version history
                </span>
              )}
            </div>
          )}
          {doc.version === 1 && doc.version !== undefined && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              v1
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Tooltip>
            <TooltipTrigger>
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3" />
                {doc._count.comments}
              </span>
            </TooltipTrigger>
            <TooltipContent>Comments</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <span className="flex items-center gap-1">
                <Eye className="size-3" />
                {doc._count.accessLogs}
              </span>
            </TooltipTrigger>
            <TooltipContent>Views</TooltipContent>
          </Tooltip>
        </div>

        <a href={downloadUrl} download>
          <Button variant="ghost" size="icon-xs">
            <Download className="size-3.5" />
          </Button>
        </a>
      </CardFooter>
    </Card>
  );
}
