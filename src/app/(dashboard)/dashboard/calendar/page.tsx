"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Plus,
  FolderOpen,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3,
} from "lucide-react";
import {
  format,
  isToday,
  isTomorrow,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import {
  useCalendarReminders,
  useCreateReminder,
  type CalendarReminder,
} from "@/hooks/useCalendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function formatDateHeading(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d, yyyy");
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Monthly Calendar Grid ──────────────────────────────

function MonthGrid({
  currentMonth,
  reminders,
  onSelectDay,
  selectedDay,
}: {
  currentMonth: Date;
  reminders: CalendarReminder[];
  onSelectDay: (day: Date) => void;
  selectedDay: Date | null;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Index reminders by date key
  const remindersByDate = useMemo(() => {
    const map: Record<string, CalendarReminder[]> = {};
    for (const r of reminders) {
      const key = format(new Date(r.date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [reminders]);

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px border-b">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-semibold text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayReminders = remindersByDate[dateKey] ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isSelected = selectedDay !== null && isSameDay(day, selectedDay);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDay(day)}
              className={[
                "flex min-h-[80px] flex-col items-start p-1.5 text-left transition-colors border border-transparent rounded",
                !inMonth && "opacity-40",
                today && "bg-primary/5",
                isSelected && "border-primary bg-primary/10",
                "hover:bg-muted/60",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className={[
                  "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today && "bg-primary text-primary-foreground",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {format(day, "d")}
              </span>
              {dayReminders.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayReminders.slice(0, 3).map((r) => (
                    <span
                      key={r.id}
                      className="block h-1.5 w-1.5 rounded-full bg-primary"
                      title={r.title}
                    />
                  ))}
                  {dayReminders.length > 3 && (
                    <span className="text-[9px] text-muted-foreground ml-0.5">
                      +{dayReminders.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day Detail Panel ──────────────────────────────────

function DayDetail({
  day,
  reminders,
}: {
  day: Date;
  reminders: CalendarReminder[];
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const dayReminders = reminders.filter(
    (r) => format(new Date(r.date), "yyyy-MM-dd") === dateKey,
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        {format(day, "EEEE, MMMM d, yyyy")}
        {isToday(day) && (
          <Badge variant="secondary" className="ml-2 text-[10px]">
            Today
          </Badge>
        )}
      </h3>
      {dayReminders.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No reminders for this day.
        </p>
      )}
      {dayReminders.map((reminder) => (
        <Card key={reminder.id}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{reminder.title}</p>
                {reminder.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {reminder.description}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(reminder.date), "h:mm a")}
                  </span>
                  {reminder.isRecurring && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <RefreshCw className="size-2.5" />
                      {reminder.frequency ?? "Recurring"}
                    </Badge>
                  )}
                  {reminder.case && (
                    <Link
                      href={`/dashboard/cases/${reminder.case.id}`}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <FolderOpen className="size-2.5" />
                      {reminder.case.caseNumber}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export default function CalendarPage() {
  useEffect(() => { document.title = "Calendar | OIG-ITS"; }, []);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    isRecurring: false,
    frequency: "",
    caseId: "",
  });
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data, isLoading, error } = useCalendarReminders();
  const createReminder = useCreateReminder();

  const reminders = data?.data ?? [];

  // Group reminders by date (for list view)
  const grouped = useMemo(() => {
    const groups: Record<string, typeof reminders> = {};
    for (const r of reminders) {
      const dateKey = format(new Date(r.date), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(r);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [reminders]);

  function handleSubmit() {
    if (!formData.title || !formData.date) return;
    createReminder.mutate(
      {
        title: formData.title,
        description: formData.description || undefined,
        date: formData.date,
        isRecurring: formData.isRecurring,
        frequency: formData.frequency || undefined,
        caseId: formData.caseId || undefined,
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          setFormData({
            title: "",
            description: "",
            date: "",
            isRecurring: false,
            frequency: "",
            caseId: "",
          });
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming reminders and deadlines
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5" />
          New Reminder
        </Button>
      </div>

      <Separator />

      {/* View mode tabs */}
      <div className="flex items-center justify-between">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "list" | "calendar")}
        >
          <TabsList>
            <TabsTrigger value="calendar" className="gap-1.5">
              <Grid3X3 className="size-3.5" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="size-3.5" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "calendar" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDay(new Date());
              }}
            >
              Today
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            {error.message || "Failed to load calendar."}
          </p>
        </div>
      )}

      {/* Calendar grid view */}
      {!isLoading && !error && viewMode === "calendar" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardContent className="p-2">
              <MonthGrid
                currentMonth={currentMonth}
                reminders={reminders}
                onSelectDay={setSelectedDay}
                selectedDay={selectedDay}
              />
            </CardContent>
          </Card>
          <div>
            {selectedDay ? (
              <DayDetail day={selectedDay} reminders={reminders} />
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <CalendarDays className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Click a day to view its reminders
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {!isLoading && !error && viewMode === "list" && grouped.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CalendarDays className="mx-auto size-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-sm font-medium">No reminders</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            You have no upcoming reminders. Create one to get started.
          </p>
        </div>
      )}

      {!isLoading &&
        !error &&
        viewMode === "list" &&
        grouped.map(([dateKey, items]) => (
          <div key={dateKey} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {formatDateHeading(dateKey)}
            </h3>
            <div className="space-y-2">
              {items.map((reminder) => (
                <Card key={reminder.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
                          <CalendarDays className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium">
                            {reminder.title}
                          </p>
                          {reminder.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">
                              {format(
                                new Date(reminder.date),
                                "h:mm a",
                              )}
                            </span>
                            {reminder.isRecurring && (
                              <Badge
                                variant="outline"
                                className="gap-1 text-[10px]"
                              >
                                <RefreshCw className="size-2.5" />
                                {reminder.frequency
                                  ? reminder.frequency
                                  : "Recurring"}
                              </Badge>
                            )}
                            {reminder.case && (
                              <Link
                                href={`/dashboard/cases/${reminder.case.id}`}
                                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                              >
                                <FolderOpen className="size-2.5" />
                                {reminder.case.caseNumber}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

      {/* Create Reminder Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rem-title">Title</Label>
              <Input
                id="rem-title"
                placeholder="Reminder title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rem-desc">Description</Label>
              <Textarea
                id="rem-desc"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rem-date">Date & Time</Label>
                <Input
                  id="rem-date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rem-case">Case ID (optional)</Label>
                <Input
                  id="rem-case"
                  placeholder="Link to a case"
                  value={formData.caseId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, caseId: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="rem-recurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isRecurring: checked }))
                }
              />
              <Label htmlFor="rem-recurring">Recurring reminder</Label>
            </div>
            {formData.isRecurring && (
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, frequency: v ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.title || !formData.date || createReminder.isPending
              }
            >
              {createReminder.isPending ? "Saving..." : "Create Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
