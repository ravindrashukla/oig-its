import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import {
  detectFinancialAnomalies,
  detectCaseAnomalies,
  detectActivityAnomalies,
} from "@/lib/ai/anomaly-detection";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkPermission(session.user.role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [financialAnomalies, caseAnomalies, activityAnomalies] = await Promise.all([
      detectFinancialAnomalies(),
      detectCaseAnomalies(),
      detectActivityAnomalies(),
    ]);

    return Response.json({
      financialAnomalies,
      caseAnomalies,
      activityAnomalies,
    });
  } catch (error) {
    console.error("[ai/anomalies] Error:", error);
    return Response.json({ error: "Failed to detect anomalies" }, { status: 500 });
  }
}
