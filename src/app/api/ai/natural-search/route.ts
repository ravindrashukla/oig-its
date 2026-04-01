import { askClaude } from "@/lib/ai/claude-client";
import { prisma } from "@/lib/prisma";
import type { CaseStatus, CaseType, Priority } from "@/generated/prisma";

const SYSTEM_PROMPT = `You are a search query translator for an investigation case management system. Convert the user's natural language query into a structured JSON filter. Available fields: status (INTAKE/OPEN/ACTIVE/UNDER_REVIEW/PENDING_ACTION/CLOSED/ARCHIVED), caseType (FRAUD/WASTE/ABUSE/MISCONDUCT/WHISTLEBLOWER/COMPLIANCE/OTHER), priority (LOW/MEDIUM/HIGH/CRITICAL), dateFrom (ISO date), dateTo (ISO date), search (text search), minAmount (number for financial results). Return ONLY valid JSON, no explanation.`;

interface ParsedFilters {
  status?: string;
  caseType?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  minAmount?: number;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { query } = body as { query?: string };
  if (!query || typeof query !== "string") {
    return Response.json(
      { error: "query is required" },
      { status: 422 },
    );
  }

  let filters: ParsedFilters;
  try {
    const raw = await askClaude(SYSTEM_PROMPT, query, 512);
    // Extract JSON from response (strip markdown fences if present)
    const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    filters = JSON.parse(jsonStr);
  } catch (err) {
    console.error("Claude natural-search error:", err);
    const message =
      err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
        ? "AI service is not configured"
        : "Failed to interpret query. Try rephrasing.";
    return Response.json({ error: message }, { status: 503 });
  }

  // Build Prisma where clause from filters
  try {
    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status as CaseStatus;
    }
    if (filters.caseType) {
      where.caseType = filters.caseType as CaseType;
    }
    if (filters.priority) {
      where.priority = filters.priority as Priority;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
        ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
      };
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { caseNumber: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.minAmount) {
      where.financialResults = {
        some: { amount: { gte: filters.minAmount } },
      };
    }

    const results = await prisma.case.findMany({
      where,
      take: 25,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        caseNumber: true,
        title: true,
        status: true,
        caseType: true,
        priority: true,
        createdAt: true,
        description: true,
      },
    });

    return Response.json({
      query,
      filters,
      results,
      resultCount: results.length,
    });
  } catch (err) {
    console.error("Natural search DB error:", err);
    return Response.json(
      { error: "Search failed", filters },
      { status: 500 },
    );
  }
}
