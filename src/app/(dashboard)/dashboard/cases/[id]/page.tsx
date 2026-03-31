"use client";

import { use } from "react";
import { format } from "date-fns";
import {
  Calendar,
  User,
  Building2,
  FileText,
  Shield,
  ClipboardList,
  Users,
  StickyNote,
  Globe,
  Handshake,
} from "lucide-react";
import { useCase } from "@/hooks/useCase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const { data: caseData, isLoading, error } = useCase(caseId);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">
          {error?.message || "Failed to load case details."}
        </p>
      </div>
    );
  }

  const counts = (caseData as any)._count as {
    tasks: number;
    documents: number;
    evidenceItems: number;
    notes: number;
    subjects: number;
  } | undefined;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Main content */}
      <div className="md:col-span-2 space-y-6">
        {/* Description */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            {caseData.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {caseData.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No description provided.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Counts overview */}
        {counts && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.documents}</p>
                  <p className="text-xs text-muted-foreground">Documents</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.evidenceItems}</p>
                  <p className="text-xs text-muted-foreground">Evidence</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <ClipboardList className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.tasks}</p>
                  <p className="text-xs text-muted-foreground">Tasks</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Users className="size-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.subjects ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent notes */}
        {caseData.notes && caseData.notes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <StickyNote className="size-4" />
                Recent Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {caseData.notes.slice(0, 5).map((note: any) => (
                <div key={note.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">
                      {note.author?.firstName} {note.author?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {note.content}
                  </p>
                  {note.isPrivate && (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      Private
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Key details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              icon={<FileText className="size-3.5" />}
              label="Case Type"
              value={formatEnum(caseData.caseType)}
            />
            <Separator />
            <DetailRow
              icon={<Calendar className="size-3.5" />}
              label="Opened"
              value={format(new Date(caseData.openedAt), "MMM d, yyyy")}
            />
            {caseData.dueDate && (
              <>
                <Separator />
                <DetailRow
                  icon={<Calendar className="size-3.5" />}
                  label="Due Date"
                  value={format(new Date(caseData.dueDate), "MMM d, yyyy")}
                />
              </>
            )}
            {caseData.closedAt && (
              <>
                <Separator />
                <DetailRow
                  icon={<Calendar className="size-3.5" />}
                  label="Closed"
                  value={format(new Date(caseData.closedAt), "MMM d, yyyy")}
                />
              </>
            )}
            <Separator />
            <DetailRow
              icon={<User className="size-3.5" />}
              label="Created By"
              value={`${caseData.createdBy.firstName} ${caseData.createdBy.lastName}`}
            />
            {/* CM33: Jurisdiction, partner agencies, lead agency */}
            {caseData.jurisdiction && (
              <>
                <Separator />
                <DetailRow
                  icon={<Globe className="size-3.5" />}
                  label="Jurisdiction"
                  value={formatEnum(caseData.jurisdiction)}
                />
              </>
            )}
            {caseData.leadAgency && (
              <>
                <Separator />
                <DetailRow
                  icon={<Building2 className="size-3.5" />}
                  label="Lead Agency"
                  value={caseData.leadAgency}
                />
              </>
            )}
            {caseData.partnerAgencies && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Handshake className="size-3.5" />
                    <span className="text-xs">Partner Agencies</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {caseData.partnerAgencies.split(",").map((agency: string) => (
                      <Badge key={agency.trim()} variant="outline" className="text-[10px]">
                        {agency.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="size-4" />
              Assigned Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            {caseData.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No team members assigned.
              </p>
            ) : (
              <div className="space-y-2">
                {caseData.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-2 rounded-md border p-2"
                  >
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {assignment.user.firstName[0]}
                      {assignment.user.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {assignment.user.firstName} {assignment.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {assignment.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
