"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bell,
  ArrowUpRight,
  ListTodo,
  ShieldAlert,
  Settings2,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  useDashboardMetrics,
  useCases,
  useDeadlines,
  useNotifications,
} from "@/hooks/useCases";

// ─── Priority / status colour helpers ───────────────────────

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
};

const statusColor: Record<string, string> = {
  INTAKE: "bg-blue-500/15 text-blue-700",
  OPEN: "bg-emerald-500/15 text-emerald-700",
  ACTIVE: "bg-amber-500/15 text-amber-700",
  UNDER_REVIEW: "bg-purple-500/15 text-purple-700",
  PENDING_ACTION: "bg-orange-500/15 text-orange-700",
  CLOSED: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-muted text-muted-foreground",
};

// ─── Dashboard layout customization (WPN11) ────────────────

const LAYOUT_KEY = "oig-its-dashboard-layout";

type WidgetId = "metrics" | "casesByStatus" | "recentCases" | "deadlines" | "notifications" | "casesByType";

interface WidgetDef {
  id: WidgetId;
  label: string;
}

const ALL_WIDGETS: WidgetDef[] = [
  { id: "metrics", label: "Metric Cards" },
  { id: "casesByStatus", label: "Cases by Status" },
  { id: "recentCases", label: "Recent Cases" },
  { id: "deadlines", label: "Upcoming Deadlines" },
  { id: "notifications", label: "Recent Notifications" },
  { id: "casesByType", label: "Cases by Type" },
];

const DEFAULT_LAYOUT: WidgetId[] = ["metrics", "casesByStatus", "recentCases", "deadlines", "notifications", "casesByType"];

function loadLayout(): WidgetId[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_LAYOUT;
}

function saveLayout(layout: WidgetId[]) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

// ─── Dashboard page ─────────────────────────────────────────

