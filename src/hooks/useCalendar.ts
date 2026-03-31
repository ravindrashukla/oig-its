"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

interface CalendarCase {
  id: string;
  caseNumber: string;
  title: string;
}

export interface CalendarReminder {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  date: string;
  isRecurring: boolean;
  frequency: string | null;
  isActive: boolean;
  caseId: string | null;
  createdAt: string;
  updatedAt: string;
  case: CalendarCase | null;
}

interface CalendarResponse {
  data: CalendarReminder[];
}

export interface CreateReminderInput {
  title: string;
  description?: string;
  date: string;
  isRecurring?: boolean;
  frequency?: string;
  caseId?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function useCalendarReminders(dateFrom?: string, dateTo?: string) {
  const qs = new URLSearchParams();
  if (dateFrom) qs.set("dateFrom", dateFrom);
  if (dateTo) qs.set("dateTo", dateTo);

  return useQuery<CalendarResponse>({
    queryKey: ["calendar", qs.toString()],
    queryFn: () =>
      fetchJson<CalendarResponse>(`/api/calendar?${qs.toString()}`),
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation<CalendarReminder, Error, CreateReminderInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/calendar", {
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
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
