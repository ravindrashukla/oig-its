"use client";

import { use, useState } from "react";
import { Microscope, Plus } from "lucide-react";
import { format } from "date-fns";
import { useTechniques, useCreateTechnique } from "@/hooks/useTechniques";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  SURVEILLANCE: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  INTERVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  FORENSIC_ANALYSIS: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  DATA_ANALYSIS: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  UNDERCOVER: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  SITE_VISIT: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  RECORDS_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  OTHER: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statusColors: Record<string, string> = {
  PLANNED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CaseTechniquesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    description: "",
    date: "",
    endDate: "",
    status: "PLANNED",
    authorizedBy: "",
    findings: "",
  });

  const { data, isLoading, error } = useTechniques(caseId);
  const createTechnique = useCreateTechnique(caseId);

  const techniques = data?.data ?? [];

  function handleSubmit() {
    if (!formData.type || !formData.description || !formData.date) return;
    createTechnique.mutate(
      {
        type: formData.type,
        description: formData.description,
        date: formData.date,
        endDate: formData.endDate || undefined,
        status: formData.status || undefined,
        authorizedBy: formData.authorizedBy || undefined,
        findings: formData.findings || undefined,
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          setFormData({
            type: "",
            description: "",
            date: "",
            endDate: "",
            status: "PLANNED",
            authorizedBy: "",
            findings: "",
          });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">
          {error.message || "Failed to load techniques."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {techniques.length} technique{techniques.length !== 1 ? "s" : ""} logged
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5" />
          Log Technique
        </Button>
      </div>

      {techniques.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Microscope className="mx-auto size-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-sm font-medium">No techniques logged</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No investigative techniques have been logged for this case yet.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Description</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Authorized By</th>
                <th className="px-4 py-2 text-left font-medium">Findings</th>
              </tr>
            </thead>
            <tbody>
              {techniques.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent text-[10px]",
                        typeColors[t.type] || typeColors.OTHER,
                      )}
                    >
                      {formatEnum(t.type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate">
                    {t.description}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {format(new Date(t.date), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent text-[10px]",
                        statusColors[t.status] || statusColors.PLANNED,
                      )}
                    >
                      {formatEnum(t.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {t.authorizedBy || "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[150px] truncate">
                    {t.findings || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Technique Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Technique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, type: v ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "SURVEILLANCE",
                      "INTERVIEW",
                      "FORENSIC_ANALYSIS",
                      "DATA_ANALYSIS",
                      "UNDERCOVER",
                      "SITE_VISIT",
                      "RECORDS_REVIEW",
                      "OTHER",
                    ].map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatEnum(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, status: v ?? "PLANNED" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {formatEnum(s)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-desc">Description</Label>
              <Textarea
                id="t-desc"
                placeholder="Describe the technique..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-date">Date</Label>
                <Input
                  id="t-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-end">End Date</Label>
                <Input
                  id="t-end"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-auth">Authorized By</Label>
              <Input
                id="t-auth"
                placeholder="Name of authorizing official"
                value={formData.authorizedBy}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    authorizedBy: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-findings">Findings</Label>
              <Textarea
                id="t-findings"
                placeholder="Findings from this technique..."
                value={formData.findings}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    findings: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.type ||
                !formData.description ||
                !formData.date ||
                createTechnique.isPending
              }
            >
              {createTechnique.isPending ? "Saving..." : "Log Technique"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
