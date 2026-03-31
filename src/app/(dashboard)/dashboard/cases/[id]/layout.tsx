"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCase } from "@/hooks/useCase";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { PriorityBadge } from "@/components/cases/PriorityBadge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Tab {
  label: string;
  href: string;
}

function getTabs(caseId: string): Tab[] {
  const base = `/dashboard/cases/${caseId}`;
  return [
    { label: "Overview", href: base },
    { label: "Documents", href: `${base}/documents` },
    { label: "Evidence", href: `${base}/evidence` },
    { label: "Tasks", href: `${base}/tasks` },
    { label: "Subjects", href: `${base}/subjects` },
    { label: "Violations", href: `${base}/violations` },
    { label: "Financial", href: `${base}/financial` },
    { label: "Techniques", href: `${base}/techniques` },
    { label: "Referrals", href: `${base}/referrals` },
    { label: "Timeline", href: `${base}/timeline` },
  ];
}

export default function CaseDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const pathname = usePathname();
  const { data: caseData, isLoading } = useCase(caseId);

  const tabs = getTabs(caseId);

  return (
    <div className="space-y-4">
      {/* Case header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/cases">
          <Button variant="ghost" size="icon-sm" className="mt-0.5">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : caseData ? (
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <FolderOpen className="size-5 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">
                  {caseData.caseNumber}
                </span>
                <CaseStatusBadge status={caseData.status} />
                <PriorityBadge priority={caseData.priority} />
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight truncate">
                {caseData.title}
              </h1>
            </div>
          ) : (
            <h1 className="text-xl font-semibold tracking-tight text-destructive">
              Case not found
            </h1>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Case tabs">
          {tabs.map((tab) => {
            const isActive =
              tab.href === `/dashboard/cases/${caseId}`
                ? pathname === tab.href
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>{children}</div>
    </div>
  );
}
