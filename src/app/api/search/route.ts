import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { meili, INDEXES } from "@/lib/meilisearch";

/**
 * GET /api/search?q=...&index=cases&limit=20&offset=0&facets=status,priority
 *
 * RRS33: Wildcard / partial match support
 * MeiliSearch supports partial matching (prefix search) by default.
 * Users do not need to add wildcard characters — partial terms automatically
 * match from the beginning of words. For example, searching "inv" will match
 * "investigation", "invoice", "inventory", etc.
 *
 * Query params:
 *   q       – search query (required, min 1 char)
 *   index   – which index to search: cases | evidence | tasks | documents | all (default: all)
 *   limit   – results per index (default 10, max 50)
 *   offset  – pagination offset (default 0)
 *   filter  – MeiliSearch filter string (e.g. "status = ACTIVE AND priority = CRITICAL")
 *   sort    – MeiliSearch sort string (e.g. "createdAt:desc")
 *   facets  – comma-separated facet fields (e.g. "status,priority,caseType")
 *   suggest – if "true", return lightweight suggestions (id + title only, limit 5)
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const indexParam = url.searchParams.get("index") ?? "all";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 10, 1), 50);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  const filter = url.searchParams.get("filter") ?? undefined;
  const sort = url.searchParams.get("sort")?.split(",") ?? undefined;
  const facetsParam = url.searchParams.get("facets");
  const facets = facetsParam ? facetsParam.split(",").map((f) => f.trim()) : undefined;
  const isSuggest = url.searchParams.get("suggest") === "true";

  if (!q) {
    return Response.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  void logAudit({
    userId,
    action: "READ",
    entityType: "Search",
    entityId: indexParam,
    metadata: { q, index: indexParam, limit, offset, isSuggest },
  });

  const searchOpts = {
    limit: isSuggest ? 5 : limit,
    offset: isSuggest ? 0 : offset,
    ...(filter && { filter }),
    ...(sort && !isSuggest && { sort }),
    ...(facets && !isSuggest && { facets }),
    ...(isSuggest && {
      attributesToRetrieve: ["id", "title", "caseNumber", "fileName", "status", "type"],
    }),
  };

  // ─── Suggest mode: search across all indexes quickly ───
  if (isSuggest) {
    const indexNames =
      indexParam === "all"
        ? Object.values(INDEXES)
        : [indexParam];

    const results = await Promise.all(
      indexNames.map(async (name) => {
        try {
          const res = await meili.index(name).search(q, searchOpts);
          return { index: name, hits: res.hits, estimatedTotalHits: res.estimatedTotalHits };
        } catch {
          return { index: name, hits: [], estimatedTotalHits: 0 };
        }
      }),
    );

    return Response.json({ results });
  }

  // ─── Full search mode ──────────────────────────────────
  if (indexParam === "all") {
    const results = await Promise.all(
      Object.values(INDEXES).map(async (name) => {
        try {
          const res = await meili.index(name).search(q, searchOpts);
          return {
            index: name,
            hits: res.hits,
            estimatedTotalHits: res.estimatedTotalHits,
            facetDistribution: res.facetDistribution,
          };
        } catch {
          return { index: name, hits: [], estimatedTotalHits: 0, facetDistribution: {} };
        }
      }),
    );

    return Response.json({ results });
  }

  // ─── Single-index search ───────────────────────────────
  const validIndexes = Object.values(INDEXES) as string[];
  if (!validIndexes.includes(indexParam)) {
    return Response.json(
      { error: `Invalid index. Must be one of: ${validIndexes.join(", ")}, all` },
      { status: 400 },
    );
  }

  const res = await meili.index(indexParam).search(q, searchOpts);

  return Response.json({
    index: indexParam,
    hits: res.hits,
    estimatedTotalHits: res.estimatedTotalHits,
    facetDistribution: res.facetDistribution,
    offset,
    limit,
  });
}
