"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  GraduationCap,
  Search,
  X,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Repeat,
} from "lucide-react";
import { format, isPast, addDays, isBefore } from "date-fns";

import {
  useCourses,
  useCreateCourse,
  useTrainingRecords,
  useCreateTrainingRecord,
  useTrainingAssignments,
  useCreateTrainingAssignment,
} from "@/hooks/useTraining";
import type {
  TrainingCourse,
  TrainingRecord,
  TrainingAssignment,
  TrainingCourseFilters,
} from "@/hooks/useTraining";
import {
  DataTable,
  type ColumnDef,
  type PaginationState,
} from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ───────────────────────────────────────────

const CATEGORIES = ["ETHICS", "FIREARMS", "LEGAL", "TECHNICAL", "LEADERSHIP", "SAFETY", "OTHER"];
const METHODS = ["CLASSROOM", "ONLINE", "IN_PERSON", "BLENDED"];
const STATUSES = ["ENROLLED", "IN_PROGRESS", "COMPLETED", "FAILED", "EXPIRED"];

function enumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Status badge helper ─────────────────────────────────

function TrainingStatusBadge({ status }: { status: string }) {
  const variant =
    status === "COMPLETED"
      ? "default"
      : status === "FAILED" || status === "EXPIRED"
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{enumLabel(status)}</Badge>;
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  return <Badge variant="outline">{enumLabel(category)}</Badge>;
}

function MethodBadge({ method }: { method: string | null }) {
  if (!method) return null;
  return <Badge variant="secondary">{enumLabel(method)}</Badge>;
}

// ─── My Training columns ─────────────────────────────────

const recordColumns: ColumnDef<TrainingRecord>[] = [
  {
    id: "courseTitle",
    header: "Course Title",
    sortable: false,
    cell: (row) => (
      <span className="font-medium truncate max-w-[250px] block">
        {row.course.title}
      </span>
    ),
  },
  {
    id: "provider",
    header: "Provider",
    sortable: false,
    className: "w-[140px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.course.provider || "--"}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    sortable: false,
    className: "w-[120px]",
    cell: (row) => <TrainingStatusBadge status={row.status} />,
  },
  {
    id: "completionDate",
    header: "Completed",
    sortable: false,
    className: "w-[110px]",
    cell: (row) =>
      row.completionDate ? (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.completionDate), "MMM d, yyyy")}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">--</span>
      ),
  },
  {
    id: "expirationDate",
    header: "Expires",
    sortable: false,
    className: "w-[110px]",
    cell: (row) => {
      if (!row.expirationDate)
        return <span className="text-xs text-muted-foreground">--</span>;
      const expDate = new Date(row.expirationDate);
      const isExpired = isPast(expDate);
      const isExpiringSoon = !isExpired && isBefore(expDate, addDays(new Date(), 30));
      return (
        <span
          className={`text-xs ${
            isExpired
              ? "text-destructive font-semibold"
              : isExpiringSoon
                ? "text-amber-600 font-medium"
                : "text-muted-foreground"
          }`}
        >
          {format(expDate, "MMM d, yyyy")}
        </span>
      );
    },
  },
  {
    id: "score",
    header: "Score",
    sortable: false,
    className: "w-[80px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.score != null ? `${row.score}%` : "--"}
      </span>
    ),
  },
  {
    id: "hours",
    header: "Hours",
    sortable: false,
    className: "w-[70px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.hours != null ? row.hours : "--"}
      </span>
    ),
  },
];

// ─── Assignment columns ──────────────────────────────────

