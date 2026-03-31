"use client";

import { use, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { format } from "date-fns";
import { useViolations, useCreateViolation } from "@/hooks/useViolations";
import { useCaseSubjects } from "@/hooks/useSubjects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  SUBSTANTIATED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  UNSUBSTANTIATED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  REFERRED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

const typeColors: Record<string, string> = {
  REGULATORY: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  CRIMINAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  CIVIL: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ADMINISTRATIVE: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  POLICY: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSubjectName(subject: { type: string; firstName: string | null; lastName: string | null; orgName: string | null }): string {
  if (subject.firstName || subject.lastName) {
    return [subject.firstName, subject.lastName].filter(Boolean).join(" ");
  }
  return subject.orgName || "Unknown";
}

export default function CaseViolationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    subjectId: "",
    type: "",
    title: "",
    description: "",
    status: "PENDING",
    disposition: "",
  });

  const { data, isLoading, error } = useViolations(caseId);
  const { data: subjectsData } = useCaseSubjects(caseId);
  const createViolation = useCreateViolation(caseId);

  const violations = data?.data ?? [];
  const subjects = subjectsData?.data ?? [];

  function handleSubmit() {
    if (!formData.subjectId || !formData.type || !formData.title) return;
    createViolation.mutate(
      {
        subjectId: formData.subjectId,
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status || undefined,
        disposition: formData.disposition || undefined,
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          setFormData({ subjectId: "", type: "", title: "", description: "", status: "PENDING", disposition: "" });
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
          {error.message || "Failed to load violations."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {violations.length} violation{violations.length !== 1 ? "s" : ""} recorded
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5" />
          Record Violation
        </Button>
      </div>

      {violations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <AlertTriangle className="mx-auto size-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-sm font-medium">No violations recorded</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No violations have been recorded for this case yet.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Title</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Subject</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Disposition</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v) => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{v.title}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent text-[10px]",
                        typeColors[v.type] || typeColors.POLICY,
                      )}
                    >
                      {formatEnum(v.type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {getSubjectName(v.subject)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent text-[10px]",
                        statusColors[v.status] || statusColors.PENDING,
                      )}
                    >
                      {formatEnum(v.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {v.disposition ? formatEnum(v.disposition) : "\u2014"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {format(new Date(v.createdAt), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Violation Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Violation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="v-title">Title</Label>
              <Input
                id="v-title"
                placeholder="Violation title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
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
                    {["REGULATORY", "CRIMINAL", "CIVIL", "ADMINISTRATIVE", "POLICY"].map(
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
                <Label>Subject</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, subjectId: v ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((cs: any) => (
                      <SelectItem key={cs.subject.id} value={cs.subject.id}>
                        {getSubjectName(cs.subject)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-desc">Description</Label>
              <Textarea
                id="v-desc"
                placeholder="Describe the violation..."
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
                    {["PENDING", "SUBSTANTIATED", "UNSUBSTANTIATED", "REFERRED"].map(
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
                <Label htmlFor="v-disp">Disposition</Label>
                <Input
                  id="v-disp"
                  placeholder="Disposition"
                  value={formData.disposition}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      disposition: e.target.value,
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
                !formData.title ||
                !formData.type ||
                !formData.subjectId ||
                createViolation.isPending
              }
            >
              {createViolation.isPending ? "Saving..." : "Record Violation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
