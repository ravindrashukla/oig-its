"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  FolderOpen,
  FileText,
  Package,
  ClipboardList,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Users,
  BarChart3,
  FileBarChart,
  Calendar,
  CalendarDays,
  Settings,
  BookOpen,
  Bell,
  ChevronLeft,
  Search,
  Phone,
  DollarSign,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/stores/uiStore";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: { heading: string; items: NavItem[] }[] = [
  {
    heading: "INVESTIGATION",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Cases", href: "/dashboard/cases", icon: FolderOpen },
      { label: "Inquiries", href: "/dashboard/inquiries", icon: Phone },
      { label: "Evidence", href: "/dashboard/evidence", icon: Package },
      { label: "Documents", href: "/dashboard/documents", icon: FileText },
      { label: "Tasks", href: "/dashboard/tasks", icon: ClipboardList },
      { label: "Inventory", href: "/dashboard/inventory", icon: Package },
      { label: "Search", href: "/dashboard/search", icon: Search },
    ],
  },
  {
    heading: "MANAGEMENT",
    items: [
      { label: "Users", href: "/dashboard/users", icon: Users },
      { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
      { label: "Workflows", href: "/dashboard/workflows", icon: Calendar },
      { label: "Timesheets", href: "/dashboard/timesheets", icon: Clock },
      { label: "Approvals", href: "/dashboard/approvals", icon: ClipboardCheck },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
      { label: "Training", href: "/dashboard/training", icon: GraduationCap },
    ],
  },
  {
    heading: "REPORTS",
    items: [
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { label: "Financial", href: "/dashboard/financial", icon: DollarSign },
      { label: "Reports", href: "/dashboard/reports", icon: FileBarChart },
      { label: "AI Insights", href: "/dashboard/ai", icon: Sparkles },
      { label: "Audit Log", href: "/dashboard/audit-log", icon: BookOpen },
    ],
  },
  {
    heading: "SYSTEM",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

const SHORTCUTS_KEY = "oig-its-shortcuts";

const ALL_ROUTES = sections.flatMap((s) => s.items.map((i) => ({ label: i.label, href: i.href })));

interface Shortcut {
  label: string;
  href: string;
}

function loadShortcuts(): Shortcut[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHORTCUTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveShortcuts(shortcuts: Shortcut[]) {
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
}

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [quickLinksOpen, setQuickLinksOpen] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState("");

  useEffect(() => {
    setShortcuts(loadShortcuts());
  }, []);

  const handleAddShortcut = useCallback(() => {
    if (!selectedRoute) return;
    const route = ALL_ROUTES.find((r) => r.href === selectedRoute);
    if (!route) return;
    // Prevent duplicates
    if (shortcuts.some((s) => s.href === route.href)) {
      setAddDialogOpen(false);
      setSelectedRoute("");
      return;
    }
    const updated = [...shortcuts, { label: route.label, href: route.href }];
    setShortcuts(updated);
    saveShortcuts(updated);
    setAddDialogOpen(false);
    setSelectedRoute("");
  }, [selectedRoute, shortcuts]);

  const handleRemoveShortcut = useCallback(
    (href: string) => {
      const updated = shortcuts.filter((s) => s.href !== href);
      setShortcuts(updated);
      saveShortcuts(updated);
    },
    [shortcuts],
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200",
        sidebarCollapsed ? "w-16" : "w-[232px]",
        // Mobile: fixed overlay, hidden by default
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[232px] max-md:shadow-xl",
        mobileSidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Shield className="size-4 text-primary-foreground" />
        </div>
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold tracking-tight truncate">
            OIG-ITS
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          className={cn("ml-auto shrink-0", sidebarCollapsed && "ml-0")}
          onClick={toggleSidebar}
        >
          <ChevronLeft
            className={cn(
              "size-3.5 transition-transform",
              sidebarCollapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      <Separator />

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {sections.map((section) => (
          <div key={section.heading}>
            {!sidebarCollapsed && (
              <span className="mb-1 block px-2 text-[10px] font-semibold tracking-widest text-muted-foreground">
                {section.heading}
              </span>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href + "/"));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        active &&
                          "bg-sidebar-accent text-sidebar-accent-foreground",
                        sidebarCollapsed && "justify-center px-0"
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Quick Links section (WPN10) */}
        {!sidebarCollapsed && (
          <div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setQuickLinksOpen(!quickLinksOpen)}
              onKeyDown={(e) => { if (e.key === "Enter") setQuickLinksOpen(!quickLinksOpen); }}
              className="mb-1 flex w-full cursor-pointer items-center gap-1 px-2 text-[10px] font-semibold tracking-widest text-muted-foreground hover:text-foreground"
            >
              {quickLinksOpen ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              QUICK LINKS
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAddDialogOpen(true);
                }}
                className="ml-auto rounded p-0.5 hover:bg-sidebar-accent"
              >
                <Plus className="size-3" />
              </button>
            </div>
            {quickLinksOpen && (
              <ul className="space-y-0.5">
                {shortcuts.length === 0 && (
                  <li className="px-2 py-1 text-xs text-muted-foreground">
                    No quick links yet
                  </li>
                )}
                {shortcuts.map((s) => {
                  const active = pathname === s.href;
                  return (
                    <li key={s.href} className="group flex items-center">
                      <Link
                        href={s.href}
                        className={cn(
                          "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          active &&
                            "bg-sidebar-accent text-sidebar-accent-foreground",
                        )}
                      >
                        <Star className="size-3.5 shrink-0" />
                        <span className="truncate">{s.label}</span>
                      </Link>
                      <button
                        onClick={() => handleRemoveShortcut(s.href)}
                        className="mr-1 hidden rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </nav>

      {/* Add shortcut dialog */}
      {addDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Add Quick Link</h3>
              <button
                onClick={() => {
                  setAddDialogOpen(false);
                  setSelectedRoute("");
                }}
                className="rounded p-1 hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm mb-3"
            >
              <option value="">Select a page...</option>
              {ALL_ROUTES.filter(
                (r) => !shortcuts.some((s) => s.href === r.href),
              ).map((r) => (
                <option key={r.href} value={r.href}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAddDialogOpen(false);
                  setSelectedRoute("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedRoute}
                onClick={handleAddShortcut}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Y Point branding */}
      <div className="mt-auto border-t border-border px-3 py-2 flex items-center justify-center gap-1.5">
        {!sidebarCollapsed && (
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">by</span>
        )}
        <Image src="/ypoint-logo.png" alt="Y Point" width={sidebarCollapsed ? 24 : 56} height={sidebarCollapsed ? 12 : 28} className="opacity-40 dark:invert" />
      </div>
    </aside>
    </>
  );
}
