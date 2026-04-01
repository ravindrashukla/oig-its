import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import {
  identifyAtRiskCases,
  predictCaseload,
  predictCaseDuration,
} from "@/lib/ai/predictions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkPermission(session.user.role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [atRiskCases, caseloadForecast, avgPredictedDuration] = await Promise.all([
      identifyAtRiskCases(),
      predictCaseload(),
      // Average predicted duration across common case types
      (async () => {
        const types = ["FRAUD", "WASTE", "ABUSE", "MISCONDUCT", "WHISTLEBLOWER"];
        const predictions: Record<string, number> = {};
        for (const t of types) {
          const p = await predictCaseDuration({ caseType: t, priority: "MEDIUM" });
          predictions[t] = p.predictedDays;
        }
        return predictions;
      })(),
    ]);

    return Response.json({
      atRiskCases,
      caseloadForecast,
      avgPredictedDuration,
    });
  } catch (error) {
    console.error("[ai/predictions] Error:", error);
    return Response.json({ error: "Failed to generate predictions" }, { status: 500 });
  }
}
