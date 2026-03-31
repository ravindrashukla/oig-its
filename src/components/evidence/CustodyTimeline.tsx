"use client";

import { formatDistanceToNow, format } from "date-fns";
import { ArrowRight, User as UserIcon } from "lucide-react";
import type { ChainOfCustody, User } from "@/generated/prisma";

type CustodyEntry = ChainOfCustody & {
  fromUser: Pick<User, "id" | "firstName" | "lastName"> | null;
  toUser: Pick<User, "id" | "firstName" | "lastName">;
};

interface CustodyTimelineProps {
  entries: CustodyEntry[];
}

function userName(user: Pick<User, "firstName" | "lastName">) {
  return `${user.firstName} ${user.lastName}`;
}

export function CustodyTimeline({ entries }: CustodyTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No chain of custody records.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3">
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
            <UserIcon className="size-3 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="font-medium">{entry.action}</span>
              {entry.fromUser && (
                <>
                  <span className="text-muted-foreground">from</span>
                  <span className="font-medium">{userName(entry.fromUser)}</span>
                </>
              )}
              <ArrowRight className="size-3 text-muted-foreground" />
              <span className="font-medium">{userName(entry.toUser)}</span>
            </div>
            {entry.notes && (
              <p className="text-xs text-muted-foreground">{entry.notes}</p>
            )}
            <p
              className="text-xs text-muted-foreground"
              title={format(new Date(entry.occurredAt), "PPpp")}
            >
              {formatDistanceToNow(new Date(entry.occurredAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
