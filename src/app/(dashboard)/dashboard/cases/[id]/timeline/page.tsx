"use client";

import { use } from "react";
import { format } from "date-fns";
import {
  ArrowRightLeft,
  StickyNote,
  FileText,
  Shield,
  UserPlus,
  ClipboardList,
  Clock,
} from "lucide-react";
import { useCaseTimeline, type TimelineEvent } from "@/hooks/useTimeline";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const eventConfig: Record<
  TimelineEvent["type"],
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    dotColor: string;
  }
> = {
  status_change: {
    icon: ArrowRightLeft,
    color: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  note: {
    icon: StickyNote,
    color: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  document: {
    icon: FileText,
    color: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
  },
  evidence: {
    icon: Shield,
    color: "text-purple-600 dark:text-purple-400",
    dotColor: "bg-purple-500",
  },
  assignment: {
    icon: UserPlus,
    color: "text-cyan-600 dark:text-cyan-400",
    dotColor: "bg-cyan-500",
  },
  task: {
    icon: ClipboardList,
    color: "text-orange-600 dark:text-orange-400",
    dotColor: "bg-orange-500",
  },
};

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CaseTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const { data, isLoading, error } = useCaseTimeline(caseId);

  const events = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-6 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">
          {error.message || "Failed to load timeline."}
        </p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Clock className="mx-auto size-10 text-muted-foreground/50" />
        <h3 className="mt-3 text-sm font-medium">No activity yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Case timeline events will appear here.
        </p>
      </div>
    );
  }

  // Group events by date
  const grouped: Record<string, TimelineEvent[]> = {};
  for (const event of events) {
    const dateKey = format(new Date(event.createdAt), "yyyy-MM-dd");
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(event);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-medium text-muted-foreground">
        {events.length} event{events.length !== 1 ? "s" : ""}
      </h2>

      <div className="space-y-8">
        {Object.entries(grouped).map(([dateKey, dayEvents]) => (
          <div key={dateKey}>
            <div className="sticky top-0 z-10 mb-3 bg-background/95 backdrop-blur">
              <span className="text-xs font-semibold text-muted-foreground">
                {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
              </span>
            </div>

            <div className="relative ml-3 border-l border-border pl-6 space-y-4">
              {dayEvents.map((event) => {
                const config = eventConfig[event.type];
                const Icon = config.icon;

                return (
                  <div key={event.id} className="relative">
                    {/* Dot on the timeline */}
                    <div
                      className={cn(
                        "absolute -left-[31px] top-1 size-3 rounded-full border-2 border-background",
                        config.dotColor,
                      )}
                    />

                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Icon
                          className={cn("size-4 mt-0.5 shrink-0", config.color)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3 mt-0.5">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">
                              {format(
                                new Date(event.createdAt),
                                "h:mm a",
                              )}
                            </span>
                            {event.actor && (
                              <span className="text-[10px] text-muted-foreground">
                                by {event.actor.firstName}{" "}
                                {event.actor.lastName}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className="text-[10px] border-transparent"
                            >
                              {formatEnum(event.type)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
