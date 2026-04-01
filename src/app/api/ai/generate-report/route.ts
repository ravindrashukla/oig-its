import { askClaude } from "@/lib/ai/claude-client";
import { prisma } from "@/lib/prisma";

const REPORT_TYPES = ["summary", "narrative", "findings", "recommendation"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

function getSystemPrompt(reportType: ReportType): string {
  return `You are a senior OIG report writer. Generate a professional ${reportType} report for this investigation case. Use formal government report language. Include all relevant facts from the case data. For findings reports, clearly state each finding with supporting evidence. For recommendations, include specific actionable items. Format with clear section headers using markdown. At the end, include a list of section titles used.`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { caseId, reportType } = body as {
    caseId?: string;
    reportType?: string;
  };

  if (!caseId || typeof caseId !== "string") {
    return Response.json({ error: "caseId is required" }, { status: 422 });
  }
  if (!reportType || !REPORT_TYPES.includes(reportType as ReportType)) {
    return Response.json(
      { error: `reportType must be one of: ${REPORT_TYPES.join(", ")}` },
      { status: 422 },
    );
  }

  // Fetch full case data
  let caseData;
  try {
    caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        subjects: { include: { subject: true } },
        violations: true,
        financialResults: true,
        techniques: true,
        referrals: true,
        notes: { orderBy: { createdAt: "desc" }, take: 20 },
        evidenceItems: { take: 30 },
        assignments: {
          where: { removedAt: null },
          include: {
            user: {
              select: { firstName: true, lastName: true, role: true },
            },
          },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  } catch (err) {
    console.error("Generate report DB error:", err);
    return Response.json({ error: "Failed to fetch case data" }, { status: 500 });
  }

  if (!caseData) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  try {
    // Build a comprehensive case summary for Claude
    const caseInfo = JSON.stringify(
      {
        caseNumber: caseData.caseNumber,
        title: caseData.title,
        description: caseData.description,
        caseType: caseData.caseType,
        status: caseData.status,
        priority: caseData.priority,
        openedAt: caseData.openedAt,
        closedAt: caseData.closedAt,
        jurisdiction: caseData.jurisdiction,
        complaintSource: caseData.complaintSource,
        affectedProgram: caseData.affectedProgram,
        subjects: caseData.subjects.map((cs) => ({
          role: cs.role,
          name:
            cs.subject.orgName ||
            [cs.subject.firstName, cs.subject.lastName].filter(Boolean).join(" "),
          type: cs.subject.type,
          notes: cs.notes,
        })),
        violations: caseData.violations.map((v) => ({
          type: v.type,
          title: v.title,
          description: v.description,
          status: v.status,
          disposition: v.disposition,
        })),
        financialResults: caseData.financialResults.map((f) => ({
          type: f.type,
          amount: f.amount,
          description: f.description,
        })),
        techniques: caseData.techniques.map((t) => ({
          type: t.type,
          description: t.description,
          status: t.status,
        })),
        referrals: caseData.referrals.map((r) => ({
          agencyName: r.agencyName,
          agencyType: r.agencyType,
          reason: r.reason,
          status: r.status,
          outcome: r.outcome,
        })),
        notes: caseData.notes.map((n) => ({
          content: n.content,
          createdAt: n.createdAt,
        })),
        evidenceCount: caseData.evidenceItems.length,
        assignedTeam: caseData.assignments.map(
          (a) => `${a.user.firstName} ${a.user.lastName} (${a.role})`,
        ),
        createdBy: `${caseData.createdBy.firstName} ${caseData.createdBy.lastName}`,
      },
      null,
      2,
    );

    const raw = await askClaude(
      getSystemPrompt(reportType as ReportType),
      `Generate a ${reportType} report for the following case:\n\n${caseInfo}`,
      4096,
    );

    // Extract section headers from the report
    const sections = raw
      .split("\n")
      .filter((line) => /^#{1,3}\s/.test(line))
      .map((line) => line.replace(/^#{1,3}\s+/, "").trim());

    const wordCount = raw.split(/\s+/).length;

    return Response.json({
      caseId,
      caseNumber: caseData.caseNumber,
      reportType,
      report: raw,
      wordCount,
      sections,
    });
  } catch (err) {
    console.error("Claude generate-report error:", err);
    const message =
      err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
        ? "AI service is not configured"
        : "Failed to generate report. Please try again.";
    return Response.json({ error: message }, { status: 503 });
  }
}
