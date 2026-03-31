"use client";

import Link from "next/link";
import { Bell, Check, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnreadCount, useMarkRead, useMarkAllRead } from "@/hooks/useNotifications";

export default function NotificationBell() {
  const { data, isLoading } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = data?.unreadCount ?? 0;
  const recentNotifications = data?.data ?? [];

  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" sideOffset={8} className="w-80 p-0">
        <PopoverHeader className="flex flex-row items-center justify-between p-3 pb-2">
          <PopoverTitle className="text-sm font-semibold">Notifications</PopoverTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-[11px] px-2"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <Check className="size-3" />
              Mark all read
            </Button>
          )}
        </PopoverHeader>
        <Separator />
        <div className="max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="size-2 mt-1.5 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Bell className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No new notifications</p>
            </div>
          ) : (
            recentNotifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/50 cursor-pointer ${
                  !n.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                }`}
                onClick={() => {
                  if (!n.isRead) {
                    markRead.mutate({ notificationIds: [n.id] });
                  }
                }}
              >
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    n.isRead ? "bg-transparent" : "bg-blue-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs leading-snug ${n.isRead ? "text-muted-foreground" : "font-medium"}`}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <Separator />
        <div className="p-2">
          <Link
            href="/dashboard/notifications"
            className="flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            View all notifications
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
