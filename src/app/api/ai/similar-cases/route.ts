import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { findSimilarCases } from "@/lib/ai/case-similarity";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId");

  if (!caseId) {
    return Response.json(
      { error: "caseId query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const similarCases = await findSimilarCases(caseId, 5);
    return Response.json({ similarCases });
  } catch (err) {
    console.error("[ai/similar-cases] Error:", err);
    return Response.json(
      { error: "Failed to compute similar cases" },
      { status: 500 },
    );
  }
}
