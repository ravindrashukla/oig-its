"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePendingApprovals,
  useWorkflowAction,
  type WorkflowInstanceWithRelations,
  type WorkflowStep,
} from "@/hooks/useWorkflows";

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
};

export default function ApprovalsPage() {
  useEffect(() => { document.title = "Approvals | OIG-ITS"; }, []);
  const { data: approvals, isLoading } = usePendingApprovals();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Pending Approvals
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Workflow steps requiring your review or approval
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !approvals || approvals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No pending approvals
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All workflow steps are up to date
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((instance) => (
            <ApprovalCard key={instance.id} instance={instance} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  instance,
}: {
  instance: WorkflowInstanceWithRelations;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const workflowAction = useWorkflowAction();

  const steps = (instance.definition as any).steps as WorkflowStep[] | undefined;
  const currentStep = steps?.[instance.currentStep];
  const totalSteps = steps?.length ?? 0;

  function handleAction(action: "approve" | "reject") {
    workflowAction.mutate({
      instanceId: instance.id,
      action,
      notes: notes || undefined,
    });
    setNotes("");
    setShowNotes(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">
              {instance.definition.name}
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/cases/${instance.case.id}`}
                className="text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                {instance.case.caseNumber}
              </Link>
              <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                {instance.case.title}
              </span>
              <Badge
                variant={priorityVariant[instance.case.priority] ?? "secondary"}
                className="text-[10px]"
              >
                {instance.case.priority}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="size-3" />
            {formatDistanceToNow(new Date(instance.startedAt), {
              addSuffix: true,
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current step info */}
        <div className="rounded-md bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-amber-500" />
            Step {instance.currentStep + 1} of {totalSteps}:{" "}
            {currentStep?.name ?? "Unknown"}
          </div>
          {currentStep?.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {currentStep.description}
            </p>
          )}
        </div>

        {/* Recent actions */}
        {instance.actions.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Recent activity
            </span>
            {instance.actions.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className="font-medium">
                  {a.user.firstName} {a.user.lastName}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {a.action}
                </Badge>
                <span className="text-muted-foreground">
                  step {a.stepIndex + 1}
                </span>
                <span className="text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(a.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notes input */}
        {showNotes && (
          <Textarea
            placeholder="Add notes (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-sm"
          />
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleAction("approve")}
            disabled={workflowAction.isPending}
            className="gap-1.5"
          >
            {workflowAction.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction("reject")}
            disabled={workflowAction.isPending}
            className="gap-1.5"
          >
            {workflowAction.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <XCircle className="size-3.5" />
            )}
            Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNotes(!showNotes)}
            className="gap-1.5 ml-auto"
          >
            <MessageSquare className="size-3.5" />
            {showNotes ? "Hide notes" : "Add notes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
