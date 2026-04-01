import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { scoreEvidenceStrength } from "@/lib/ai/evidence-strength";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkPermission(session.user.role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get("caseId");

  if (!caseId) {
    return Response.json(
      { error: "caseId query parameter is required" },
      { status: 422 },
    );
  }

  try {
    const result = await scoreEvidenceStrength(caseId);
    return Response.json(result);
  } catch (error) {
    console.error("[ai/evidence-strength] Error:", error);
    return Response.json(
      { error: "Failed to score evidence strength" },
      { status: 500 },
    );
  }
}
