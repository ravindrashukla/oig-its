"use client";

import { signOut, useSession } from "next-auth/react";
import { Search, LogOut, User, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/dashboard/NotificationBell";
import CommandPalette from "@/components/search/CommandPalette";
import { useUIStore } from "@/stores/uiStore";

export default function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="md:hidden shrink-0"
        onClick={toggleMobileSidebar}
      >
        <Menu className="size-5" />
      </Button>

      {/* Search trigger — hidden on mobile */}
      <button
        type="button"
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        className="relative hidden md:flex flex-1 max-w-md items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span>Search cases, evidence, documents...</span>
        <kbd className="pointer-events-none ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          Ctrl+K
        </kbd>
      </button>

      {/* Command palette (rendered here, portal-based) */}
      <CommandPalette />

      <div className="ml-auto flex items-center gap-2">
        {/* Notification bell with popover */}
        <NotificationBell />

        {/* User pill */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden font-medium sm:inline-block truncate max-w-[120px]">
              {user?.displayName ?? "Loading..."}
            </span>
            {user?.role && (
              <Badge variant="secondary" className="hidden text-[10px] sm:inline-flex">
                {user.role}
              </Badge>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent side="bottom" align="end" sideOffset={8}>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.displayName}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              variant="destructive"
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
