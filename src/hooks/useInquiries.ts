"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────

export interface InquiryFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  source?: string;
  status?: string;
  assignedToId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InquiryAssignee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface InquiryConvertedCase {
  id: string;
  caseNumber: string;
  title: string;
}

export interface Inquiry {
  id: string;
  inquiryNumber: string;
  source: string;
  status: string;
  complainantName: string | null;
  complainantEmail: string | null;
  complainantPhone: string | null;
  isAnonymous: boolean;
  subject: string;
  description: string;
  category: string | null;
  priority: string;
  assignedToId: string | null;
  convertedCaseId: string | null;
  responseMessage: string | null;
  receivedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: InquiryAssignee | null;
  convertedCase: InquiryConvertedCase | null;
}

export interface InquiryListResponse {
  data: Inquiry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ────────────────────────────────────────────────

function buildSearchParams(filters: InquiryFilters): string {
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

async function postJson<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function patchJson<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Hooks ──────────────────────────────────────────────────

/** Fetch paginated & filtered inquiry list */
export function useInquiries(filters: InquiryFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<InquiryListResponse>({
    queryKey: ["inquiries", qs],
    queryFn: () => fetchJson<InquiryListResponse>(`/api/inquiries?${qs}`),
    placeholderData: keepPreviousData,
  });
}

/** Fetch a single inquiry */
export function useInquiry(inquiryId: string | undefined) {
  return useQuery<Inquiry>({
    queryKey: ["inquiry", inquiryId],
    queryFn: () => fetchJson<Inquiry>(`/api/inquiries/${inquiryId}`),
    enabled: !!inquiryId,
  });
}

/** Create a new inquiry */
export function useCreateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      postJson<Inquiry>("/api/inquiries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}

/** Update an existing inquiry */
export function useUpdateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inquiryId,
      data,
    }: {
      inquiryId: string;
      data: Record<string, unknown>;
    }) => patchJson<Inquiry>(`/api/inquiries/${inquiryId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      queryClient.invalidateQueries({
        queryKey: ["inquiry", variables.inquiryId],
      });
    },
  });
}

export interface ConvertInquiryInput {
  inquiryId: string;
  title?: string;
  caseType?: string;
  priority?: string;
}

export interface ConvertInquiryResult {
  id: string;
  caseNumber: string;
  title: string;
  caseType: string;
  priority: string;
  status: string;
}

/** Convert an inquiry to a case */
export function useConvertInquiry() {
  const queryClient = useQueryClient();

  return useMutation<ConvertInquiryResult, Error, ConvertInquiryInput>({
    mutationFn: ({ inquiryId, ...data }) =>
      postJson<ConvertInquiryResult>(`/api/inquiries/${inquiryId}/convert`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}
