import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import {
  buildInvestigationNetwork,
  detectFraudRings,
} from "@/lib/ai/network-analysis";
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

  const cacheKey = `ai:network:${role}`;
  const cached = cacheGet(cacheKey);
  if (cached) return Response.json(cached);

  try {
    const [network, fraudRings] = await Promise.all([
      buildInvestigationNetwork(),
      detectFraudRings(),
    ]);

    const payload = {
      nodes: network.nodes,
      edges: network.edges,
      hubs: network.hubs,
      fraudRings,
      components: network.components,
    };

    cacheSet(cacheKey, payload, 600); // 10 minutes
    return Response.json(payload);
  } catch (err) {
    console.error("[ai/network] Error:", err);
    return Response.json(
      { error: "Failed to build network analysis" },
      { status: 500 },
    );
  }
}
