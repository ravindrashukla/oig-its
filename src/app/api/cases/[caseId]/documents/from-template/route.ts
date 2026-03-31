import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { buildFileKey, uploadFile } from "@/lib/minio";

// ─── Template definitions (same as document-templates route) ─

interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
}

const TEMPLATES: Record<string, TemplateDefinition> = {
  subpoena: { id: "subpoena", name: "Subpoena", category: "Legal" },
  "memorandum-of-interview": { id: "memorandum-of-interview", name: "Memorandum of Interview", category: "Investigation" },
  "report-of-investigation": { id: "report-of-investigation", name: "Report of Investigation", category: "Investigation" },
  "evidence-receipt": { id: "evidence-receipt", name: "Evidence Receipt", category: "Evidence" },
  "witness-statement": { id: "witness-statement", name: "Witness Statement", category: "Investigation" },
  "case-closure-memo": { id: "case-closure-memo", name: "Case Closure Memo", category: "Administrative" },
};

// ─── POST: Generate document from template ─────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "document:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  // Verify case access
  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    include: {
      subjects: {
        include: {
          subject: { select: { firstName: true, lastName: true, orgName: true, type: true } },
        },
      },
      assignments: {
        where: { removedAt: null },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { templateId } = body as { templateId?: string };

  if (!templateId || !TEMPLATES[templateId]) {
    return Response.json(
      { error: `Invalid templateId. Available: ${Object.keys(TEMPLATES).join(", ")}` },
      { status: 422 },
    );
  }

  const template = TEMPLATES[templateId];

  // Build subject name from first subject if available
  const firstSubject = caseRecord.subjects[0]?.subject;
  const subjectName = firstSubject
    ? firstSubject.type === "INDIVIDUAL"
      ? `${firstSubject.firstName ?? ""} ${firstSubject.lastName ?? ""}`.trim()
      : firstSubject.orgName ?? "N/A"
    : "N/A";

  // Build investigator name from first assignment
  const investigator = caseRecord.assignments[0]?.user
    ? `${caseRecord.assignments[0].user.firstName} ${caseRecord.assignments[0].user.lastName}`
    : "N/A";

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  // Build template data map
  const data: Record<string, string> = {
    caseNumber: caseRecord.caseNumber,
    title: caseRecord.title,
    description: caseRecord.description ?? "N/A",
    caseType: caseRecord.caseType,
    status: caseRecord.status,
    priority: caseRecord.priority,
    jurisdiction: caseRecord.jurisdiction ?? "N/A",
    openedAt: caseRecord.openedAt.toISOString().split("T")[0],
    closedAt: caseRecord.closedAt?.toISOString().split("T")[0] ?? "N/A",
    subjectName,
    investigator,
    dateIssued: dateStr,
  };

  // Generate markdown document
  const content = generateTemplateContent(template, data);

  // Upload to storage
  const fileName = `${template.name.replace(/\s+/g, "_")}_${caseRecord.caseNumber}_${dateStr}.md`;
  const fileKey = buildFileKey(caseId, fileName);
  const buffer = Buffer.from(content, "utf-8");
  await uploadFile(fileKey, buffer, "text/markdown");

  // Create Document record
  const document = await prisma.document.create({
    data: {
      caseId,
      title: `${template.name} - ${caseRecord.caseNumber}`,
      fileName,
      fileKey,
      mimeType: "text/markdown",
      fileSize: buffer.length,
      status: "DRAFT",
      uploadedBy: userId,
    },
    include: {
      _count: { select: { comments: true, accessLogs: true } },
    },
  });

  // Auto-create timeline entry
  await prisma.caseNote.create({
    data: {
      caseId,
      authorId: userId,
      content: `[AUTO] Document generated from template: ${template.name}`,
      isPrivate: false,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "Document",
    entityId: document.id,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      templateId,
      templateName: template.name,
    },
  });

  return Response.json(document, { status: 201 });
}

function generateTemplateContent(
  template: TemplateDefinition,
  data: Record<string, string>,
): string {
  const lines: string[] = [];
  const dateStr = data.dateIssued;

  lines.push(`# ${template.name}`);
  lines.push("");
  lines.push(`**Date:** ${dateStr}`);
  lines.push(`**Case Number:** ${data.caseNumber}`);
  lines.push(`**Case Title:** ${data.title}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  switch (template.id) {
    case "subpoena":
      lines.push("## SUBPOENA");
      lines.push("");
      lines.push(`**TO:** ${data.subjectName}`);
      lines.push("");
      lines.push(`**JURISDICTION:** ${data.jurisdiction}`);
      lines.push("");
      lines.push("You are hereby commanded to appear and testify before the Office of Inspector General");
      lines.push(`in the matter of Case ${data.caseNumber} - ${data.title}.`);
      lines.push("");
      lines.push("**Date of Appearance:** _______________");
      lines.push("**Time:** _______________");
      lines.push("**Location:** _______________");
      lines.push("");
      lines.push("Failure to comply with this subpoena may result in penalties as prescribed by law.");
      lines.push("");
      lines.push("**Issued By:** _______________");
      lines.push(`**Date Issued:** ${dateStr}`);
      break;

    case "memorandum-of-interview":
      lines.push("## MEMORANDUM OF INTERVIEW");
      lines.push("");
      lines.push(`**Interviewee:** ${data.subjectName}`);
      lines.push(`**Interviewer:** ${data.investigator}`);
      lines.push(`**Date of Interview:** ${dateStr}`);
      lines.push("**Location:** _______________");
      lines.push("");
      lines.push("### Summary of Interview");
      lines.push("");
      lines.push("[Enter interview summary here]");
      lines.push("");
      lines.push("### Key Statements");
      lines.push("");
      lines.push("[Enter key statements here]");
      lines.push("");
      lines.push("### Follow-up Actions");
      lines.push("");
      lines.push("- [ ] ");
      break;

    case "report-of-investigation":
      lines.push("## REPORT OF INVESTIGATION");
      lines.push("");
      lines.push(`**Case Type:** ${data.caseType}`);
      lines.push(`**Priority:** ${data.priority}`);
      lines.push(`**Status:** ${data.status}`);
      lines.push(`**Date Opened:** ${data.openedAt}`);
      lines.push(`**Lead Investigator:** ${data.investigator}`);
      lines.push("");
      lines.push("### Background");
      lines.push("");
      lines.push(data.description !== "N/A" ? data.description : "[Enter background information]");
      lines.push("");
      lines.push("### Investigative Activities");
      lines.push("");
      lines.push("[Enter investigative activities conducted]");
      lines.push("");
      lines.push("### Findings");
      lines.push("");
      lines.push("[Enter findings]");
      lines.push("");
      lines.push("### Conclusions and Recommendations");
      lines.push("");
      lines.push("[Enter conclusions and recommendations]");
      break;

    case "evidence-receipt":
      lines.push("## EVIDENCE RECEIPT");
      lines.push("");
      lines.push(`**Received By:** ${data.investigator}`);
      lines.push(`**Date Received:** ${dateStr}`);
      lines.push("");
      lines.push("### Items Received");
      lines.push("");
      lines.push("| # | Description | Quantity | Condition |");
      lines.push("|---|-------------|----------|-----------|");
      lines.push("| 1 |             |          |           |");
      lines.push("");
      lines.push("### Chain of Custody");
      lines.push("");
      lines.push(`Released by: _______________`);
      lines.push(`Received by: ${data.investigator}`);
      lines.push(`Date/Time: ${dateStr}`);
      break;

    case "witness-statement":
      lines.push("## WITNESS STATEMENT");
      lines.push("");
      lines.push(`**Witness Name:** ${data.subjectName}`);
      lines.push(`**Date:** ${dateStr}`);
      lines.push("");
      lines.push("I, the undersigned, hereby provide the following voluntary statement:");
      lines.push("");
      lines.push("[Enter witness statement here]");
      lines.push("");
      lines.push("I declare under penalty of perjury that the foregoing is true and correct.");
      lines.push("");
      lines.push("**Signature:** _______________");
      lines.push(`**Date:** ${dateStr}`);
      break;

    case "case-closure-memo":
      lines.push("## CASE CLOSURE MEMORANDUM");
      lines.push("");
      lines.push(`**Case Type:** ${data.caseType}`);
      lines.push(`**Date Opened:** ${data.openedAt}`);
      lines.push(`**Date Closed:** ${data.closedAt}`);
      lines.push(`**Status:** ${data.status}`);
      lines.push("");
      lines.push("### Case Summary");
      lines.push("");
      lines.push(data.description !== "N/A" ? data.description : "[Enter case summary]");
      lines.push("");
      lines.push("### Disposition");
      lines.push("");
      lines.push("[Enter disposition details]");
      lines.push("");
      lines.push("### Recommendations");
      lines.push("");
      lines.push("[Enter recommendations, if any]");
      lines.push("");
      lines.push("### Approvals");
      lines.push("");
      lines.push("**Investigator:** _______________  **Date:** _______________");
      lines.push("**Supervisor:** _______________  **Date:** _______________");
      break;

    default:
      lines.push("[Template content]");
  }

  lines.push("");
  lines.push("---");
  lines.push(`*Generated on ${dateStr} for Case ${data.caseNumber}*`);

  return lines.join("\n");
}