export default function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: recentCases, isLoading: casesLoading } = useCases({
    page: 1,
    pageSize: 5,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });
  const { data: deadlines, isLoading: deadlinesLoading } = useDeadlines(8);
  const { data: notifications, isLoading: notificationsLoading } =
    useNotifications(8);

  const [layout, setLayout] = useState<WidgetId[]>(DEFAULT_LAYOUT);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [editLayout, setEditLayout] = useState<WidgetId[]>([]);
  const [editVisible, setEditVisible] = useState<Set<WidgetId>>(new Set());

  useEffect(() => {
    document.title = "Dashboard | OIG-ITS";
  }, []);

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  const openCustomize = useCallback(() => {
    // Populate editor with current layout; all widgets in ALL_WIDGETS,
    // ordered by current layout first, then any not-in-layout at end
    const visible = new Set(layout);
    const ordered: WidgetId[] = [...layout];
    for (const w of ALL_WIDGETS) {
      if (!visible.has(w.id)) ordered.push(w.id);
    }
    setEditLayout(ordered);
    setEditVisible(visible);
    setCustomizeOpen(true);
  }, [layout]);

  const handleMoveUp = useCallback(
    (idx: number) => {
      if (idx === 0) return;
      const copy = [...editLayout];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      setEditLayout(copy);
    },
    [editLayout],
  );

  const handleMoveDown = useCallback(
    (idx: number) => {
      if (idx === editLayout.length - 1) return;
      const copy = [...editLayout];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      setEditLayout(copy);
    },
    [editLayout],
  );

  const handleToggleWidget = useCallback(
    (id: WidgetId) => {
      const copy = new Set(editVisible);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      setEditVisible(copy);
    },
    [editVisible],
  );

  const handleSaveLayout = useCallback(() => {
    const newLayout = editLayout.filter((id) => editVisible.has(id));
    setLayout(newLayout);
    saveLayout(newLayout);
    setCustomizeOpen(false);
  }, [editLayout, editVisible]);

  // ─── Widget renderers ─────────────────────────────────────

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case "metrics":
        return (
          <div key="metrics" className="space-y-4">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Total Cases" value={metrics?.totalCases} icon={FolderOpen} loading={metricsLoading} />
              <MetricCard title="Active Cases" value={metrics?.activeCases} icon={ShieldAlert} loading={metricsLoading} accent="text-amber-600" />
              <MetricCard title="Critical" value={metrics?.criticalCases} icon={AlertTriangle} loading={metricsLoading} accent="text-destructive" />
              <MetricCard title="Closed" value={metrics?.closedCases} icon={CheckCircle2} loading={metricsLoading} accent="text-emerald-600" />
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              <MetricCard title="Overdue Tasks" value={metrics?.overdueTasks} icon={ListTodo} loading={metricsLoading} accent="text-destructive" />
              <MetricCard title="Deadlines This Week" value={metrics?.upcomingDeadlines} icon={Clock} loading={metricsLoading} />
              <MetricCard title="Unread Notifications" value={metrics?.unreadNotifications} icon={Bell} loading={metricsLoading} accent="text-blue-600" />
            </div>
          </div>
        );
      case "casesByStatus":
        return metrics?.casesByStatus && Object.keys(metrics.casesByStatus).length > 0 ? (
          <Card key="casesByStatus">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cases by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(metrics.casesByStatus).map(([status, count]) => (
                  <div key={status} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${statusColor[status] ?? "bg-muted text-muted-foreground"}`}>
                    <span>{status.replace(/_/g, " ")}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null;
      case "casesByType":
        return metrics?.casesByType && Object.keys(metrics.casesByType).length > 0 ? (
          <Card key="casesByType">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cases by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(metrics.casesByType).map(([caseType, count]) => (
                  <div key={caseType} className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
                    <span>{caseType.replace(/_/g, " ")}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null;
      case "recentCases":
        return (
          <Card key="recentCases">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Recent Cases</CardTitle>
              <Link href="/dashboard/cases" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowUpRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {casesLoading ? (
                <LoadingSkeleton rows={5} />
              ) : recentCases?.data.length === 0 ? (
                <EmptyState text="No cases found" />
              ) : (
                recentCases?.data.map((c) => (
                  <Link key={c.id} href={`/dashboard/cases/${c.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{c.caseNumber}</span>
                        <Badge variant={priorityVariant[c.priority] ?? "secondary"} className="text-[10px]">{c.priority}</Badge>
                      </div>
                      <p className="truncate text-sm font-medium">{c.title}</p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${statusColor[c.status] ?? ""}`}>{c.status.replace(/_/g, " ")}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        );
      case "deadlines":
        return (
          <Card key="deadlines">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
              <Clock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              {deadlinesLoading ? (
                <LoadingSkeleton rows={5} />
              ) : !deadlines || deadlines.length === 0 ? (
                <EmptyState text="No upcoming deadlines" />
              ) : (
                deadlines.map((d) => (
                  <Link key={`${d.type}-${d.id}`} href={`/dashboard/cases/${d.caseId}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{d.caseNumber}</span>
                        <Badge variant="outline" className="text-[10px]">{d.type}</Badge>
                      </div>
                      <p className="truncate text-sm font-medium">{d.title}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium">{format(new Date(d.dueDate), "MMM d")}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(d.dueDate), { addSuffix: true })}</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        );
      case "notifications":
        return (
          <Card key="notifications">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Recent Notifications</CardTitle>
              <Link href="/dashboard/notifications" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowUpRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {notificationsLoading ? (
                <LoadingSkeleton rows={4} />
              ) : !notifications || notifications.length === 0 ? (
                <EmptyState text="No notifications" />
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted">
                    <Bell className={`mt-0.5 size-4 shrink-0 ${n.isRead ? "text-muted-foreground" : "text-blue-600"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.isRead ? "text-muted-foreground" : "font-medium"}`}>{n.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  // Some widgets should pair in a 2-col grid (recentCases + deadlines)
  const pairedWidgets = new Set<WidgetId>(["recentCases", "deadlines"]);

  // Group consecutive paired widgets
  const renderLayout = () => {
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < layout.length) {
      if (
        pairedWidgets.has(layout[i]) &&
        i + 1 < layout.length &&
        pairedWidgets.has(layout[i + 1])
      ) {
        elements.push(
          <div key={`pair-${layout[i]}-${layout[i + 1]}`} className="grid gap-6 lg:grid-cols-2">
            {renderWidget(layout[i])}
            {renderWidget(layout[i + 1])}
          </div>,
        );
        i += 2;
      } else {
        elements.push(renderWidget(layout[i]));
        i += 1;
      }
    }
    return elements;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Investigation tracking overview
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={openCustomize} className="gap-1.5">
          <Settings2 className="size-4" />
          Customize
        </Button>
      </div>

      {renderLayout()}

      {/* Customize dialog (WPN11) */}
      {customizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border bg-background p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Customize Dashboard</h3>
              <button onClick={() => setCustomizeOpen(false)} className="rounded p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Toggle widgets on/off and reorder them with the arrow buttons.
            </p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {editLayout.map((id, idx) => {
                const widget = ALL_WIDGETS.find((w) => w.id === id);
                if (!widget) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={editVisible.has(id)}
                      onChange={() => handleToggleWidget(id)}
                      className="size-4 rounded border-gray-300"
                    />
                    <span className="flex-1 text-sm">{widget.label}</span>
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === editLayout.length - 1}
                      className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setCustomizeOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditLayout([...DEFAULT_LAYOUT]);
                  setEditVisible(new Set(DEFAULT_LAYOUT));
                }}
              >
                Reset
              </Button>
              <Button size="sm" onClick={handleSaveLayout}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function MetricCard({
  title,
  value,
  icon: Icon,
  loading,
  accent,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted ${accent ?? ""}`}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold tracking-tight">{value ?? 0}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
