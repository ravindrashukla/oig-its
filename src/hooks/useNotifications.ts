"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { Notification } from "@/generated/prisma";

// ─── Types ───────────────────────────────────────────────────

export interface NotificationListResponse {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Hooks ───────────────────────────────────────────────────

/** Fetch paginated notifications for the current user */
export function useNotificationList(
  filters: { page?: number; pageSize?: number; unreadOnly?: boolean; type?: string } = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();

  return useQuery<NotificationListResponse>({
    queryKey: ["notifications", qs],
    queryFn: () => fetchJson<NotificationListResponse>(`/api/notifications?${qs}`),
    placeholderData: keepPreviousData,
  });
}

/** Fetch unread count (lightweight) for the bell icon */
export function useUnreadCount() {
  return useQuery<NotificationListResponse>({
    queryKey: ["notifications", "unread-count"],
    queryFn: () =>
      fetchJson<NotificationListResponse>("/api/notifications?pageSize=5&unreadOnly=true"),
    refetchInterval: 30_000, // poll every 30s
  });
}

/** Mark specific notifications as read */
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, { notificationIds: string[] }>({
    mutationFn: async ({ notificationIds }) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? "Failed to mark as read");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "notifications"] });
    },
  });
}

/** Mark all notifications as read */
export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? "Failed to mark all as read");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "notifications"] });
    },
  });
}
