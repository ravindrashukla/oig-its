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
  {
    id: "affidavit",
    name: "Affidavit",
    category: "Legal",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Affiant Name", source: "investigator" },
      { name: "Date", source: "dateIssued" },
      { name: "Jurisdiction", source: "jurisdiction" },
    ],
  },
  {
    id: "search-warrant-application",
    name: "Search Warrant Application",
    category: "Legal",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Applicant", source: "investigator" },
      { name: "Date", source: "dateIssued" },
      { name: "Jurisdiction", source: "jurisdiction" },
      { name: "Subject Name", source: "subjectName" },
    ],
  },
  {
    id: "arrest-warrant",
    name: "Arrest Warrant",
    category: "Legal",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Subject Name", source: "subjectName" },
      { name: "Date Issued", source: "dateIssued" },
      { name: "Jurisdiction", source: "jurisdiction" },
      { name: "Charge", source: "description" },
    ],
  },
  {
    id: "grand-jury-subpoena",
    name: "Grand Jury Subpoena",
    category: "Legal",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Recipient Name", source: "subjectName" },
      { name: "Date Issued", source: "dateIssued" },
      { name: "Appearance Date", source: "dueDate" },
      { name: "Jurisdiction", source: "jurisdiction" },
    ],
  },
  {
    id: "deposition-notice",
    name: "Deposition Notice",
    category: "Legal",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Deponent Name", source: "subjectName" },
      { name: "Date", source: "dateIssued" },
      { name: "Location", source: "jurisdiction" },
    ],
  },
  {
    id: "case-transfer-memo",
    name: "Case Transfer Memo",
    category: "Administrative",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Case Type", source: "caseType" },
      { name: "Transfer Date", source: "dateIssued" },
      { name: "Description", source: "description" },
      { name: "Priority", source: "priority" },
    ],
  },
  {
    id: "investigative-summary",
    name: "Investigative Summary",
    category: "Investigation",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Case Type", source: "caseType" },
      { name: "Priority", source: "priority" },
      { name: "Status", source: "status" },
      { name: "Opened Date", source: "openedAt" },
      { name: "Description", source: "description" },
      { name: "Lead Investigator", source: "investigator" },
    ],
  },
  {
    id: "referral-letter",
    name: "Referral Letter",
    category: "Administrative",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Referred To", source: "subjectName" },
      { name: "Date", source: "dateIssued" },
      { name: "Description", source: "description" },
    ],
  },
  {
    id: "suspension-notice",
    name: "Suspension Notice",
    category: "Administrative",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Employee Name", source: "subjectName" },
      { name: "Effective Date", source: "dateIssued" },
      { name: "Reason", source: "description" },
    ],
  },
  {
    id: "complaint-form",
    name: "Complaint Form",
    category: "Intake",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Complainant Name", source: "subjectName" },
      { name: "Date Received", source: "dateIssued" },
      { name: "Category", source: "caseType" },
      { name: "Description", source: "description" },
      { name: "Priority", source: "priority" },
    ],
  },
  {
    id: "evidence-log-sheet",
    name: "Evidence Log Sheet",
    category: "Evidence",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Date", source: "dateIssued" },
      { name: "Custodian", source: "investigator" },
      { name: "Location", source: "jurisdiction" },
    ],
  },
  {
    id: "interview-schedule",
    name: "Interview Schedule",
    category: "Investigation",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Interviewee", source: "subjectName" },
      { name: "Interview Date", source: "dateIssued" },
      { name: "Investigator", source: "investigator" },
      { name: "Location", source: "jurisdiction" },
    ],
  },
  {
    id: "travel-authorization",
    name: "Travel Authorization",
    category: "Administrative",
    fields: [
      { name: "Case Number", source: "caseNumber" },
      { name: "Case Title", source: "title" },
      { name: "Traveler", source: "investigator" },
      { name: "Travel Date", source: "dateIssued" },
      { name: "Destination", source: "jurisdiction" },
      { name: "Purpose", source: "description" },
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
