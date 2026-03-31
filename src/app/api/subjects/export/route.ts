import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const subjects = await prisma.subject.findMany({
    include: {
      _count: { select: { caseSubjects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  void logAudit({
    userId,
    action: "EXPORT",
    entityType: "Subject",
    entityId: "bulk",
    metadata: { count: subjects.length },
  });

  const escapeCSV = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const headers = [
    "ID",
    "Type",
    "First Name",
    "Last Name",
    "Org Name",
    "Email",
    "Phone",
    "Address",
    "Created",
    "Cases Count",
  ];

  const rows = subjects.map((s) => [
    escapeCSV(s.id),
    escapeCSV(s.type),
    escapeCSV(s.firstName ?? ""),
    escapeCSV(s.lastName ?? ""),
    escapeCSV(s.orgName ?? ""),
    escapeCSV(s.email ?? ""),
    escapeCSV(s.phone ?? ""),
    escapeCSV(s.address ?? ""),
    escapeCSV(s.createdAt.toISOString()),
    String(s._count.caseSubjects),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subjects-export-${Date.now()}.csv"`,
    },
  });
}
