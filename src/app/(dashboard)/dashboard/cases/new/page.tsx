"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { CaseType, Priority } from "@/lib/enums";
import { createCaseSchema, type CreateCaseInput } from "@/lib/validators/case";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Helpers ────────────────────────────────────────────────

function enumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const caseTypeOptions = Object.values(CaseType) as CaseType[];
const priorityOptions = Object.values(Priority) as Priority[];

const STEPS = ["Details", "Classification", "Review"] as const;

type FieldErrors = Partial<Record<keyof CreateCaseInput, string[]>>;

// ─── Page ───────────────────────────────────────────────────

export default function NewCasePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caseType, setCaseType] = useState<string>("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  const formData: CreateCaseInput = {
    title,
    description,
    caseType: caseType as CreateCaseInput["caseType"],
    priority: priority as CreateCaseInput["priority"],
    dueDate,
  };

  // ─── Mutation ──────────────────────────────────────────────

  const createCase = useMutation({
    mutationFn: async (data: CreateCaseInput) => {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.issues) {
          throw { type: "validation", issues: body.issues };
        }
        throw new Error(body.error || `${res.status} ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push(`/dashboard/cases/${data.id}`);
    },
    onError: (err: any) => {
      if (err?.type === "validation") {
        setFieldErrors(err.issues);
        setStep(0);
      } else {
        setServerError(err?.message ?? "Something went wrong");
      }
    },
  });

  // ─── Step validation ──────────────────────────────────────

  function validateStep(s: number): boolean {
    setFieldErrors({});
    setServerError(null);

    if (s === 0) {
      const result = createCaseSchema.pick({ title: true, description: true }).safeParse({
        title,
        description,
      });
      if (!result.success) {
        setFieldErrors(result.error.flatten().fieldErrors as FieldErrors);
        return false;
      }
    }

    if (s === 1) {
      const result = createCaseSchema
        .pick({ caseType: true, priority: true, dueDate: true })
        .safeParse({ caseType, priority, dueDate });
      if (!result.success) {
        setFieldErrors(result.error.flatten().fieldErrors as FieldErrors);
        return false;
      }
    }

    return true;
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    const result = createCaseSchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as FieldErrors);
      setStep(0);
      return;
    }
    createCase.mutate(result.data);
  }

  // ─── Error helper ─────────────────────────────────────────

  function fieldError(name: keyof CreateCaseInput) {
    const errs = fieldErrors[name];
    if (!errs || errs.length === 0) return null;
    return (
      <p className="text-xs text-destructive mt-1">{errs[0]}</p>
    );
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/cases")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Case</h1>
          <p className="text-sm text-muted-foreground">
            Create a new investigation case
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <nav aria-label="Progress" className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (i < step) setStep(i);
              }}
              className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "border-2 border-primary text-primary"
                    : "border border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </button>
            <span
              className={`text-sm ${
                i === step ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-1 h-px w-8 bg-border" />
            )}
          </div>
        ))}
      </nav>

      {/* Server error */}
      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Step 1: Details */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
            <CardDescription>
              Provide the basic information about the investigation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Brief, descriptive title for the case"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={!!fieldErrors.title}
              />
              {fieldError("title")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide additional context, allegations, or initial findings..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                aria-invalid={!!fieldErrors.description}
              />
              {fieldError("description")}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Classification */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Classification</CardTitle>
            <CardDescription>
              Set the type, priority, and timeline for this case
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Case Type *</Label>
              <Select
                value={caseType}
                onValueChange={(v) => setCaseType(v ?? "")}
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={!!fieldErrors.caseType}
                >
                  <SelectValue placeholder="Select a case type" />
                </SelectTrigger>
                <SelectContent>
                  {caseTypeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {enumLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("caseType")}
            </div>

            <div className="space-y-1.5">
              <Label>Priority *</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v ?? "MEDIUM")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {enumLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("priority")}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-invalid={!!fieldErrors.dueDate}
              />
              {fieldError("dueDate")}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>
              Verify the case details before creating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium text-right max-w-[60%] truncate">
                  {title}
                </dd>
              </div>
              {description && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="text-right max-w-[60%] line-clamp-2">
                    {description}
                  </dd>
                </div>
              )}
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">Case Type</dt>
                <dd className="font-medium">{caseType ? enumLabel(caseType) : "—"}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="font-medium">{enumLabel(priority)}</dd>
              </div>
              {dueDate && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted-foreground">Due Date</dt>
                  <dd className="font-medium">{dueDate}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 0}
          className="gap-1.5"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-1.5">
            Next
            <ArrowRight className="size-3.5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createCase.isPending}
            className="gap-1.5"
          >
            {createCase.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Create Case
          </Button>
        )}
      </div>
    </div>
  );
}
