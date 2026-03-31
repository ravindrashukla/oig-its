import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { CaseStatus, CaseType, Priority } from "@/generated/prisma";
import * as XLSX from "xlsx";

// ─── GET: Export cases as CSV or JSON ───────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "csv";
  const status = url.searchParams.get("status") as CaseStatus | undefined;
  const caseType = url.searchParams.get("caseType") as CaseType | undefined;
  const priority = url.searchParams.get("priority") as Priority | undefined;

  if (format !== "csv" && format !== "json" && format !== "xlsx") {
    return Response.json(
      { error: "Invalid format. Must be 'csv', 'json', or 'xlsx'" },
      { status: 400 },
    );
  }

  const accessFilter = getCaseAccessFilter(role, userId);

  const where = {
    ...accessFilter,
    ...(status && { status }),
    ...(caseType && { caseType }),
    ...(priority && { priority }),
  };

  const cases = await prisma.case.findMany({
    where,
    include: {
      assignments: {
        where: { removedAt: null },
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  void logAudit({
    userId,
    action: "EXPORT",
    entityType: "Case",
    entityId: "bulk",
    metadata: { format, filters: { status, caseType, priority }, count: cases.length },
  });

  if (format === "json") {
    const jsonData = cases.map((c) => ({
      caseNumber: c.caseNumber,
      title: c.title,
      caseType: c.caseType,
      status: c.status,
      priority: c.priority,
      openedAt: c.openedAt?.toISOString() ?? "",
      closedAt: c.closedAt?.toISOString() ?? "",
      dueDate: c.dueDate?.toISOString() ?? "",
      assignedTo: c.assignments
        .map((a) => `${a.user.firstName} ${a.user.lastName}`)
        .join("; "),
      jurisdiction: c.jurisdiction ?? "",
    }));

    return new Response(JSON.stringify(jsonData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="cases-export-${Date.now()}.json"`,
      },
    });
  }

  // ─── XLSX format ───────────────────────────────────────────
  if (format === "xlsx") {
    const xlsxData = cases.map((c) => ({
      "Case Number": c.caseNumber,
      "Title": c.title,
      "Type": c.caseType,
      "Status": c.status,
      "Priority": c.priority,
      "Opened": c.openedAt?.toISOString() ?? "",
      "Closed": c.closedAt?.toISOString() ?? "",
      "Due Date": c.dueDate?.toISOString() ?? "",
      "Assigned To": c.assignments
        .map((a) => `${a.user.firstName} ${a.user.lastName}`)
        .join("; "),
      "Jurisdiction": c.jurisdiction ?? "",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(xlsxData);
    XLSX.utils.book_append_sheet(wb, ws, "Cases");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="cases-export-${Date.now()}.xlsx"`,
      },
    });
  }

  // ─── CSV format ────────────────────────────────────────────
  const headers = [
    "Case Number",
    "Title",
    "Type",
    "Status",
    "Priority",
    "Opened",
    "Closed",
    "Due Date",
    "Assigned To",
    "Jurisdiction",
  ];

  const escapeCSV = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const rows = cases.map((c) => [
    escapeCSV(c.caseNumber),
    escapeCSV(c.title),
    escapeCSV(c.caseType),
    escapeCSV(c.status),
    escapeCSV(c.priority),
    escapeCSV(c.openedAt?.toISOString() ?? ""),
    escapeCSV(c.closedAt?.toISOString() ?? ""),
    escapeCSV(c.dueDate?.toISOString() ?? ""),
    escapeCSV(
      c.assignments
        .map((a) => `${a.user.firstName} ${a.user.lastName}`)
        .join("; "),
    ),
    escapeCSV(c.jurisdiction ?? ""),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cases-export-${Date.now()}.csv"`,
    },
  });
}
