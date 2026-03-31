"use client";

import { use } from "react";
import { Users, Mail, Phone, MapPin, Building2, User } from "lucide-react";
import { useCaseSubjects } from "@/hooks/useSubjects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const roleColors: Record<string, string> = {
  COMPLAINANT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  RESPONDENT: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  WITNESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  SUBJECT_OF_INTEREST: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  INFORMANT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  OTHER: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  INDIVIDUAL: User,
  ORGANIZATION: Building2,
  DEPARTMENT: Building2,
  VENDOR: Building2,
  OTHER: Users,
};

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSubjectName(subject: any): string {
  if (subject.type === "INDIVIDUAL") {
    return [subject.firstName, subject.lastName].filter(Boolean).join(" ") || "Unknown";
  }
  return subject.orgName || "Unknown Organization";
}

export default function CaseSubjectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const { data, isLoading, error } = useCaseSubjects(caseId);

  const subjects = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">
          {error.message || "Failed to load subjects."}
        </p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Users className="mx-auto size-10 text-muted-foreground/50" />
        <h3 className="mt-3 text-sm font-medium">No subjects linked</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          No subjects have been linked to this case yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {subjects.length} subject{subjects.length !== 1 ? "s" : ""} linked to
          this case
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {subjects.map((cs) => {
          const subject = cs.subject;
          const TypeIcon = typeIcons[subject.type] ?? Users;

          return (
            <Card key={cs.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <TypeIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {getSubjectName(subject)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent text-[10px] font-medium",
                          roleColors[cs.role] || roleColors.OTHER,
                        )}
                      >
                        {formatEnum(cs.role)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {formatEnum(subject.type)}
                      </Badge>
                    </div>

                    <div className="space-y-0.5">
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
                      {subject.address && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          <span className="truncate">{subject.address}</span>
                        </div>
                      )}
                    </div>

                    {cs.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                        {cs.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
