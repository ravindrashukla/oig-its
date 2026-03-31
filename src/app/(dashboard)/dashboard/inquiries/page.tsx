"use client";

import { useState, useCallback } from "react";
import { Search, X, SlidersHorizontal, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";

import {
  useInquiries,
  useConvertInquiry,
  type Inquiry,
  type InquiryFilters,
  type ConvertInquiryResult,
} from "@/hooks/useInquiries";
import {
  DataTable,
  type ColumnDef,
  type SortState,
  type PaginationState,
} from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ─── Source badge ────────────────────────────────────────────

const sourceColors: Record<string, string> = {
  HOTLINE: "bg-orange-100 text-orange-800 border-orange-200",
  WHISTLEBLOWER: "bg-purple-100 text-purple-800 border-purple-200",
  CARRIER: "bg-sky-100 text-sky-800 border-sky-200",
  CONGRESSIONAL: "bg-indigo-100 text-indigo-800 border-indigo-200",
  WALK_IN: "bg-teal-100 text-teal-800 border-teal-200",
  EMAIL: "bg-gray-100 text-gray-800 border-gray-200",
  OTHER: "bg-slate-100 text-slate-800 border-slate-200",
};

function SourceBadge({ source }: { source: string }) {
  return (
    <Badge variant="outline" className={sourceColors[source] || sourceColors.OTHER}>
      {source.replace(/_/g, " ")}
    </Badge>
  );
}

// ─── Status badge ───────────────────────────────────────────

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 border-blue-200",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONVERTED: "bg-green-100 text-green-800 border-green-200",
  CLOSED: "bg-gray-100 text-gray-800 border-gray-200",
};

function InquiryStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={statusColors[status] || statusColors.NEW}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

// ─── Priority badge ─────────────────────────────────────────

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
  MEDIUM: "bg-blue-100 text-blue-700 border-blue-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
};

function InquiryPriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="outline" className={priorityColors[priority] || priorityColors.MEDIUM}>
      {priority}
    </Badge>
  );
}

// ─── Column definitions ─────────────────────────────────────

const baseColumns: ColumnDef<Inquiry>[] = [
  {
    id: "inquiryNumber",
    header: "Inquiry #",
    accessorKey: "inquiryNumber",
    sortable: true,
    className: "w-[140px]",
    cell: (row) => (
      <span className="font-mono text-xs">{row.inquiryNumber}</span>
    ),
  },
  {
    id: "source",
    header: "Source",
    accessorKey: "source",
    sortable: true,
    className: "w-[140px]",
    cell: (row) => <SourceBadge source={row.source} />,
  },
  {
    id: "subject",
    header: "Subject",
    accessorKey: "subject",
    sortable: true,
    cell: (row) => (
      <span className="font-medium truncate max-w-[250px] block">
        {row.subject}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    sortable: true,
    className: "w-[130px]",
    cell: (row) => <InquiryStatusBadge status={row.status} />,
  },
  {
    id: "priority",
    header: "Priority",
    accessorKey: "priority",
    sortable: true,
    className: "w-[100px]",
    cell: (row) => <InquiryPriorityBadge priority={row.priority} />,
  },
  {
    id: "assignedTo",
    header: "Assigned To",
    sortable: false,
    className: "w-[150px]",
    cell: (row) =>
      row.assignedTo ? (
        <span className="text-xs">
          {row.assignedTo.firstName} {row.assignedTo.lastName}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Unassigned</span>
      ),
  },
  {
    id: "receivedAt",
    header: "Received",
    accessorKey: "receivedAt",
    sortable: true,
    className: "w-[110px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {format(new Date(row.receivedAt), "MMM d, yyyy")}
      </span>
    ),
  },
];

// ─── Case type options for conversion ───────────────────────

const caseTypeOptions = [
  "FRAUD",
  "WASTE",
  "ABUSE",
  "MISCONDUCT",
  "WHISTLEBLOWER",
  "COMPLIANCE",
  "OUTREACH",
  "BRIEFING",
  "OTHER",
];

const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** Map inquiry category to a default case type */
function defaultCaseTypeFromCategory(category: string | null, source: string): string {
  if (source === "WHISTLEBLOWER") return "WHISTLEBLOWER";
  if (!category) return "OTHER";
  const upper = category.toUpperCase();
  if (upper.includes("FRAUD")) return "FRAUD";
  if (upper.includes("WASTE")) return "WASTE";
  if (upper.includes("ABUSE")) return "ABUSE";
  if (upper.includes("MISCONDUCT")) return "MISCONDUCT";
  if (upper.includes("COMPLIANCE")) return "COMPLIANCE";
  return "OTHER";
}

