"use client";

import { useQuery } from "@tanstack/react-query";

export interface FinancialAnalytics {
  totalRecoveries: number;
  totalFines: number;
  totalRestitution: number;
  totalSavings: number;
  totalInvestigativeCosts: number;
  returnOnInvestment: number;
  byCase: {
    caseId: string;
    caseNumber: string;
    title: string;
    recovery: number;
    fines: number;
    restitution: number;
    savings: number;
    total: number;
  }[];
  bySubject: {
    subjectId: string;
    type: string;
    name: string;
    total: number;
  }[];
  byPeriod: {
    month: string;
    amount: number;
  }[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function useFinancialAnalytics() {
  return useQuery<FinancialAnalytics>({
    queryKey: ["analytics", "financial"],
    queryFn: () => fetchJson<FinancialAnalytics>("/api/analytics/financial"),
  });
}
