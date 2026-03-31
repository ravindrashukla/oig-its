"use client";

import Link from "next/link";
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

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        sidebarCollapsed ? "w-16" : "w-[232px]"
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
      </nav>
    </aside>
  );
}
