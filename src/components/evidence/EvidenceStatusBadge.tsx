"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { EvidenceStatus } from "@/generated/prisma";

const statusConfig: Record<EvidenceStatus, { label: string; className: string }> = {
  COLLECTED: {
    label: "Collected",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  IN_REVIEW: {
    label: "In Review",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  VERIFIED: {
    label: "Verified",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  DISPUTED: {
    label: "Disputed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

interface EvidenceStatusBadgeProps {
  status: EvidenceStatus;
}

export function EvidenceStatusBadge({ status }: EvidenceStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 border-transparent font-medium", config.className)}
    >
      {config.label}
    </Badge>
  );
}
