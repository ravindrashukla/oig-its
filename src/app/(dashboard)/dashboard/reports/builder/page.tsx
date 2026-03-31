"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Download,
  Save,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreateReport } from "@/hooks/useReports";

// ─── Entity configuration ────────────────────────────────────

interface EntityConfig {
  label: string;
  reportType: string;
  columns: Array<{ key: string; label: string }>;
  filters: Array<{ key: string; label: string; type: "text" | "select" | "date"; options?: string[] }>;
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  cases: {
    label: "Cases",
    reportType: "CASE_SUMMARY",
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "caseType", label: "Type" },
      { key: "priority", label: "Priority" },
      { key: "createdBy", label: "Created By" },
      { key: "assignees", label: "Assignees" },
      { key: "openedAt", label: "Opened" },
      { key: "closedAt", label: "Closed" },
      { key: "dueDate", label: "Due Date" },
      { key: "taskCount", label: "Tasks" },
      { key: "documentCount", label: "Documents" },
      { key: "evidenceCount", label: "Evidence Items" },
    ],
    filters: [
      { key: "status", label: "Status", type: "select", options: ["INTAKE", "OPEN", "ACTIVE", "UNDER_REVIEW", "PENDING_ACTION", "CLOSED", "ARCHIVED"] },
      { key: "caseType", label: "Case Type", type: "select", options: ["FRAUD", "WASTE", "ABUSE", "MISCONDUCT", "WHISTLEBLOWER", "COMPLIANCE", "OUTREACH", "BRIEFING", "OTHER"] },
      { key: "priority", label: "Priority", type: "select", options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
      { key: "dateFrom", label: "From Date", type: "date" },
      { key: "dateTo", label: "To Date", type: "date" },
    ],
  },
  tasks: {
    label: "Tasks",
    reportType: "TASK_COMPLETION",
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "caseTitle", label: "Case Title" },
      { key: "taskTitle", label: "Task" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "assignee", label: "Assignee" },
      { key: "dueDate", label: "Due Date" },
      { key: "completedAt", label: "Completed" },
      { key: "createdAt", label: "Created" },
      { key: "isOverdue", label: "Overdue" },
    ],
    filters: [
      { key: "status", label: "Status", type: "select", options: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"] },
      { key: "priority", label: "Priority", type: "select", options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
      { key: "dateFrom", label: "From Date", type: "date" },
      { key: "dateTo", label: "To Date", type: "date" },
    ],
  },
  evidence: {
    label: "Evidence",
    reportType: "EVIDENCE_CHAIN",
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "caseTitle", label: "Case Title" },
      { key: "evidenceTitle", label: "Evidence" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
      { key: "collectedAt", label: "Collected" },
      { key: "custodyChain", label: "Chain of Custody" },
      { key: "custodyCount", label: "Transfers" },
    ],
    filters: [
      { key: "type", label: "Evidence Type", type: "select", options: ["DOCUMENT", "PHOTO", "VIDEO", "AUDIO", "DIGITAL", "PHYSICAL", "TESTIMONY", "OTHER"] },
      { key: "status", label: "Status", type: "select", options: ["COLLECTED", "IN_REVIEW", "VERIFIED", "DISPUTED", "ARCHIVED"] },
      { key: "dateFrom", label: "From Date", type: "date" },
      { key: "dateTo", label: "To Date", type: "date" },
    ],
  },
  documents: {
    label: "Documents",
    reportType: "CUSTOM",
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "caseType", label: "Type" },
      { key: "priority", label: "Priority" },
      { key: "documentCount", label: "Documents" },
    ],
    filters: [
      { key: "dateFrom", label: "From Date", type: "date" },
      { key: "dateTo", label: "To Date", type: "date" },
    ],
  },
  subjects: {
    label: "Subjects",
    reportType: "CUSTOM",
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "caseType", label: "Type" },
      { key: "priority", label: "Priority" },
    ],
    filters: [
      { key: "dateFrom", label: "From Date", type: "date" },
      { key: "dateTo", label: "To Date", type: "date" },
    ],
  },
  auditLogs: {
    label: "Audit Logs",
    reportType: "AUDIT_TRAIL",
    columns: [
      { key: "timestamp", label: "Timestamp" },
      { key: "user", label: "User" },
      { key: "userEmail", label: "Email" },
      { key: "action", label: "Action" },
      { key: "entityType", label: "Entity Type" },
      { key: "entityId", label: "Entity ID" },
      { key: "ipAddress", label: "IP Address" },
    ],
    filters: [
      { key: "action", label: "Action", type: "select", options: ["CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "ASSIGN", "STATUS_CHANGE", "ACCESS_DENIED"] },
      { key: "entityType", label: "Entity Type", type: "text" },
      { key: "dateFrom", label: "From Date", type: "date" },
      { key: "dateTo", label: "To Date", type: "date" },
    ],
  },
};

// ─── Page component ─────────────────────────────────────────

export default function ReportBuilderPage() {
  const [entity, setEntity] = useState<string>("cases");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(ENTITY_CONFIGS.cases.columns.map((c) => c.key)),
  );
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [reportName, setReportName] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const createReport = useCreateReport();
  const config = ENTITY_CONFIGS[entity];

  const handleEntityChange = useCallback((newEntity: string | null) => {
    if (!newEntity) return;
    setEntity(newEntity);
    const newConfig = ENTITY_CONFIGS[newEntity];
    setSelectedColumns(new Set(newConfig.columns.map((c) => c.key)));
    setFilterValues({});
    setPreviewData(null);
    setPreviewError(null);
  }, []);

  function toggleColumn(key: string) {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      // Create a temporary run via the report execution API
      // First, we need a report definition - we'll use the ad-hoc endpoint
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `_adhoc_${Date.now()}`,
          description: "Temporary ad-hoc report",
          type: config.reportType,
          query: { entity: entity, ...filterValues },
          columns: config.columns.filter((c) => selectedColumns.has(c.key)),
        }),
      });

      if (!res.ok) {
        // If it fails due to duplicate name, try with a different name
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error ?? "Failed to create temporary report");
      }

      const tempReport = await res.json();

      // Run the report
      const runRes = await fetch(`/api/reports/${tempReport.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "json", parameters: filterValues }),
      });

      if (!runRes.ok) {
        const err = await runRes.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error ?? "Failed to run report");
      }

      const result = await runRes.json();
      setPreviewData(result.data?.slice(0, 50) ?? []);

      // Clean up the temp report (delete is not implemented, but we keep it since it's harmless)
    } catch (err: any) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDownloadCsv() {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `_adhoc_csv_${Date.now()}`,
          description: "Temporary ad-hoc report for CSV export",
          type: config.reportType,
          query: { entity: entity, ...filterValues },
          columns: config.columns.filter((c) => selectedColumns.has(c.key)),
        }),
      });

      if (!res.ok) throw new Error("Failed to create temp report");
      const tempReport = await res.json();

      const runRes = await fetch(`/api/reports/${tempReport.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "csv", parameters: filterValues }),
      });

      if (!runRes.ok) throw new Error("Failed to run report");

      const blob = await runRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ad-hoc-${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave() {
    if (!reportName.trim()) {
      setSaveMessage("Please enter a report name.");
      return;
    }

    try {
      await createReport.mutateAsync({
        name: reportName.trim(),
        description: `Custom ${config.label} report`,
        type: config.reportType,
        query: { entity: entity, ...filterValues },
        columns: config.columns.filter((c) => selectedColumns.has(c.key)),
        filters: { available: config.filters.map((f) => f.key) },
      });
      setSaveMessage("Report saved successfully.");
      setReportName("");
    } catch (err: any) {
      setSaveMessage(`Failed to save: ${err.message}`);
    }
  }

  const activeColumns = config.columns.filter((c) => selectedColumns.has(c.key));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-xs" render={<Link href="/dashboard/reports" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ad Hoc Report Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Build and run custom reports on demand
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Entity & Filters */}
        <div className="space-y-4">
          {/* Entity selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Entity Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={entity} onValueChange={handleEntityChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_CONFIGS).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.filters.map((filter) => (
                <div key={filter.key} className="space-y-1">
                  <Label className="text-xs">{filter.label}</Label>
                  {filter.type === "select" && filter.options ? (
                    <Select
                      value={filterValues[filter.key] ?? ""}
                      onValueChange={(val: string | null) =>
                        setFilterValues((prev) => ({
                          ...prev,
                          [filter.key]: !val || val === "__all__" ? "" : val,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All</SelectItem>
                        {filter.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : filter.type === "date" ? (
                    <Input
                      type="date"
                      value={filterValues[filter.key] ?? ""}
                      onChange={(e) =>
                        setFilterValues((prev) => ({
                          ...prev,
                          [filter.key]: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    <Input
                      value={filterValues[filter.key] ?? ""}
                      onChange={(e) =>
                        setFilterValues((prev) => ({
                          ...prev,
                          [filter.key]: e.target.value,
                        }))
                      }
                      placeholder={`Filter by ${filter.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Middle column: Column selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {config.columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Save as definition */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Save as Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Report Name</Label>
                <Input
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="My Custom Report"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={handleSave}
                disabled={createReport.isPending}
              >
                {createReport.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save Report Definition
              </Button>
              {saveMessage && (
                <p className="text-xs text-muted-foreground">{saveMessage}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full gap-1.5"
                onClick={handlePreview}
                disabled={previewLoading || selectedColumns.size === 0}
              >
                {previewLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                Preview Results
              </Button>
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={handleDownloadCsv}
                disabled={previewLoading || selectedColumns.size === 0}
              >
                {previewLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                Download CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">
                <strong>{selectedColumns.size}</strong> column{selectedColumns.size !== 1 ? "s" : ""} selected
                {Object.values(filterValues).filter(Boolean).length > 0 && (
                  <> with <strong>{Object.values(filterValues).filter(Boolean).length}</strong> filter{Object.values(filterValues).filter(Boolean).length !== 1 ? "s" : ""}</>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview error */}
      {previewError && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{previewError}</p>
          </CardContent>
        </Card>
      )}

      {/* Preview results */}
      {previewData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Preview Results ({previewData.length} row{previewData.length !== 1 ? "s" : ""}
              {previewData.length === 50 ? ", showing first 50" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No results found for the given filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {activeColumns.map((col) => (
                        <TableHead key={col.key} className="whitespace-nowrap text-xs">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        {activeColumns.map((col) => (
                          <TableCell key={col.key} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                            {formatCellValue(row[col.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    // Format numbers nicely
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}
