"use client";

import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Mail, MailOpen } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationList, useMarkRead, useMarkAllRead } from "@/hooks/useNotifications";
import type { NotificationType } from "@/generated/prisma";

const typeLabels: Record<string, string> = {
  CASE_ASSIGNED: "Case Assigned",
  CASE_UPDATED: "Case Updated",
  TASK_ASSIGNED: "Task Assigned",
  TASK_DUE: "Task Due",
  DOCUMENT_UPLOADED: "Document Uploaded",
  EVIDENCE_ADDED: "Evidence Added",
  WORKFLOW_ACTION: "Workflow Action",
  SYSTEM_ALERT: "System Alert",
  ANNOUNCEMENT: "Announcement",
};

const typeColor: Record<string, string> = {
  CASE_ASSIGNED: "bg-blue-500/15 text-blue-700",
  CASE_UPDATED: "bg-emerald-500/15 text-emerald-700",
  TASK_ASSIGNED: "bg-amber-500/15 text-amber-700",
  TASK_DUE: "bg-red-500/15 text-red-700",
  DOCUMENT_UPLOADED: "bg-purple-500/15 text-purple-700",
  EVIDENCE_ADDED: "bg-indigo-500/15 text-indigo-700",
  WORKFLOW_ACTION: "bg-orange-500/15 text-orange-700",
  SYSTEM_ALERT: "bg-red-500/15 text-red-700",
  ANNOUNCEMENT: "bg-cyan-500/15 text-cyan-700",
};

export default function NotificationsPage() {
  useEffect(() => { document.title = "Notifications | OIG-ITS"; }, []);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState<string | undefined>();

  const { data, isLoading } = useNotificationList({
    page,
    pageSize: 25,
    unreadOnly,
    type,
  });

  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Stay updated on case activity and workflow actions
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="size-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Button
          variant={unreadOnly ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setUnreadOnly(!unreadOnly);
            setPage(1);
          }}
          className="gap-1.5"
        >
          {unreadOnly ? <Mail className="size-3.5" /> : <MailOpen className="size-3.5" />}
          {unreadOnly ? "Unread only" : "All"}
        </Button>

        <Select
          value={type ?? "ALL"}
          onValueChange={(val: string | null | undefined) => {
            setType(!val || val === "ALL" ? undefined : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {Object.entries(typeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notification list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 py-3">
                <Skeleton className="size-2 mt-1.5 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {unreadOnly ? "No unread notifications" : "No notifications"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-colors ${!n.isRead ? "border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/10" : ""}`}
            >
              <CardContent className="flex items-start gap-3 py-3">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${n.isRead ? "bg-muted-foreground/20" : "bg-blue-500"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${n.isRead ? "" : "font-medium"}`}>
                      {n.title}
                    </p>
                    <span
                      className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColor[n.type] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {typeLabels[n.type] ?? n.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {n.message}
                  </p>
                  {n.link && (
                    <a
                      href={n.link}
                      className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
                    >
                      View details
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => markRead.mutate({ notificationIds: [n.id] })}
                      title="Mark as read"
                    >
                      <Check className="size-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
