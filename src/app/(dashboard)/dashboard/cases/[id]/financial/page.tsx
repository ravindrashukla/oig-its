"use client";

import { use, useState } from "react";
import { DollarSign, Plus, TrendingUp, Landmark, Scale, PiggyBank } from "lucide-react";
import { format } from "date-fns";
import {
  useFinancialResults,
  useCreateFinancialResult,
} from "@/hooks/useFinancialResults";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  RECOVERY: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  FINE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  RESTITUTION: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  SAVINGS: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  PENALTY: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  OTHER: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  COLLECTED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  WRITTEN_OFF: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getSubjectName(subject: { firstName: string | null; lastName: string | null; orgName: string | null } | null): string {
  if (!subject) return "\u2014";
  if (subject.firstName || subject.lastName) {
    return [subject.firstName, subject.lastName].filter(Boolean).join(" ");
  }
  return subject.orgName || "\u2014";
}

const summaryCards = [
  { key: "RECOVERY", label: "Total Recoveries", icon: TrendingUp, color: "text-green-600" },
  { key: "FINE", label: "Total Fines", icon: Landmark, color: "text-red-600" },
  { key: "RESTITUTION", label: "Total Restitution", icon: Scale, color: "text-blue-600" },
  { key: "SAVINGS", label: "Total Savings", icon: PiggyBank, color: "text-purple-600" },
];

export default function CaseFinancialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    description: "",
    status: "PENDING",
    resultDate: "",
  });

  const { data, isLoading, error } = useFinancialResults(caseId);
  const createResult = useCreateFinancialResult(caseId);

  const results = data?.data ?? [];

  // Calculate summaries
  const totals: Record<string, number> = {};
  for (const r of results) {
    totals[r.type] = (totals[r.type] || 0) + r.amount;
  }

  function handleSubmit() {
    if (!formData.type || !formData.amount) return;
    createResult.mutate(
      {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        status: formData.status || undefined,
        resultDate: formData.resultDate || undefined,
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          setFormData({ type: "", amount: "", description: "", status: "PENDING", resultDate: "" });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">
          {error.message || "Failed to load financial results."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((sc) => {
          const Icon = sc.icon;
          return (
            <Card key={sc.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className={cn("size-5", sc.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{sc.label}</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(totals[sc.key] || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {results.length} financial result{results.length !== 1 ? "s" : ""}
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5" />
          Add Financial Result
        </Button>
      </div>

      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <DollarSign className="mx-auto size-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-sm font-medium">No financial results</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No financial results have been recorded for this case yet.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 text-left font-medium">Subject</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent text-[10px]",
                        typeColors[r.type] || typeColors.OTHER,
                      )}
                    >
                      {formatEnum(r.type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium">
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {getSubjectName(r.subject)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent text-[10px]",
                        statusColors[r.status] || statusColors.PENDING,
                      )}
                    >
                      {formatEnum(r.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.resultDate
                      ? format(new Date(r.resultDate), "MMM d, yyyy")
                      : format(new Date(r.createdAt), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Financial Result Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Financial Result</DialogTitle>
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
                    {["RECOVERY", "FINE", "RESTITUTION", "SAVINGS", "PENALTY", "OTHER"].map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {formatEnum(t)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fr-amount">Amount ($)</Label>
                <Input
                  id="fr-amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, amount: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-desc">Description</Label>
              <Textarea
                id="fr-desc"
                placeholder="Describe the financial result..."
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
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, status: v ?? "PENDING" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {["PENDING", "COLLECTED", "PARTIAL", "WRITTEN_OFF"].map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {formatEnum(s)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fr-date">Result Date</Label>
                <Input
                  id="fr-date"
                  type="date"
                  value={formData.resultDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      resultDate: e.target.value,
                    }))
                  }
                />
              </div>
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
                !formData.amount ||
                createResult.isPending
              }
            >
              {createResult.isPending ? "Saving..." : "Add Result"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
