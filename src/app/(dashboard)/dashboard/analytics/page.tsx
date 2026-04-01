"use client";

import { useEffect } from "react";
import {
  BarChart3,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  DollarSign,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Package,
  ListChecks,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

import { useAnalytics } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Chart colours ────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  INTAKE: "#3b82f6",
  OPEN: "#10b981",
  ACTIVE: "#f59e0b",
  UNDER_REVIEW: "#8b5cf6",
  PENDING_ACTION: "#f97316",
  CLOSED: "#6b7280",
  ARCHIVED: "#9ca3af",
};

const TYPE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const TASK_COLORS: Record<string, string> = {
  completed: "#10b981",
  pending: "#f59e0b",
  inProgress: "#3b82f6",
  blocked: "#ef4444",
};

// ─── Helpers ─────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ─── Page component ───────────────────────────────────────

export default function AnalyticsPage() {
  useEffect(() => { document.title = "Analytics | OIG-ITS"; }, []);
  const { data: analytics, isLoading } = useAnalytics();

  const totalCases = analytics?.casesByStatus
    ? Object.values(analytics.casesByStatus).reduce((a, b) => a + b, 0)
    : 0;

  const activeCases = analytics?.casesByStatus
    ? (analytics.casesByStatus["OPEN"] || 0) +
      (analytics.casesByStatus["ACTIVE"] || 0) +
      (analytics.casesByStatus["INTAKE"] || 0)
    : 0;

  const closedCases = analytics?.casesByStatus
    ? (analytics.casesByStatus["CLOSED"] || 0) +
      (analytics.casesByStatus["ARCHIVED"] || 0)
    : 0;

  const criticalCases = analytics?.casesByPriority?.["CRITICAL"] || 0;

  const statusData = analytics?.casesByStatus
    ? Object.entries(analytics.casesByStatus).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
        fill: STATUS_COLORS[name] ?? "#6b7280",
      }))
    : [];

  const typeData = analytics?.casesByType
    ? Object.entries(analytics.casesByType).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
      }))
    : [];

  const monthlyData = analytics?.casesByMonth ?? [];

  const taskPieData = analytics?.taskCompletion
    ? [
        { name: "Completed", value: analytics.taskCompletion.completed, fill: TASK_COLORS.completed },
        { name: "Pending", value: analytics.taskCompletion.pending, fill: TASK_COLORS.pending },
        { name: "In Progress", value: analytics.taskCompletion.inProgress, fill: TASK_COLORS.inProgress },
        { name: "Blocked", value: analytics.taskCompletion.blocked, fill: TASK_COLORS.blocked },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Executive overview of investigation metrics
        </p>
      </div>

      {/* Top metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Cases"
          value={totalCases}
          icon={FolderOpen}
          loading={isLoading}
        />
        <MetricCard
          title="Active Cases"
          value={activeCases}
          icon={ShieldAlert}
          loading={isLoading}
          accent="text-amber-600"
        />
        <MetricCard
          title="Critical"
          value={criticalCases}
          icon={AlertTriangle}
          loading={isLoading}
          accent="text-destructive"
        />
        <MetricCard
          title="Closed"
          value={closedCases}
          icon={CheckCircle2}
          loading={isLoading}
          accent="text-emerald-600"
        />
      </div>

      {/* Closure rate + Avg days to close + Overdue tasks */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-emerald-600">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Closure Rate</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold tracking-tight">
                  {formatPercent(analytics?.closureRate ?? 0)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-blue-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Days to Close</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold tracking-tight">
                  {analytics?.avgDaysToClose ?? 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue Tasks</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-destructive">
                  {analytics?.overdueTasks ?? 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1: Cases by Status + Cases by Type */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cases by status bar chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Cases by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : statusData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-sm text-muted-foreground">No data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cases by type pie chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Cases by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : typeData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-sm text-muted-foreground">No data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(props: PieLabelRenderProps) =>
                      `${String(props.name ?? "")} (${(((props.percent as number) ?? 0) * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {typeData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={TYPE_COLORS[index % TYPE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Cases by Month + Task Completion */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cases by month bar chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Cases by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-sm text-muted-foreground">No data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Task completion pie chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Task Completion ({analytics?.taskCompletion?.total ?? 0} total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : taskPieData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-sm text-muted-foreground">No data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={taskPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(props: PieLabelRenderProps) =>
                      `${String(props.name ?? "")} (${props.value})`
                    }
                    labelLine={false}
                  >
                    {taskPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial summary cards */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <DollarSign className="size-4 text-muted-foreground" />
          Financial Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Recoveries</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-24" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-emerald-600">
                  {formatCurrency(analytics?.financialSummary?.totalRecoveries ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Fines</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-24" />
              ) : (
                <p className="text-2xl font-bold tracking-tight">
                  {formatCurrency(analytics?.financialSummary?.totalFines ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Restitution</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-24" />
              ) : (
                <p className="text-2xl font-bold tracking-tight">
                  {formatCurrency(analytics?.financialSummary?.totalRestitution ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Savings</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-24" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-blue-600">
                  {formatCurrency(analytics?.financialSummary?.totalSavings ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Evidence summary */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Package className="size-4 text-muted-foreground" />
          Evidence Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Evidence Items</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold tracking-tight">
                  {analytics?.evidenceSummary?.total ?? 0}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                By Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : analytics?.evidenceSummary?.byType &&
                Object.keys(analytics.evidenceSummary.byType).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(analytics.evidenceSummary.byType).map(
                    ([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {type.replace(/_/g, " ")}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                By Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : analytics?.evidenceSummary?.byStatus &&
                Object.keys(analytics.evidenceSummary.byStatus).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(analytics.evidenceSummary.byStatus).map(
                    ([status, count]) => (
                      <div key={status} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {status.replace(/_/g, " ")}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Investigator Workload table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-muted-foreground" />
            Investigator Workload
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !analytics?.investigatorWorkload ||
            analytics.investigatorWorkload.length === 0 ? (
            <p className="text-sm text-muted-foreground">No investigators found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Investigator</th>
                    <th className="pb-2 pr-4 font-medium text-right">Active Cases</th>
                    <th className="pb-2 pr-4 font-medium text-right">Completed Tasks</th>
                    <th className="pb-2 font-medium text-right">Pending Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.investigatorWorkload.map((inv) => (
                    <tr key={inv.userId} className="border-b last:border-0">
                      <td className="py-2 pr-4">{inv.name}</td>
                      <td className="py-2 pr-4 text-right font-medium">{inv.activeCases}</td>
                      <td className="py-2 pr-4 text-right text-emerald-600">{inv.completedTasks}</td>
                      <td className="py-2 text-right text-amber-600">{inv.pendingTasks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <ListChecks className="size-4 text-muted-foreground" />
          Recent Activity (Last 30 Days)
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FolderOpen className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cases Created</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight">
                    {analytics?.recentActivity?.casesCreatedLast30Days ?? 0}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileText className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Documents Uploaded</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight">
                    {analytics?.recentActivity?.documentsUploadedLast30Days ?? 0}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Package className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Evidence Collected</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight">
                    {analytics?.recentActivity?.evidenceCollectedLast30Days ?? 0}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

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
