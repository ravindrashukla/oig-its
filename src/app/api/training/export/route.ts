import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: Export training records as CSV (TM20) ─────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "training:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Role-based filtering: regular users see only their own records,
  // admins and supervisors see all records
  const isAdminOrSupervisor = role === "ADMIN" || role === "SUPERVISOR";
  const where = isAdminOrSupervisor ? {} : { userId };

  const records = await prisma.trainingRecord.findMany({
    where,
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
      course: {
        select: { title: true, category: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Build CSV
  const headers = [
    "User Name",
    "Email",
    "Course Title",
    "Category",
    "Status",
    "Completion Date",
    "Expiration Date",
    "Score",
    "Hours",
  ];

  const rows = records.map((r) => [
    `${r.user.firstName} ${r.user.lastName}`,
    r.user.email,
    r.course.title,
    r.course.category || "",
    r.status,
    r.completionDate ? r.completionDate.toISOString().split("T")[0] : "",
    r.expirationDate ? r.expirationDate.toISOString().split("T")[0] : "",
    r.score != null ? String(r.score) : "",
    r.hours != null ? String(r.hours) : "",
  ]);

  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
    ),
  ];
  const csv = csvLines.join("\n");

  void logAudit({
    userId,
    action: "EXPORT",
    entityType: "TrainingRecord",
    entityId: "csv-export",
    metadata: { recordCount: records.length, isAdminOrSupervisor },
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="training-records-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