const assignmentColumns: ColumnDef<TrainingAssignment>[] = [
  {
    id: "course",
    header: "Course",
    sortable: false,
    cell: (row) => (
      <span className="font-medium truncate max-w-[250px] block">
        {row.course.title}
      </span>
    ),
  },
  {
    id: "assignedTo",
    header: "Assigned To",
    sortable: false,
    className: "w-[180px]",
    cell: (row) => (
      <span className="text-xs">
        {row.assignedTo}{" "}
        <Badge variant="outline" className="ml-1">
          {row.assigneeType}
        </Badge>
      </span>
    ),
  },
  {
    id: "dueDate",
    header: "Due Date",
    sortable: false,
    className: "w-[110px]",
    cell: (row) =>
      row.dueDate ? (
        <span
          className={`text-xs ${
            isPast(new Date(row.dueDate))
              ? "text-destructive font-semibold"
              : "text-muted-foreground"
          }`}
        >
          {format(new Date(row.dueDate), "MMM d, yyyy")}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">--</span>
      ),
  },
  {
    id: "assignedBy",
    header: "Assigned By",
    sortable: false,
    className: "w-[150px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.assignedBy.firstName} {row.assignedBy.lastName}
      </span>
    ),
  },
  {
    id: "createdAt",
    header: "Created",
    sortable: false,
    className: "w-[100px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {format(new Date(row.createdAt), "MMM d, yyyy")}
      </span>
    ),
  },
];

// ─── Page component ──────────────────────────────────────

