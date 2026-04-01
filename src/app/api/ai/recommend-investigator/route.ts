import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { recommendInvestigator } from "@/lib/ai/investigator-recommender";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkPermission(session.user.role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = body as {
    caseType?: string;
    priority?: string;
    organizationId?: string;
  };

  if (!data.caseType || !data.priority) {
    return Response.json(
      { error: "caseType and priority are required" },
      { status: 422 },
    );
  }

  try {
    const recommendations = await recommendInvestigator(
      data.caseType,
      data.priority,
      data.organizationId,
    );

    return Response.json({ recommendations });
  } catch (error) {
    console.error("[ai/recommend-investigator] Error:", error);
    return Response.json(
      { error: "Failed to generate investigator recommendations" },
      { status: 500 },
    );
  }
}
