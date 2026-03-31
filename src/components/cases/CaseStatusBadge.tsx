import { Badge } from "@/components/ui/badge";
import { CaseStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<CaseStatus, { label: string; className: string }> = {
  [CaseStatus.INTAKE]: {
    label: "Intake",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  [CaseStatus.OPEN]: {
    label: "Open",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  [CaseStatus.ACTIVE]: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  [CaseStatus.UNDER_REVIEW]: {
    label: "Under Review",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  [CaseStatus.PENDING_ACTION]: {
    label: "Pending Action",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  [CaseStatus.CLOSED]: {
    label: "Closed",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  [CaseStatus.ARCHIVED]: {
    label: "Archived",
    className: "bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500",
  },
};

interface CaseStatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

export function CaseStatusBadge({ status, className }: CaseStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
