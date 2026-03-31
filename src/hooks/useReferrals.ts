"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { PaginatedResponse, QueryFilters } from "@/types";

export interface Referral {
  id: string;
  caseId: string;
  agencyName: string;
  agencyType: string;
  contactName: string | null;
  contactEmail: string | null;
  referralDate: string;
  reason: string;
  status: string;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
}

type ReferralListResponse = PaginatedResponse<Referral>;

interface ReferralFilters extends QueryFilters {
  status?: string;
  agencyType?: string;
}

export interface CreateReferralInput {
  agencyName: string;
  agencyType: string;
  contactName?: string;
  contactEmail?: string;
  referralDate?: string;
  reason: string;
  status?: string;
  outcome?: string;
}

function buildSearchParams(filters: ReferralFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function useReferrals(caseId: string, filters: ReferralFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<ReferralListResponse>({
    queryKey: ["referrals", caseId, qs],
    queryFn: () =>
      fetchJson<ReferralListResponse>(
        `/api/cases/${caseId}/referrals?${qs}`,
      ),
    placeholderData: keepPreviousData,
    enabled: !!caseId,
  });
}

export function useCreateReferral(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation<Referral, Error, CreateReferralInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/cases/${caseId}/referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Create failed: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals", caseId] });
    },
  });
}
