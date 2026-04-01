import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { clusterCases } from "@/lib/ai/case-similarity";
import { cacheGet, cacheSet } from "@/lib/cache";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const cacheKey = `ai:clusters:${role}`;
  const cached = cacheGet(cacheKey);
  if (cached) return Response.json(cached);

  try {
    const clusters = await clusterCases(5);
    const payload = { clusters };

    cacheSet(cacheKey, payload, 600); // 10 minutes
    return Response.json(payload);
  } catch (err) {
    console.error("[ai/clusters] Error:", err);
    return Response.json(
      { error: "Failed to compute clusters" },
      { status: 500 },
    );
  }
}