export default function TrainingPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdminOrSupervisor = role === "ADMIN" || role === "SUPERVISOR";

  const [activeTab, setActiveTab] = useState("my-training");

  // My Training state
  const [recordPagination, setRecordPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
  });
  const { data: recordsData, isLoading: recordsLoading } = useTrainingRecords({
    page: recordPagination.page,
    pageSize: recordPagination.pageSize,
  });

  // Course Catalog state
  const [courseSearch, setCourseSearch] = useState("");
  const [debouncedCourseSearch, setDebouncedCourseSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [requiredFilter, setRequiredFilter] = useState<string | undefined>();
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleCourseSearchChange = useCallback(
    (value: string) => {
      setCourseSearch(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        setDebouncedCourseSearch(value);
      }, 300);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const courseFilters: TrainingCourseFilters = {
    page: 1,
    pageSize: 50,
    ...(debouncedCourseSearch && { search: debouncedCourseSearch }),
    ...(categoryFilter && { category: categoryFilter }),
    ...(requiredFilter && { isRequired: requiredFilter }),
    isActive: "true",
  };
  const { data: coursesData, isLoading: coursesLoading } = useCourses(courseFilters);

  // Assignments state
  const [assignmentPagination, setAssignmentPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
  });
  const { data: assignmentsData, isLoading: assignmentsLoading } =
    useTrainingAssignments({
      page: assignmentPagination.page,
      pageSize: assignmentPagination.pageSize,
    });

  // Mutations
  const createCourse = useCreateCourse();
  const createRecord = useCreateTrainingRecord();
  const createAssignment = useCreateTrainingAssignment();

  // Add Course dialog state
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    provider: "",
    category: "",
    method: "",
    duration: "",
    credits: "",
    isRequired: false,
  });

  // Add Assignment dialog state
  const [addAssignmentOpen, setAddAssignmentOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    courseId: "",
    assignedTo: "",
    assigneeType: "USER",
    dueDate: "",
  });

  function handleCreateCourse() {
    createCourse.mutate(
      {
        title: newCourse.title,
        description: newCourse.description || null,
        provider: newCourse.provider || null,
        category: newCourse.category || null,
        method: newCourse.method || null,
        duration: newCourse.duration ? parseFloat(newCourse.duration) : null,
        credits: newCourse.credits ? parseFloat(newCourse.credits) : null,
        isRequired: newCourse.isRequired,
      } as any,
      {
        onSuccess: () => {
          setAddCourseOpen(false);
          setNewCourse({
            title: "",
            description: "",
            provider: "",
            category: "",
            method: "",
            duration: "",
            credits: "",
            isRequired: false,
          });
        },
      },
    );
  }

  function handleEnroll(courseId: string) {
    createRecord.mutate({ courseId, status: "ENROLLED" });
  }

  function handleCreateAssignment() {
    createAssignment.mutate(
      {
        courseId: newAssignment.courseId,
        assignedTo: newAssignment.assignedTo,
        assigneeType: newAssignment.assigneeType,
        dueDate: newAssignment.dueDate || null,
      },
      {
        onSuccess: () => {
          setAddAssignmentOpen(false);
          setNewAssignment({
            courseId: "",
            assignedTo: "",
            assigneeType: "USER",
            dueDate: "",
          });
        },
      },
    );
  }

  // Summary metrics from records
  const records = recordsData?.data ?? [];
  const completed = records.filter((r) => r.status === "COMPLETED").length;
  const inProgress = records.filter(
    (r) => r.status === "IN_PROGRESS" || r.status === "ENROLLED",
  ).length;
  const requiredRemaining = records.filter(
    (r) => r.course.isRequired && r.status !== "COMPLETED",
  ).length;
  const expiringSoon = records.filter((r) => {
    if (!r.expirationDate) return false;
    const exp = new Date(r.expirationDate);
    return !isPast(exp) && isBefore(exp, addDays(new Date(), 30));
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Training</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage training courses, records, and assignments
          </p>
        </div>
        {isAdminOrSupervisor && (
          <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-3.5" />
                  Add Course
                </Button>
              }
            />
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Training Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Title *</Label>
                  <Input
                    value={newCourse.title}
                    onChange={(e) =>
                      setNewCourse((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="Course title"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea
                    value={newCourse.description}
                    onChange={(e) =>
                      setNewCourse((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Course description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Provider</Label>
                    <Input
                      value={newCourse.provider}
                      onChange={(e) =>
                        setNewCourse((p) => ({
                          ...p,
                          provider: e.target.value,
                        }))
                      }
                      placeholder="Provider name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select
                      value={newCourse.category || "NONE"}
                      onValueChange={(val) =>
                        setNewCourse((p) => ({
                          ...p,
                          category: val === "NONE" ? "" : (val ?? ""),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {enumLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Method</Label>
                    <Select
                      value={newCourse.method || "NONE"}
                      onValueChange={(val) =>
                        setNewCourse((p) => ({
                          ...p,
                          method: val === "NONE" ? "" : (val ?? ""),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {enumLabel(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number"
                      value={newCourse.duration}
                      onChange={(e) =>
                        setNewCourse((p) => ({
                          ...p,
                          duration: e.target.value,
                        }))
                      }
                      placeholder="e.g. 8"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Credits</Label>
                    <Input
                      type="number"
                      value={newCourse.credits}
                      onChange={(e) =>
                        setNewCourse((p) => ({
                          ...p,
                          credits: e.target.value,
                        }))
                      }
                      placeholder="e.g. 2"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newCourse.isRequired}
                        onChange={(e) =>
                          setNewCourse((p) => ({
                            ...p,
                            isRequired: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      Required training
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setAddCourseOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCourse}
                    disabled={
                      !newCourse.title.trim() || createCourse.isPending
                    }
                  >
                    {createCourse.isPending ? "Creating..." : "Create Course"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-training">My Training</TabsTrigger>
          <TabsTrigger value="catalog">Course Catalog</TabsTrigger>
          {isAdminOrSupervisor && (
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          )}
        </TabsList>

        {/* ─── My Training Tab ──────────────────────────────── */}
        <TabsContent value="my-training" className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <CheckCircle2 className="size-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <Clock className="size-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <BookOpen className="size-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{requiredRemaining}</p>
                  <p className="text-xs text-muted-foreground">
                    Required Remaining
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <AlertTriangle className="size-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{expiringSoon}</p>
                  <p className="text-xs text-muted-foreground">
                    Expiring Soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable<TrainingRecord>
            columns={recordColumns}
            data={recordsData?.data ?? []}
            total={recordsData?.total}
            pagination={recordPagination}
            onPaginationChange={setRecordPagination}
            getRowId={(row) => row.id}
            loading={recordsLoading}
            skeletonRows={10}
            emptyMessage="No training records found."
            pageSizeOptions={[10, 25, 50]}
          />
        </TabsContent>

        {/* ─── Course Catalog Tab ───────────────────────────── */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={courseSearch}
                onChange={(e) => handleCourseSearchChange(e.target.value)}
                className="pl-8"
              />
              {courseSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setCourseSearch("");
                    setDebouncedCourseSearch("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Select
              value={categoryFilter ?? "ALL"}
              onValueChange={(val) =>
                setCategoryFilter(val === "ALL" ? undefined : (val ?? undefined))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {enumLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* TM14: Required filter */}
            <Select
              value={requiredFilter ?? "ALL"}
              onValueChange={(val) =>
                setRequiredFilter(val === "ALL" ? undefined : (val ?? undefined))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All courses</SelectItem>
                <SelectItem value="true">Required only</SelectItem>
                <SelectItem value="false">Optional only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="space-y-3 pt-4 pb-4">
                    <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (coursesData?.data ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No courses match your filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(coursesData?.data ?? []).map((course) => (
                <Card key={course.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">
                        {course.title}
                      </CardTitle>
                      {course.isRequired && (
                        <Badge variant="destructive" className="shrink-0">
                          Required
                        </Badge>
                      )}
                    </div>
                    {course.provider && (
                      <p className="text-xs text-muted-foreground">
                        {course.provider}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      <CategoryBadge category={course.category} />
                      <MethodBadge method={course.method} />
                      {course.duration != null && (
                        <Badge variant="outline">
                          <Clock className="mr-1 size-3" />
                          {course.duration}h
                        </Badge>
                      )}
                      {/* TM14: Repeating course badge */}
                      {(course as any).isRepeating && (
                        <Badge variant="secondary" className="gap-1">
                          <Repeat className="size-3" />
                          {(course as any).repeatInterval === "ANNUAL"
                            ? "Annual"
                            : (course as any).repeatInterval === "BIENNIAL"
                              ? "Biennial"
                              : (course as any).repeatInterval === "QUARTERLY"
                                ? "Quarterly"
                                : (course as any).repeatInterval
                                  ? enumLabel((course as any).repeatInterval)
                                  : "Repeating"}
                        </Badge>
                      )}
                    </div>
                    {course.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-auto w-full"
                      onClick={() => handleEnroll(course.id)}
                      disabled={createRecord.isPending}
                    >
                      Enroll
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Assignments Tab (admin/supervisor) ───────────── */}
        {isAdminOrSupervisor && (
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Training course assignments by user, role, or group
              </p>
              <Dialog
                open={addAssignmentOpen}
                onOpenChange={setAddAssignmentOpen}
              >
                <DialogTrigger
                  render={
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Plus className="size-3.5" />
                      New Assignment
                    </Button>
                  }
                />
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Assign Training Course</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <Label>Course *</Label>
                      <Select
                        value={newAssignment.courseId || "NONE"}
                        onValueChange={(val) =>
                          setNewAssignment((p) => ({
                            ...p,
                            courseId: val === "NONE" ? "" : (val ?? ""),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Select a course</SelectItem>
                          {(coursesData?.data ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Assignee Type *</Label>
                      <Select
                        value={newAssignment.assigneeType}
                        onValueChange={(val) =>
                          setNewAssignment((p) => ({
                            ...p,
                            assigneeType: val ?? "USER",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">User</SelectItem>
                          <SelectItem value="ROLE">Role</SelectItem>
                          <SelectItem value="GROUP">Group</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Assigned To *</Label>
                      <Input
                        value={newAssignment.assignedTo}
                        onChange={(e) =>
                          setNewAssignment((p) => ({
                            ...p,
                            assignedTo: e.target.value,
                          }))
                        }
                        placeholder={
                          newAssignment.assigneeType === "USER"
                            ? "User ID or email"
                            : newAssignment.assigneeType === "ROLE"
                              ? "Role name (e.g. INVESTIGATOR)"
                              : "Group name"
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={newAssignment.dueDate}
                        onChange={(e) =>
                          setNewAssignment((p) => ({
                            ...p,
                            dueDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setAddAssignmentOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateAssignment}
                        disabled={
                          !newAssignment.courseId ||
                          !newAssignment.assignedTo.trim() ||
                          createAssignment.isPending
                        }
                      >
                        {createAssignment.isPending
                          ? "Assigning..."
                          : "Assign"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <DataTable<TrainingAssignment>
              columns={assignmentColumns}
              data={assignmentsData?.data ?? []}
              total={assignmentsData?.total}
              pagination={assignmentPagination}
              onPaginationChange={setAssignmentPagination}
              getRowId={(row) => row.id}
              loading={assignmentsLoading}
              skeletonRows={10}
              emptyMessage="No training assignments found."
              pageSizeOptions={[10, 25, 50]}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
