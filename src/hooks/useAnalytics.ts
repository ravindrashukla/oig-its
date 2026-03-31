"use client";

import { useQuery } from "@tanstack/react-query";

export interface AnalyticsData {
  casesByStatus: Record<string, number>;
  casesByType: Record<string, number>;
  casesByPriority: Record<string, number>;
  casesByMonth: { month: string; count: number }[];
  avgDaysToClose: number;
  closureRate: number;
  investigatorWorkload: {
    userId: string;
    name: string;
    activeCases: number;
    completedTasks: number;
    pendingTasks: number;
  }[];
  financialSummary: {
    totalRecoveries: number;
    totalFines: number;
    totalRestitution: number;
    totalSavings: number;
  };
  evidenceSummary: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  taskCompletion: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    blocked: number;
  };
  overdueTasks: number;
  recentActivity: {
    casesCreatedLast30Days: number;
    documentsUploadedLast30Days: number;
    evidenceCollectedLast30Days: number;
  };
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/analytics");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<AnalyticsData>;
}

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });
}
