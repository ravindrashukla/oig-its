import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { findDuplicateSubjects } from "@/lib/ai/entity-resolution";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const duplicates = await findDuplicateSubjects();
    return Response.json({ duplicates });
  } catch (err) {
    console.error("[ai/duplicate-subjects] Error:", err);
    return Response.json(
      { error: "Failed to find duplicate subjects" },
      { status: 500 },
    );
  }
}
