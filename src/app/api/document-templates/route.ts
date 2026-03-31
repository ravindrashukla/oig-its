import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";

// ─── Predefined document templates (EF2) ───────────────────

export interface TemplateField {
  name: string;
  source: string; // dot-path into case data, e.g. "caseNumber", "title", "subjects.0.name"
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  fields: TemplateField[];
}

const TEMPLATES: DocumentTemplate[] = [
  {
    id: "subpoena",
    name: "Subpoena",
    category: "Legal",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Subject Name", source: "subjectName" },
      { name: "Date Issued", source: "dateIssued" },
      { name: "Jurisdiction", source: "jurisdiction" },
    ],
  },
  {
    id: "memorandum-of-interview",
    name: "Memorandum of Interview",
    category: "Investigation",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Interviewee Name", source: "subjectName" },
      { name: "Interview Date", source: "dateIssued" },
      { name: "Investigator", source: "investigator" },
      { name: "Location", source: "jurisdiction" },
    ],
  },
  {
    id: "report-of-investigation",
    name: "Report of Investigation",
    category: "Investigation",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Case Type", source: "caseType" },
      { name: "Priority", source: "priority" },
      { name: "Opened Date", source: "openedAt" },
      { name: "Description", source: "description" },
      { name: "Status", source: "status" },
    ],
  },
  {
    id: "evidence-receipt",
    name: "Evidence Receipt",
    category: "Evidence",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Date Received", source: "dateIssued" },
      { name: "Received By", source: "investigator" },
    ],
  },
  {
    id: "witness-statement",
    name: "Witness Statement",
    category: "Investigation",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Witness Name", source: "subjectName" },
      { name: "Statement Date", source: "dateIssued" },
    ],
  },
  {
    id: "case-closure-memo",
    name: "Case Closure Memo",
    category: "Administrative",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Case Type", source: "caseType" },
      { name: "Opened Date", source: "openedAt" },
      { name: "Closed Date", source: "closedAt" },
      { name: "Description", source: "description" },
      { name: "Status", source: "status" },
    ],
  },
];

// ─── GET: List available document templates ────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user;

  if (!checkPermission(role, "document:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ data: TEMPLATES });
}