// ─── Filter options ─────────────────────────────────────────

const sourceOptions = [
  "HOTLINE",
  "WHISTLEBLOWER",
  "CARRIER",
  "CONGRESSIONAL",
  "WALK_IN",
  "EMAIL",
  "OTHER",
];
const statusOptions = ["NEW", "UNDER_REVIEW", "CONVERTED", "CLOSED"];

function enumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page component ─────────────────────────────────────────

export default function InquiriesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [source, setSource] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [sort, setSort] = useState<SortState>({
    column: "receivedAt",
    direction: "desc",
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [convertDialogInquiry, setConvertDialogInquiry] = useState<Inquiry | null>(null);
  const [convertTitle, setConvertTitle] = useState("");
  const [convertCaseType, setConvertCaseType] = useState("OTHER");
  const [convertPriority, setConvertPriority] = useState("MEDIUM");
  const [convertResult, setConvertResult] = useState<ConvertInquiryResult | null>(null);

  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const convertMutation = useConvertInquiry();

  function openConvertDialog(inquiry: Inquiry) {
    setConvertDialogInquiry(inquiry);
    setConvertTitle(inquiry.subject);
    setConvertCaseType(defaultCaseTypeFromCategory(inquiry.category, inquiry.source));
    setConvertPriority(inquiry.priority || "MEDIUM");
    setConvertResult(null);
  }

  function closeConvertDialog() {
    setConvertDialogInquiry(null);
    setConvertResult(null);
  }

  function handleConvertSubmit() {
    if (!convertDialogInquiry) return;
    convertMutation.mutate(
      {
        inquiryId: convertDialogInquiry.id,
        title: convertTitle,
        caseType: convertCaseType,
        priority: convertPriority,
      },
      {
        onSuccess: (result) => {
          setConvertResult(result);
          setSelectedInquiry(null);
        },
      },
    );
  }

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        setDebouncedSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
      }, 300);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const filters: InquiryFilters = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    sortBy: sort.column,
    sortOrder: sort.direction,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(source && { source }),
    ...(status && { status }),
  };

  const { data, isLoading } = useInquiries(filters);

  const columns: ColumnDef<Inquiry>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "",
      sortable: false,
      className: "w-[120px]",
      cell: (row) =>
        (row.status === "NEW" || row.status === "UNDER_REVIEW") ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              openConvertDialog(row);
            }}
          >
            <ArrowRightLeft className="size-3" />
            Convert
          </Button>
        ) : null,
    },
  ];

  const hasActiveFilters = !!source || !!status;

  function clearFilters() {
    setSource(undefined);
    setStatus(undefined);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function handleSortChange(newSort: SortState) {
    setSort(newSort);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function handleConvert(inquiry: Inquiry) {
    if (inquiry.status === "CONVERTED") return;
    openConvertDialog(inquiry);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inquiries</h1>
        <p className="text-sm text-muted-foreground">
          Manage hotline complaints, whistleblower disclosures, and public
          intake
        </p>
      </div>

      {/* Search + filter toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search inquiries..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Button
          variant={filtersOpen ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="gap-1.5"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {[source, status].filter(Boolean).length}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-4 pt-4 pb-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Source
              </label>
              <Select
                value={source ?? "ALL"}
                onValueChange={(val: string | null) => {
                  setSource(!val || val === "ALL" ? undefined : val);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All sources</SelectItem>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {enumLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={status ?? "ALL"}
                onValueChange={(val: string | null) => {
                  setStatus(!val || val === "ALL" ? undefined : val);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {enumLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <DataTable<Inquiry>
        columns={columns}
        data={data?.data ?? []}
        total={data?.total}
        sort={sort}
        onSortChange={handleSortChange}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => row.id}
        loading={isLoading}
        skeletonRows={pagination.pageSize > 25 ? 25 : pagination.pageSize}
        onRowClick={(row) => setSelectedInquiry(row)}
        emptyMessage="No inquiries match your filters."
        pageSizeOptions={[10, 25, 50, 100]}
      />

      {/* Detail dialog */}
      <Dialog
        open={!!selectedInquiry}
        onOpenChange={(open) => {
          if (!open) setSelectedInquiry(null);
        }}
      >
        {selectedInquiry && (
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {selectedInquiry.inquiryNumber}
                </span>
                <InquiryStatusBadge status={selectedInquiry.status} />
              </DialogTitle>
              <DialogDescription>{selectedInquiry.subject}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Source</span>
                  <div className="mt-1">
                    <SourceBadge source={selectedInquiry.source} />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority</span>
                  <div className="mt-1">
                    <InquiryPriorityBadge
                      priority={selectedInquiry.priority}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Received</span>
                  <p className="font-medium">
                    {format(
                      new Date(selectedInquiry.receivedAt),
                      "MMM d, yyyy h:mm a",
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Anonymous</span>
                  <p className="font-medium">
                    {selectedInquiry.isAnonymous ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {!selectedInquiry.isAnonymous && (
                <div className="text-sm space-y-1">
                  <span className="text-muted-foreground">Complainant</span>
                  {selectedInquiry.complainantName && (
                    <p>{selectedInquiry.complainantName}</p>
                  )}
                  {selectedInquiry.complainantEmail && (
                    <p className="text-muted-foreground">
                      {selectedInquiry.complainantEmail}
                    </p>
                  )}
                  {selectedInquiry.complainantPhone && (
                    <p className="text-muted-foreground">
                      {selectedInquiry.complainantPhone}
                    </p>
                  )}
                </div>
              )}

              <div className="text-sm">
                <span className="text-muted-foreground">Description</span>
                <p className="mt-1 whitespace-pre-wrap">
                  {selectedInquiry.description}
                </p>
              </div>

              {selectedInquiry.assignedTo && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Assigned To</span>
                  <p className="font-medium">
                    {selectedInquiry.assignedTo.firstName}{" "}
                    {selectedInquiry.assignedTo.lastName}
                  </p>
                </div>
              )}

              {selectedInquiry.convertedCase && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Converted Case</span>
                  <p className="font-mono font-medium">
                    {selectedInquiry.convertedCase.caseNumber} &mdash;{" "}
                    {selectedInquiry.convertedCase.title}
                  </p>
                </div>
              )}

              {(selectedInquiry.status === "NEW" ||
                selectedInquiry.status === "UNDER_REVIEW") && (
                  <Button
                    onClick={() => handleConvert(selectedInquiry)}
                    className="w-full gap-2"
                  >
                    <ArrowRightLeft className="size-4" />
                    Convert to Case
                  </Button>
                )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Convert to Case dialog */}
      <Dialog
        open={!!convertDialogInquiry}
        onOpenChange={(open) => {
          if (!open) closeConvertDialog();
        }}
      >
        {convertDialogInquiry && (
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Convert Inquiry to Case</DialogTitle>
              <DialogDescription>
                Converting inquiry{" "}
                <span className="font-mono font-medium">
                  {convertDialogInquiry.inquiryNumber}
                </span>{" "}
                to an investigation case.
              </DialogDescription>
            </DialogHeader>

            {convertResult ? (
              <div className="space-y-4 py-2">
                <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm">
                  <p className="font-medium text-green-800">
                    Case created successfully
                  </p>
                  <p className="mt-1 text-green-700">
                    Case number:{" "}
                    <span className="font-mono font-bold">
                      {convertResult.caseNumber}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={closeConvertDialog}
                  >
                    Close
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      window.location.href = `/dashboard/cases/${convertResult.id}/tasks`;
                    }}
                  >
                    View Case
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="convert-title">Case Title</Label>
                  <Input
                    id="convert-title"
                    value={convertTitle}
                    onChange={(e) => setConvertTitle(e.target.value)}
                    placeholder="Case title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="convert-type">Case Type</Label>
                  <Select
                    value={convertCaseType}
                    onValueChange={(val) => {
                      if (val) setConvertCaseType(val);
                    }}
                  >
                    <SelectTrigger id="convert-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {caseTypeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {enumLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="convert-priority">Priority</Label>
                  <Select
                    value={convertPriority}
                    onValueChange={(val) => {
                      if (val) setConvertPriority(val);
                    }}
                  >
                    <SelectTrigger id="convert-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p} value={p}>
                          {enumLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={closeConvertDialog}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConvertSubmit}
                    disabled={convertMutation.isPending || !convertTitle.trim()}
                    className="gap-2"
                  >
                    <ArrowRightLeft className="size-4" />
                    {convertMutation.isPending ? "Converting..." : "Convert"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
