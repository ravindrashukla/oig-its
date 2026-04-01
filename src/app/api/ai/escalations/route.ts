import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { checkEscalations } from "@/lib/ai/auto-escalation";
import { cacheGet, cacheSet } from "@/lib/cache";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkPermission(session.user.role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const cacheKey = "ai:escalations";
  const cached = cacheGet(cacheKey);
  if (cached) return Response.json(cached);

  try {
    const escalations = await checkEscalations();
    const payload = { escalations };

    cacheSet(cacheKey, payload, 300); // 5 minutes
    return Response.json(payload);
  } catch (error) {
    console.error("[ai/escalations] Error:", error);
    return Response.json(
      { error: "Failed to check escalations" },
      { status: 500 },
    );
  }
}
