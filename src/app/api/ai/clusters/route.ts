import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { clusterCases } from "@/lib/ai/case-similarity";

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
    const clusters = await clusterCases(5);
    return Response.json({ clusters });
  } catch (err) {
    console.error("[ai/clusters] Error:", err);
    return Response.json(
      { error: "Failed to compute clusters" },
      { status: 500 },
    );
  }
}
