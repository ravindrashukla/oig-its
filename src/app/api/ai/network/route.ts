import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import {
  buildInvestigationNetwork,
  detectFraudRings,
} from "@/lib/ai/network-analysis";

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
    const [network, fraudRings] = await Promise.all([
      buildInvestigationNetwork(),
      detectFraudRings(),
    ]);

    return Response.json({
      nodes: network.nodes,
      edges: network.edges,
      hubs: network.hubs,
      fraudRings,
      components: network.components,
    });
  } catch (err) {
    console.error("[ai/network] Error:", err);
    return Response.json(
      { error: "Failed to build network analysis" },
      { status: 500 },
    );
  }
}
