"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText } from "lucide-react";
import { useCases } from "@/hooks/useCases";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function DocumentsPage() {
  useEffect(() => { document.title = "Documents | OIG-ITS"; }, []);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCases({ page: 1, pageSize: 50 });

  const cases = data?.data ?? [];
  const filtered = search
    ? cases.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.caseNumber.toLowerCase().includes(search.toLowerCase()),
      )
    : cases;

  const casesWithDocs = filtered.filter((c) => c._count.documents > 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Documents are organized per case. Select a case below to view its
          documents.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : casesWithDocs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No documents found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload documents to a case to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {casesWithDocs.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() =>
                router.push(`/dashboard/cases/${c.id}/documents`)
              }
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {c.caseNumber}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {c.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="truncate text-sm font-medium mt-0.5">
                    {c.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {c._count.documents}{" "}
                    {c._count.documents === 1 ? "document" : "documents"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
