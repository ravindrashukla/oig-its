import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── Report types ────────────────────────────────────────────
export const REPORT_TYPES = [
  "CASE_SUMMARY",
  "INVESTIGATION_ACTIVITY",
  "TASK_COMPLETION",
  "EVIDENCE_CHAIN",
  "AUDIT_TRAIL",
  "FINANCIAL",
  "SEMIANNUAL",
  "CUSTOM",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

// ─── GET: List all report definitions ────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "report:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const definitions = await prisma.reportDefinition.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { runs: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "READ",
    entityType: "ReportDefinition",
    entityId: "list",
  });

  return Response.json({ data: definitions });
}

// ─── POST: Create a report definition ────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "report:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, description, type, query, columns, filters } = body;

  if (!name || typeof name !== "string") {
    return Response.json({ error: "name is required" }, { status: 422 });
  }

  if (type && !REPORT_TYPES.includes(type)) {
    return Response.json(
      { error: `Invalid type. Must be one of: ${REPORT_TYPES.join(", ")}` },
      { status: 422 },
    );
  }

  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return Response.json(
      { error: "columns must be a non-empty array" },
      { status: 422 },
    );
  }

  // Store the report type inside the query JSON
  const queryData = {
    ...(query ?? {}),
    _reportType: type ?? "CUSTOM",
  };

  try {
    const definition = await prisma.reportDefinition.create({
      data: {
        name,
        description: description ?? null,
        query: queryData as any,
        columns: columns as any,
        filters: (filters as any) ?? undefined,
        isPublic: true,
      },
      include: {
        _count: { select: { runs: true } },
      },
    });

    void logAudit({
      userId,
      action: "CREATE",
      entityType: "ReportDefinition",
      entityId: definition.id,
      metadata: { name, type },
    });

    return Response.json(definition, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json(
        { error: "A report with this name already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}
