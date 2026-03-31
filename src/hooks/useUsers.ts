"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

export interface UserEntry {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  organization: { id: string; name: string } | null;
}

export interface UserListResponse {
  data: UserEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function useUsers(
  filters: { page?: number; pageSize?: number; search?: string; role?: string; isActive?: string } = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();

  return useQuery<UserListResponse>({
    queryKey: ["users", qs],
    queryFn: () => fetchJson<UserListResponse>(`/api/users?${qs}`),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserEntry, Error, { userId: string; role?: string; isActive?: boolean }>({
    mutationFn: async ({ userId, ...body }) => {
      const res = await fetch(`/api/users?userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error ?? "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
