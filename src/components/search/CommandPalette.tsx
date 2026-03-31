"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Package,
  ClipboardList,
  FileText,
  Search,
  ArrowRight,
} from "lucide-react";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useCommandPaletteSearch } from "@/hooks/useSearch";

const INDEX_META: Record<string, { label: string; icon: typeof FolderOpen }> = {
  cases: { label: "Cases", icon: FolderOpen },
  evidence: { label: "Evidence", icon: Package },
  tasks: { label: "Tasks", icon: ClipboardList },
  documents: { label: "Documents", icon: FileText },
};

function hitUrl(hit: { id: string; _index: string; caseId?: string }): string {
  switch (hit._index) {
    case "cases":
      return `/dashboard/cases/${hit.id}`;
    case "evidence":
      return `/dashboard/cases/${hit.caseId}/evidence`;
    case "tasks":
      return `/dashboard/tasks`;
    case "documents":
      return `/dashboard/cases/${hit.caseId}/documents`;
    default:
      return "/dashboard";
  }
}

function hitLabel(hit: Record<string, unknown>): string {
  if (hit.caseNumber && hit.title) return `${hit.caseNumber} — ${hit.title}`;
  if (hit.title) return hit.title as string;
  if (hit.fileName) return hit.fileName as string;
  return hit.id as string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { query, setQuery, hits, isLoading, reset } =
    useCommandPaletteSearch();

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSelect = useCallback(
    (hit: Record<string, unknown>) => {
      setOpen(false);
      reset();
      router.push(hitUrl(hit as { id: string; _index: string; caseId?: string }));
    },
    [router, reset],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) reset();
    },
    [reset],
  );

  // Group hits by index
  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const hit of hits) {
    const idx = (hit as Record<string, unknown>)._index as string;
    if (!grouped.has(idx)) grouped.set(idx, []);
    grouped.get(idx)!.push(hit);
  }

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title="Search" description="Search cases, evidence, tasks, and documents">
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search cases, evidence, tasks, documents..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.length > 0 && !isLoading && hits.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {query.length > 0 && isLoading && hits.length === 0 && (
            <CommandEmpty>Searching...</CommandEmpty>
          )}

          {[...grouped.entries()].map(([indexName, indexHits]) => {
            const meta = INDEX_META[indexName] ?? {
              label: indexName,
              icon: Search,
            };
            const Icon = meta.icon;

            return (
              <CommandGroup key={indexName} heading={meta.label}>
                {indexHits.map((hit) => (
                  <CommandItem
                    key={`${indexName}-${hit.id}`}
                    value={`${indexName}-${hit.id}`}
                    onSelect={() => handleSelect(hit)}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">
                      {hitLabel(hit)}
                    </span>
                    {hit.status ? (
                      <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {String(hit.status).replace(/_/g, " ")}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {query.length > 0 && hits.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__view_all__"
                  onSelect={() => {
                    setOpen(false);
                    reset();
                    router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
                  }}
                >
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <span className="text-sm">
                    View all results for &quot;{query}&quot;
                  </span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
