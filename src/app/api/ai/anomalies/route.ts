import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import {
  detectFinancialAnomalies,
  detectCaseAnomalies,
  detectActivityAnomalies,
} from "@/lib/ai/anomaly-detection";
import { cacheGet, cacheSet } from "@/lib/cache";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkPermission(session.user.role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const cacheKey = `ai:anomalies:${session.user.role}`;
  const cached = cacheGet(cacheKey);
  if (cached) return Response.json(cached);

  try {
    const [financialAnomalies, caseAnomalies, activityAnomalies] = await Promise.all([
      detectFinancialAnomalies(),
      detectCaseAnomalies(),
      detectActivityAnomalies(),
    ]);

    const payload = {
      financialAnomalies,
      caseAnomalies,
      activityAnomalies,
    };

    cacheSet(cacheKey, payload, 600); // 10 minutes
    return Response.json(payload);
  } catch (error) {
    console.error("[ai/anomalies] Error:", error);
    return Response.json({ error: "Failed to detect anomalies" }, { status: 500 });
  }
}
