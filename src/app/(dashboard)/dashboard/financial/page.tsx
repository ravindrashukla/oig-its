"use client";

import { useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Scale,
  PiggyBank,
  Calculator,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancialAnalytics } from "@/hooks/useFinancialAnalytics";

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

export default function FinancialPage() {
  useEffect(() => { document.title = "Financial | OIG-ITS"; }, []);
  const { data, isLoading } = useFinancialAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Financial Summary
        </h1>
        <p className="text-sm text-muted-foreground">
          Financial impact overview across all investigations
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          title="Total Recoveries"
          value={data ? formatCurrency(data.totalRecoveries) : undefined}
          icon={DollarSign}
          loading={isLoading}
          accent="text-emerald-600"
        />
        <SummaryCard
          title="Total Fines"
          value={data ? formatCurrency(data.totalFines) : undefined}
          icon={Scale}
          loading={isLoading}
          accent="text-amber-600"
        />
        <SummaryCard
          title="Total Restitution"
          value={data ? formatCurrency(data.totalRestitution) : undefined}
          icon={TrendingUp}
          loading={isLoading}
          accent="text-blue-600"
        />
        <SummaryCard
          title="Total Savings"
          value={data ? formatCurrency(data.totalSavings) : undefined}
          icon={PiggyBank}
          loading={isLoading}
          accent="text-purple-600"
        />
        <SummaryCard
          title="ROI"
          value={data ? formatPercent(data.returnOnInvestment) : undefined}
          icon={Calculator}
          loading={isLoading}
          accent="text-indigo-600"
        />
      </div>

      {/* Investigative costs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Investigative Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <p className="text-lg font-semibold">
              {formatCurrency(data?.totalInvestigativeCosts ?? 0)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Estimated from time entries (hours x hourly rate)
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cases by financial impact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="size-4" />
              Top Cases by Financial Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton rows={5} />
            ) : !data?.byCase.length ? (
              <EmptyState text="No financial data" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Case</th>
                      <th className="pb-2 pr-3 font-medium text-right">Recovery</th>
                      <th className="pb-2 pr-3 font-medium text-right">Fines</th>
                      <th className="pb-2 pr-3 font-medium text-right">Restitution</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCase.map((row) => (
                      <tr key={row.caseId} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="font-mono text-xs text-muted-foreground">
                            {row.caseNumber}
                          </div>
                          <div className="truncate max-w-[180px]">{row.title}</div>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatCurrency(row.recovery)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatCurrency(row.fines)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatCurrency(row.restitution)}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subjects by financial impact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="size-4" />
              Top Subjects by Financial Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton rows={5} />
            ) : !data?.bySubject.length ? (
              <EmptyState text="No subject financial data" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Subject</th>
                      <th className="pb-2 pr-3 font-medium">Type</th>
                      <th className="pb-2 font-medium text-right">Total Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySubject.map((row) => (
                      <tr key={row.subjectId} className="border-b last:border-0">
                        <td className="py-2 pr-3">{row.name || "Unknown"}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {row.type.replace(/_/g, " ")}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Monthly Financial Results (Last 12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : !data?.byPeriod.length ? (
            <EmptyState text="No monthly data" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Month</th>
                    <th className="pb-2 pr-3 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium flex-1">Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byPeriod.map((row) => {
                    const maxAmount = Math.max(
                      ...data.byPeriod.map((p) => p.amount),
                      1,
                    );
                    const widthPercent = (row.amount / maxAmount) * 100;
                    return (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs">
                          {row.month}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="py-2">
                          <div className="h-4 w-full rounded-sm bg-muted">
                            <div
                              className="h-4 rounded-sm bg-primary/60"
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function SummaryCard({
  title,
  value,
  icon: Icon,
  loading,
  accent,
}: {
  title: string;
  value: string | undefined;
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
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="text-xl font-bold tracking-tight">{value ?? "$0"}</p>
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
