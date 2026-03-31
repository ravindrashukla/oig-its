"use client";

import { useState, useCallback } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users,
  Search,
  X,
  User,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaginatedResponse, Subject } from "@/types";
import { cn } from "@/lib/utils";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

const subjectTypes = [
  "INDIVIDUAL",
  "ORGANIZATION",
  "DEPARTMENT",
  "VENDOR",
  "OTHER",
] as const;

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSubjectName(subject: Subject): string {
  if (subject.type === "INDIVIDUAL") {
    return [subject.firstName, subject.lastName].filter(Boolean).join(" ") || "Unknown";
  }
  return subject.orgName || "Unknown Organization";
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  INDIVIDUAL: User,
  ORGANIZATION: Building2,
  DEPARTMENT: Building2,
  VENDOR: Building2,
  OTHER: Users,
};

export default function SubjectsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined | null>();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, 300);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (typeFilter) params.set("type", typeFilter);

  const { data, isLoading } = useQuery<PaginatedResponse<Subject>>({
    queryKey: ["subjects-global", params.toString()],
    queryFn: () =>
      fetchJson<PaginatedResponse<Subject>>(
        `/api/subjects?${params.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });

  const subjects = data?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
        <p className="text-sm text-muted-foreground">
          Manage individuals and organizations involved in cases
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={typeFilter ?? "ALL"}
          onValueChange={(val) => {
            setTypeFilter(val === "ALL" ? undefined : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {subjectTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {formatEnum(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subjects grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="mx-auto size-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-sm font-medium">No subjects found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {debouncedSearch || typeFilter
              ? "Try adjusting your search or filters."
              : "No subjects have been created yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => {
              const TypeIcon = typeIcons[subject.type] ?? Users;

              return (
                <Card key={subject.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <TypeIcon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {getSubjectName(subject)}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {formatEnum(subject.type)}
                          </Badge>
                        </div>
                        {subject.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="size-3" />
                            <span className="truncate">{subject.email}</span>
                          </div>
                        )}
                        {subject.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="size-3" />
                            <span>{subject.phone}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Added {format(new Date(subject.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, data.total)} of {data.total}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
