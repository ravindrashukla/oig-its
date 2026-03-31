import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { getEditableFields } from "@/lib/field-permissions";

// ─── GET: Return editable fields for current user on this case ──

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true, status: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  const editableFields = getEditableFields(role, caseRecord.status);

  return Response.json({
    caseId,
    caseStatus: caseRecord.status,
    role,
    editableFields,
  });
}
