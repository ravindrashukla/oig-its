"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FileBarChart,
  FileText,
  Download,
  Play,
  Plus,
  Loader2,
  DatabaseZap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useReportDefinitions,
  useRunReport,
  downloadReportCsv,
  useSeedDefaultReports,
  type ReportDefinition,
} from "@/hooks/useReports";

// ─── Report type display config ─────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; category: string }> = {
  CASE_SUMMARY: { label: "Case Summary", category: "Cases" },
  INVESTIGATION_ACTIVITY: { label: "Investigation Activity", category: "Investigations" },
  TASK_COMPLETION: { label: "Task Completion", category: "Tasks" },
  EVIDENCE_CHAIN: { label: "Evidence Chain", category: "Evidence" },
  AUDIT_TRAIL: { label: "Audit Trail", category: "Compliance" },
  FINANCIAL: { label: "Financial", category: "Finance" },
  SEMIANNUAL: { label: "Semiannual", category: "Congressional" },
  CUSTOM: { label: "Custom", category: "Custom" },
};

function getReportType(report: ReportDefinition): string {
  return (report.query?._reportType as string) ?? "CUSTOM";
}

// ─── Page component ─────────────────────────────────────────

export default function ReportsPage() {
  useEffect(() => { document.title = "Reports | OIG-ITS"; }, []);
  const { data: session } = useSession();
  const { data: reportData, isLoading, error } = useReportDefinitions();
  const seedMutation = useSeedDefaultReports();
  const runMutation = useRunReport();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reports = reportData?.data ?? [];
  const isAdmin = session?.user?.role === "ADMIN";

  async function handleRunReport(report: ReportDefinition) {
    setRunningId(report.id);
    try {
      const result = await runMutation.mutateAsync({
        reportId: report.id,
        format: "json",
      });
      // Download the JSON result
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // error is available via runMutation.error
    } finally {
      setRunningId(null);
    }
  }

  async function handleDownloadCsv(report: ReportDefinition) {
    setDownloadingId(report.id);
    try {
      await downloadReportCsv(report.id, report.name);
    } catch {
      // silently fail for now
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate and download investigation reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <DatabaseZap className="mr-1.5 size-3.5" />
              )}
              Seed Default Reports
            </Button>
          )}
          <Button size="sm" render={<Link href="/dashboard/reports/builder" />}>
            <Plus className="mr-1.5 size-3.5" />
            Ad Hoc Report
          </Button>
        </div>
      </div>

      {/* Seed result message */}
      {seedMutation.isSuccess && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">
              {seedMutation.data.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-destructive text-center">
              Failed to load reports: {error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Report cards */}
      {!isLoading && reports.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const reportType = getReportType(report);
            const config = TYPE_CONFIG[reportType] ?? TYPE_CONFIG.CUSTOM;
            const isRunning = runningId === report.id;
            const isDownloading = downloadingId === report.id;

            return (
              <Card key={report.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-sm font-medium">
                        {report.name}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {config.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    {report.description ?? "No description."}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {report._count.runs} run{report._count.runs !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleDownloadCsv(report)}
                        disabled={isDownloading || isRunning}
                      >
                        {isDownloading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleRunReport(report)}
                        disabled={isRunning || isDownloading}
                      >
                        {isRunning ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Play className="size-3.5" />
                        )}
                        Run
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && reports.length === 0 && !error && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <FileBarChart className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No reports defined yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAdmin
                    ? 'Click "Seed Default Reports" to create the standard report templates, or create a custom report.'
                    : "Contact an administrator to set up report definitions."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
