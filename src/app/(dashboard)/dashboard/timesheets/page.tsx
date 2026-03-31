"use client";

import { useState, useCallback } from "react";
import {
  Clock,
  Plus,
  Search,
  X,
  SlidersHorizontal,
  Check,
  XCircle,
  Send,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";

import {
  useTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useTimesheets,
  useCreateTimesheet,
  useUpdateTimesheet,
} from "@/hooks/useTimeTracking";
import type {
  TimeEntryFilters,
  TimesheetFilters,
  TimeEntryWithRelations,
  TimesheetWithRelations,
} from "@/hooks/useTimeTracking";
import {
  DataTable,
  type ColumnDef,
  type SortState,
  type PaginationState,
} from "@/components/ui/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Extended type for computed fields ──────────────────────

interface TimesheetWithComputed extends TimesheetWithRelations {
  regularHours?: number;
  availabilityPay?: number;
  substantialHours?: boolean;
}

// ─── Constants ───────────────────────────────────────────────

const ACTIVITY_TYPES = [
  "CASE_WORK",
  "TRAINING",
  "ADMIN",
  "TRAVEL",
  "OVERTIME",
  "UNDERCOVER",
  "COURT",
  "LEAVE",
  "OTHER",
] as const;

const TIME_ENTRY_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const;

function enumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusVariant(status: string) {
  switch (status) {
    case "APPROVED":
      return "default" as const;
    case "SUBMITTED":
      return "secondary" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

// ─── Time Entry columns ──────────────────────────────────────

const timeEntryColumns: ColumnDef<TimeEntryWithRelations>[] = [
  {
    id: "date",
    header: "Date",
    accessorKey: "date",
    sortable: true,
    className: "w-[110px]",
    cell: (row) => (
      <span className="text-sm">
        {format(new Date(row.date), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "activityType",
    header: "Activity",
    accessorKey: "activityType",
    sortable: true,
    className: "w-[140px]",
    cell: (row) => (
      <Badge variant="outline" className="font-normal">
        {enumLabel(row.activityType)}
      </Badge>
    ),
  },
  {
    id: "case",
    header: "Case",
    sortable: false,
    className: "w-[140px]",
    cell: (row) =>
      row.case ? (
        <span className="text-xs font-mono text-muted-foreground">
          {row.case.caseNumber}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">--</span>
      ),
  },
  {
    id: "description",
    header: "Description",
    sortable: false,
    cell: (row) => (
      <span className="text-sm truncate max-w-[200px] block">
        {row.description || "--"}
      </span>
    ),
  },
  {
    id: "hours",
    header: "Hours",
    accessorKey: "hours",
    sortable: true,
    className: "w-[80px]",
    cell: (row) => (
      <span className="text-sm font-medium">{row.hours.toFixed(1)}</span>
    ),
  },
  {
    id: "overtime",
    header: "OT",
    sortable: false,
    className: "w-[60px]",
    cell: (row) =>
      row.isOvertime ? (
        <Check className="size-4 text-orange-500" />
      ) : (
        <span className="text-xs text-muted-foreground">--</span>
      ),
  },
  {
    id: "leap",
    header: "LEAP",
    sortable: false,
    className: "w-[60px]",
    cell: (row) =>
      row.isLeap ? (
        <Check className="size-4 text-blue-500" />
      ) : (
        <span className="text-xs text-muted-foreground">--</span>
      ),
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    sortable: true,
    className: "w-[110px]",
    cell: (row) => (
      <Badge variant={statusVariant(row.status)}>{enumLabel(row.status)}</Badge>
    ),
  },
];

// ─── Timesheet columns ───────────────────────────────────────

const timesheetColumns: ColumnDef<TimesheetWithRelations>[] = [
  {
    id: "period",
    header: "Period",
    sortable: false,
    cell: (row) => (
      <span className="text-sm">
        {format(new Date(row.periodStart), "MMM d")} -{" "}
        {format(new Date(row.periodEnd), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "user",
    header: "Employee",
    sortable: false,
    className: "w-[150px]",
    cell: (row) => (
      <span className="text-sm">
        {row.user.firstName} {row.user.lastName}
      </span>
    ),
  },
  {
    id: "totalHours",
    header: "Total Hours",
    sortable: true,
    accessorKey: "totalHours",
    className: "w-[100px]",
    cell: (row) => (
      <span className="text-sm font-medium">{row.totalHours.toFixed(1)}</span>
    ),
  },
  {
    id: "overtimeHours",
    header: "OT Hours",
    sortable: false,
    className: "w-[90px]",
    cell: (row) => (
      <span className="text-sm">
        {row.overtimeHours > 0 ? row.overtimeHours.toFixed(1) : "--"}
      </span>
    ),
  },
  {
    id: "leapHours",
    header: "LEAP Hours",
    sortable: false,
    className: "w-[100px]",
    cell: (row) => (
      <span className="text-sm">
        {row.leapHours > 0 ? row.leapHours.toFixed(1) : "--"}
      </span>
    ),
  },
  {
    id: "regularHours",
    header: "Regular",
    sortable: false,
    className: "w-[80px]",
    cell: (row) => {
      const regular = (row as TimesheetWithComputed).regularHours;
      return (
        <span className="text-sm">
          {regular !== undefined && regular > 0 ? regular.toFixed(1) : "--"}
        </span>
      );
    },
  },
  {
    id: "availabilityPay",
    header: "Avail. Pay",
    sortable: false,
    className: "w-[100px]",
    cell: (row) => {
      const pay = (row as TimesheetWithComputed).availabilityPay;
      return (
        <span className="text-sm font-medium">
          {pay !== undefined && pay > 0
            ? `$${pay.toFixed(2)}`
            : "--"}
        </span>
      );
    },
  },
  {
    id: "substantialHours",
    header: "Substantial",
    sortable: false,
    className: "w-[90px]",
    cell: (row) => {
      const substantial = (row as TimesheetWithComputed).substantialHours;
      if (substantial === undefined) return <span className="text-xs text-muted-foreground">--</span>;
      return substantial ? (
        <Badge variant="default" className="text-[10px]">Yes</Badge>
      ) : (
        <Badge variant="outline" className="text-[10px]">No</Badge>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    sortable: true,
    className: "w-[110px]",
    cell: (row) => (
      <Badge variant={statusVariant(row.status)}>{enumLabel(row.status)}</Badge>
    ),
  },
  {
    id: "submittedAt",
    header: "Submitted",
    sortable: false,
    className: "w-[110px]",
    cell: (row) =>
      row.submittedAt ? (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.submittedAt), "MMM d, yyyy")}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">--</span>
      ),
  },
];

// ─── Log Time Dialog ─────────────────────────────────────────

function LogTimeDialog() {
  const [open, setOpen] = useState(false);
  const createEntry = useCreateTimeEntry();
  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    hours: "",
    activityType: "CASE_WORK",
    caseId: "",
    description: "",
    isOvertime: false,
    isLeap: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createEntry.mutate(
      {
        date: form.date,
        hours: parseFloat(form.hours),
        activityType: form.activityType,
        caseId: form.caseId || undefined,
        description: form.description || undefined,
        isOvertime: form.isOvertime,
        isLeap: form.isLeap,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({
            date: format(new Date(), "yyyy-MM-dd"),
            hours: "",
            activityType: "CASE_WORK",
            caseId: "",
            description: "",
            isOvertime: false,
            isLeap: false,
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" className="gap-1.5" />}
      >
        <Plus className="size-3.5" />
        Log Time
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Log Time Entry</DialogTitle>
          <DialogDescription>
            Record hours worked for a specific date and activity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="te-date">Date</Label>
              <Input
                id="te-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="te-hours">Hours</Label>
              <Input
                id="te-hours"
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                placeholder="8.0"
                value={form.hours}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hours: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="te-activity">Activity Type</Label>
            <Select
              value={form.activityType}
              onValueChange={(val) =>
                setForm((f) => ({ ...f, activityType: val ?? f.activityType }))
              }
            >
              <SelectTrigger id="te-activity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {enumLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="te-case">Case ID (optional)</Label>
            <Input
              id="te-case"
              placeholder="Case ID"
              value={form.caseId}
              onChange={(e) =>
                setForm((f) => ({ ...f, caseId: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="te-desc">Description</Label>
            <Textarea
              id="te-desc"
              placeholder="What did you work on?"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="te-ot"
                checked={form.isOvertime}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isOvertime: checked === true }))
                }
              />
              <Label htmlFor="te-ot" className="text-sm">
                Overtime
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="te-leap"
                checked={form.isLeap}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isLeap: checked === true }))
                }
              />
              <Label htmlFor="te-leap" className="text-sm">
                LEAP
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Generate Timesheet Dialog ───────────────────────────────

function GenerateTimesheetDialog() {
  const [open, setOpen] = useState(false);
  const createTimesheet = useCreateTimesheet();

  // Default to current pay period (two-week period)
  const now = new Date();
  const dayOfMonth = now.getDate();
  const periodStartDefault =
    dayOfMonth <= 15
      ? format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd")
      : format(new Date(now.getFullYear(), now.getMonth(), 16), "yyyy-MM-dd");
  const periodEndDefault =
    dayOfMonth <= 15
      ? format(new Date(now.getFullYear(), now.getMonth(), 15), "yyyy-MM-dd")
      : format(
          new Date(now.getFullYear(), now.getMonth() + 1, 0),
          "yyyy-MM-dd",
        );

  const [form, setForm] = useState({
    periodStart: periodStartDefault,
    periodEnd: periodEndDefault,
    notes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createTimesheet.mutate(
      {
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <CalendarDays className="size-3.5" />
        Generate Timesheet
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Generate Timesheet</DialogTitle>
          <DialogDescription>
            Create a timesheet for a pay period. Hours will be calculated from
            your time entries.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ts-start">Period Start</Label>
              <Input
                id="ts-start"
                type="date"
                value={form.periodStart}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodStart: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ts-end">Period End</Label>
              <Input
                id="ts-end"
                type="date"
                value={form.periodEnd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodEnd: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ts-notes">Notes</Label>
            <Textarea
              id="ts-notes"
              placeholder="Any notes for this period..."
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTimesheet.isPending}>
              {createTimesheet.isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page component ──────────────────────────────────────────

export default function TimesheetsPage() {
  const [activeTab, setActiveTab] = useState<"entries" | "timesheets">(
    "entries",
  );

  // Time entries state
  const [entrySort, setEntrySort] = useState<SortState>({
    column: "date",
    direction: "desc",
  });
  const [entryPagination, setEntryPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
  });
  const [activityFilter, setActivityFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [entryFiltersOpen, setEntryFiltersOpen] = useState(false);

  // Timesheet state
  const [tsSort, setTsSort] = useState<SortState>({
    column: "periodStart",
    direction: "desc",
  });
  const [tsPagination, setTsPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
  });
  const [tsStatusFilter, setTsStatusFilter] = useState<string | undefined>();

  const updateTimeEntry = useUpdateTimeEntry();
  const updateTimesheet = useUpdateTimesheet();

  // Build filters
  const entryFilters: TimeEntryFilters = {
    page: entryPagination.page,
    pageSize: entryPagination.pageSize,
    sortBy: entrySort.column,
    sortOrder: entrySort.direction,
    ...(activityFilter && { activityType: activityFilter }),
    ...(statusFilter && { status: statusFilter }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const tsFilters: TimesheetFilters = {
    page: tsPagination.page,
    pageSize: tsPagination.pageSize,
    sortBy: tsSort.column,
    sortOrder: tsSort.direction,
    ...(tsStatusFilter && { status: tsStatusFilter }),
  };

  const { data: entriesData, isLoading: entriesLoading } =
    useTimeEntries(entryFilters);
  const { data: tsData, isLoading: tsLoading } = useTimesheets(tsFilters);

  const hasEntryFilters = !!activityFilter || !!statusFilter || !!dateFrom || !!dateTo;

  function clearEntryFilters() {
    setActivityFilter(undefined);
    setStatusFilter(undefined);
    setDateFrom("");
    setDateTo("");
    setEntryPagination((prev) => ({ ...prev, page: 1 }));
  }

  // Action columns for time entries (submit)
  const entryColumnsWithActions: ColumnDef<TimeEntryWithRelations>[] = [
    ...timeEntryColumns,
    {
      id: "actions",
      header: "",
      sortable: false,
      className: "w-[80px]",
      cell: (row) => (
        <div className="flex gap-1">
          {row.status === "DRAFT" && (
            <Button
              variant="ghost"
              size="icon-xs"
              title="Submit"
              onClick={(e) => {
                e.stopPropagation();
                updateTimeEntry.mutate({ id: row.id, status: "SUBMITTED" });
              }}
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Action columns for timesheets (submit / approve / reject)
  const tsColumnsWithActions: ColumnDef<TimesheetWithRelations>[] = [
    ...timesheetColumns,
    {
      id: "actions",
      header: "",
      sortable: false,
      className: "w-[120px]",
      cell: (row) => (
        <div className="flex gap-1">
          {row.status === "DRAFT" && (
            <Button
              variant="ghost"
              size="icon-xs"
              title="Submit"
              onClick={(e) => {
                e.stopPropagation();
                updateTimesheet.mutate({ id: row.id, status: "SUBMITTED" });
              }}
            >
              <Send className="size-3.5" />
            </Button>
          )}
          {row.status === "SUBMITTED" && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                title="Approve"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTimesheet.mutate({ id: row.id, status: "APPROVED" });
                }}
              >
                <Check className="size-3.5 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                title="Reject"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTimesheet.mutate({ id: row.id, status: "REJECTED" });
                }}
              >
                <XCircle className="size-3.5 text-red-500" />
              </Button>
            </>
          )}
          {row.status === "REJECTED" && (
            <Button
              variant="ghost"
              size="icon-xs"
              title="Resubmit"
              onClick={(e) => {
                e.stopPropagation();
                updateTimesheet.mutate({ id: row.id, status: "SUBMITTED" });
              }}
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Time &amp; Labor
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Track hours, manage timesheets, and review labor data
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "entries" && <LogTimeDialog />}
          {activeTab === "timesheets" && <GenerateTimesheetDialog />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab("entries")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "entries"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Time Entries
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("timesheets")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "timesheets"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Timesheets
        </button>
      </div>

      {/* Time Entries Tab */}
      {activeTab === "entries" && (
        <>
          {/* Filters toggle */}
          <div className="flex items-center gap-3">
            <Button
              variant={entryFiltersOpen ? "secondary" : "outline"}
              size="sm"
              onClick={() => setEntryFiltersOpen(!entryFiltersOpen)}
              className="gap-1.5"
            >
              <SlidersHorizontal className="size-3.5" />
              Filters
              {hasEntryFilters && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {[activityFilter, statusFilter, dateFrom, dateTo].filter(Boolean).length}
                </span>
              )}
            </Button>
            {hasEntryFilters && (
              <Button variant="ghost" size="sm" onClick={clearEntryFilters}>
                Clear filters
              </Button>
            )}
          </div>

          {/* Filter panel */}
          {entryFiltersOpen && (
            <Card>
              <CardContent className="flex flex-wrap items-end gap-4 pt-4 pb-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Activity Type
                  </label>
                  <Select
                    value={activityFilter ?? "ALL"}
                    onValueChange={(val) => {
                      setActivityFilter(val === "ALL" || val == null ? undefined : val);
                      setEntryPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All types</SelectItem>
                      {ACTIVITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {enumLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <Select
                    value={statusFilter ?? "ALL"}
                    onValueChange={(val) => {
                      setStatusFilter(val === "ALL" || val == null ? undefined : val);
                      setEntryPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      {TIME_ENTRY_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {enumLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    From
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setEntryPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-[160px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    To
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setEntryPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-[160px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <DataTable<TimeEntryWithRelations>
            columns={entryColumnsWithActions}
            data={entriesData?.data ?? []}
            total={entriesData?.total}
            sort={entrySort}
            onSortChange={(s) => {
              setEntrySort(s);
              setEntryPagination((prev) => ({ ...prev, page: 1 }));
            }}
            pagination={entryPagination}
            onPaginationChange={setEntryPagination}
            getRowId={(row) => row.id}
            loading={entriesLoading}
            skeletonRows={10}
            emptyMessage="No time entries found."
            pageSizeOptions={[10, 25, 50]}
          />
        </>
      )}

      {/* Timesheets Tab */}
      {activeTab === "timesheets" && (
        <>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <Select
                value={tsStatusFilter ?? "ALL"}
                onValueChange={(val) => {
                  setTsStatusFilter(val === "ALL" || val == null ? undefined : val);
                  setTsPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {TIME_ENTRY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {enumLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable<TimesheetWithRelations>
            columns={tsColumnsWithActions}
            data={tsData?.data ?? []}
            total={tsData?.total}
            sort={tsSort}
            onSortChange={(s) => {
              setTsSort(s);
              setTsPagination((prev) => ({ ...prev, page: 1 }));
            }}
            pagination={tsPagination}
            onPaginationChange={setTsPagination}
            getRowId={(row) => row.id}
            loading={tsLoading}
            skeletonRows={10}
            emptyMessage="No timesheets found."
            pageSizeOptions={[10, 25, 50]}
          />
        </>
      )}
    </div>
  );
}
