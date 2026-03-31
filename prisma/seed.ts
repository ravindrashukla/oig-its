import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { UserRole, CaseType, CaseStatus, Priority, EvidenceType, EvidenceStatus, TaskStatus, DocumentStatus, SubjectType, SubjectRole, NotificationType, AuditAction } from "../src/generated/prisma/enums.ts";
import { hashSync } from "bcryptjs";
import { faker } from "@faker-js/faker";
import { fullSync } from "../src/lib/meilisearch.ts";

faker.seed(42);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://oig:oig_dev_2026@localhost:5432/oig_its",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PASSWORD_HASH = hashSync("Demo2026!", 12);

interface SeedUser {
  firstName: string;
  lastName: string;
  role: string;
  badge: string;
  division: string;
}

const users: SeedUser[] = [
  // 15 INVESTIGATOR
  { firstName: "Marcus", lastName: "Williams", role: UserRole.INVESTIGATOR, badge: "OIG-1001", division: "Fraud & Financial Crimes" },
  { firstName: "Elena", lastName: "Rodriguez", role: UserRole.INVESTIGATOR, badge: "OIG-1002", division: "Fraud & Financial Crimes" },
  { firstName: "James", lastName: "Chen", role: UserRole.INVESTIGATOR, badge: "OIG-1003", division: "Fraud & Financial Crimes" },
  { firstName: "Aisha", lastName: "Patel", role: UserRole.INVESTIGATOR, badge: "OIG-1004", division: "Waste & Abuse" },
  { firstName: "Robert", lastName: "Kim", role: UserRole.INVESTIGATOR, badge: "OIG-1005", division: "Waste & Abuse" },
  { firstName: "Danielle", lastName: "Thompson", role: UserRole.INVESTIGATOR, badge: "OIG-1006", division: "Waste & Abuse" },
  { firstName: "Kevin", lastName: "O'Brien", role: UserRole.INVESTIGATOR, badge: "OIG-1007", division: "Employee Misconduct" },
  { firstName: "Sarah", lastName: "Jackson", role: UserRole.INVESTIGATOR, badge: "OIG-1008", division: "Employee Misconduct" },
  { firstName: "David", lastName: "Nguyen", role: UserRole.INVESTIGATOR, badge: "OIG-1009", division: "Employee Misconduct" },
  { firstName: "Maria", lastName: "Gonzalez", role: UserRole.INVESTIGATOR, badge: "OIG-1010", division: "Compliance & Audits" },
  { firstName: "Tyler", lastName: "Brooks", role: UserRole.INVESTIGATOR, badge: "OIG-1011", division: "Compliance & Audits" },
  { firstName: "Rachel", lastName: "Foster", role: UserRole.INVESTIGATOR, badge: "OIG-1012", division: "Whistleblower Protection" },
  { firstName: "Andre", lastName: "Mitchell", role: UserRole.INVESTIGATOR, badge: "OIG-1013", division: "Whistleblower Protection" },
  { firstName: "Laura", lastName: "Sullivan", role: UserRole.INVESTIGATOR, badge: "OIG-1014", division: "Fraud & Financial Crimes" },
  { firstName: "Brian", lastName: "Carter", role: UserRole.INVESTIGATOR, badge: "OIG-1015", division: "Waste & Abuse" },
  // SA Johnson — primary investigator for demo
  { firstName: "Samuel", lastName: "Johnson", role: UserRole.INVESTIGATOR, badge: "OIG-1016", division: "Fraud & Financial Crimes" },

  // 4 ANALYST
  { firstName: "Patricia", lastName: "Hawkins", role: UserRole.ANALYST, badge: "OIG-2001", division: "Fraud & Financial Crimes" },
  { firstName: "Michael", lastName: "Reeves", role: UserRole.ANALYST, badge: "OIG-2002", division: "Waste & Abuse" },
  { firstName: "Christine", lastName: "Yamamoto", role: UserRole.ANALYST, badge: "OIG-2003", division: "Employee Misconduct" },
  { firstName: "Gregory", lastName: "Barnes", role: UserRole.ANALYST, badge: "OIG-2004", division: "Compliance & Audits" },

  // 3 SUPERVISOR
  { firstName: "Catherine", lastName: "Monroe", role: UserRole.SUPERVISOR, badge: "OIG-3001", division: "Fraud & Financial Crimes" },
  { firstName: "William", lastName: "Drake", role: UserRole.SUPERVISOR, badge: "OIG-3002", division: "Waste & Abuse" },
  { firstName: "Angela", lastName: "Stewart", role: UserRole.SUPERVISOR, badge: "OIG-3003", division: "Employee Misconduct" },

  // 1 AUDITOR
  { firstName: "Richard", lastName: "Thornton", role: UserRole.AUDITOR, badge: "OIG-4001", division: "Office of the Inspector General" },

  // 2 ADMIN
  { firstName: "Jennifer", lastName: "Park", role: UserRole.ADMIN, badge: "OIG-9001", division: "Information Technology" },
  { firstName: "Thomas", lastName: "Walsh", role: UserRole.ADMIN, badge: "OIG-9002", division: "Information Technology" },
];

// ─── Case generation helpers ────────────────────────────

const CASE_TYPES: string[] = [CaseType.FRAUD, CaseType.WASTE, CaseType.ABUSE, CaseType.MISCONDUCT, CaseType.WHISTLEBLOWER, CaseType.COMPLIANCE, CaseType.OTHER];
const CASE_STATUSES: string[] = [CaseStatus.INTAKE, CaseStatus.OPEN, CaseStatus.ACTIVE, CaseStatus.UNDER_REVIEW, CaseStatus.PENDING_ACTION, CaseStatus.CLOSED, CaseStatus.ARCHIVED];
const PRIORITIES: string[] = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];

function statusChainTo(target: string): string[] {
  const order = [CaseStatus.INTAKE, CaseStatus.OPEN, CaseStatus.ACTIVE, CaseStatus.UNDER_REVIEW, CaseStatus.PENDING_ACTION, CaseStatus.CLOSED, CaseStatus.ARCHIVED];
  const chain: string[] = [CaseStatus.INTAKE];
  const targetIdx = order.indexOf(target);
  for (let i = 1; i <= targetIdx; i++) {
    chain.push(order[i]);
  }
  return chain;
}

function caseTitleForType(type: string): string {
  switch (type) {
    case CaseType.FRAUD:
      return `${faker.helpers.arrayElement(["Procurement", "Contract", "Billing", "Grant", "Travel voucher", "Payroll"])} fraud — ${faker.company.name()}`;
    case CaseType.WASTE:
      return `Wasteful spending: ${faker.helpers.arrayElement(["IT equipment", "Office renovation", "Consulting fees", "Training program", "Fleet vehicles"])}`;
    case CaseType.ABUSE:
      return `Abuse of authority — ${faker.person.jobTitle()} ${faker.helpers.arrayElement(["misuse of position", "resource diversion", "unauthorized access"])}`;
    case CaseType.MISCONDUCT:
      return `Employee misconduct: ${faker.helpers.arrayElement(["policy violation", "conflict of interest", "ethics complaint", "timecard fraud", "harassment allegation"])}`;
    case CaseType.WHISTLEBLOWER:
      return `Whistleblower complaint re: ${faker.helpers.arrayElement(["safety violations", "retaliation", "cover-up", "falsified records", "regulatory non-compliance"])}`;
    case CaseType.COMPLIANCE:
      return `Compliance review — ${faker.helpers.arrayElement(["annual audit finding", "regulatory gap", "policy non-compliance", "reporting discrepancy"])}`;
    default:
      return `${faker.helpers.arrayElement(["Hotline tip", "Congressional inquiry", "External referral", "Management request"])}: ${faker.lorem.sentence(4)}`;
  }
}

interface CaseSeed {
  caseNumber: string;
  title: string;
  description: string;
  caseType: string;
  status: string;
  priority: string;
  openedAt: Date;
  closedAt: Date | null;
  dueDate: Date | null;
  assignToJohnson: boolean;
}

function buildCases(): CaseSeed[] {
  const cases: CaseSeed[] = [];
  let seq = 1;

  // 12 ACTIVE cases assigned to SA Johnson
  for (let i = 0; i < 12; i++) {
    const caseType = faker.helpers.arrayElement(CASE_TYPES);
    const openedAt = faker.date.between({ from: "2025-06-01", to: "2026-03-15" });
    const dueDate = faker.date.between({ from: "2026-04-01", to: "2026-09-30" });
    const year = openedAt.getFullYear();
    cases.push({
      caseNumber: `OIG-${year}-${String(seq).padStart(3, "0")}`,
      title: caseTitleForType(caseType),
      description: faker.lorem.paragraphs(2),
      caseType,
      status: CaseStatus.ACTIVE,
      priority: faker.helpers.arrayElement(PRIORITIES),
      openedAt,
      closedAt: null,
      dueDate,
      assignToJohnson: true,
    });
    seq++;
  }

  // 188 remaining cases — mixed statuses, assigned to random investigators
  for (let i = 0; i < 188; i++) {
    const caseType = faker.helpers.arrayElement(CASE_TYPES);
    const status = faker.helpers.arrayElement(CASE_STATUSES);
    const openedAt = faker.date.between({ from: "2024-01-01", to: "2026-03-28" });
    const year = openedAt.getFullYear();
    const isClosed = status === CaseStatus.CLOSED || status === CaseStatus.ARCHIVED;
    const closedAt = isClosed ? faker.date.between({ from: openedAt, to: "2026-03-29" }) : null;
    const dueDate = isClosed ? null : faker.date.between({ from: "2026-04-01", to: "2026-12-31" });
    cases.push({
      caseNumber: `OIG-${year}-${String(seq).padStart(3, "0")}`,
      title: caseTitleForType(caseType),
      description: faker.lorem.paragraphs(2),
      caseType,
      status,
      priority: faker.helpers.arrayElement(PRIORITIES),
      openedAt,
      closedAt,
      dueDate,
      assignToJohnson: false,
    });
    seq++;
  }

  return cases;
}

// ─── Subject generation helpers ─────────────────────────

const SUBJECT_TYPES: string[] = [SubjectType.INDIVIDUAL, SubjectType.ORGANIZATION, SubjectType.DEPARTMENT, SubjectType.VENDOR, SubjectType.OTHER];
const SUBJECT_ROLES: string[] = [SubjectRole.COMPLAINANT, SubjectRole.RESPONDENT, SubjectRole.WITNESS, SubjectRole.SUBJECT_OF_INTEREST, SubjectRole.INFORMANT, SubjectRole.OTHER];

function buildSubjects(count: number): {
  type: string;
  firstName: string | null;
  lastName: string | null;
  orgName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}[] {
  const subjects: ReturnType<typeof buildSubjects> = [];
  for (let i = 0; i < count; i++) {
    const type = faker.helpers.weightedArrayElement([
      { value: SubjectType.INDIVIDUAL, weight: 50 },
      { value: SubjectType.ORGANIZATION, weight: 20 },
      { value: SubjectType.DEPARTMENT, weight: 10 },
      { value: SubjectType.VENDOR, weight: 15 },
      { value: SubjectType.OTHER, weight: 5 },
    ]);

    const isOrg = type === SubjectType.ORGANIZATION || type === SubjectType.VENDOR || type === SubjectType.DEPARTMENT;

    subjects.push({
      type,
      firstName: isOrg ? null : faker.person.firstName(),
      lastName: isOrg ? null : faker.person.lastName(),
      orgName: isOrg
        ? type === SubjectType.DEPARTMENT
          ? faker.helpers.arrayElement(["Human Resources", "Finance Division", "Procurement Office", "IT Services", "Public Affairs", "Legal Counsel", "Field Operations", "Grants Management", "Facilities Management", "Budget Office"])
          : faker.company.name()
        : null,
      email: faker.number.float({ min: 0, max: 1 }) < 0.7 ? faker.internet.email() : null,
      phone: faker.number.float({ min: 0, max: 1 }) < 0.5 ? faker.phone.number() : null,
      address: faker.number.float({ min: 0, max: 1 }) < 0.4 ? `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state({ abbreviated: true })} ${faker.location.zipCode()}` : null,
      notes: faker.number.float({ min: 0, max: 1 }) < 0.3 ? faker.lorem.sentence() : null,
    });
  }
  return subjects;
}

// ─── Document generation helpers ────────────────────────

const DOC_STATUSES: string[] = [DocumentStatus.DRAFT, DocumentStatus.UPLOADED, DocumentStatus.REVIEWED, DocumentStatus.APPROVED, DocumentStatus.REDACTED, DocumentStatus.ARCHIVED];

const DOC_TEMPLATES: { title: (caseType: string) => string; fileName: () => string; mimeType: string; sizeRange: [number, number] }[] = [
  {
    title: () => `Interview transcript — ${faker.person.fullName()}`,
    fileName: () => `interview_transcript_${faker.string.alphanumeric(8)}.pdf`,
    mimeType: "application/pdf",
    sizeRange: [50_000, 500_000],
  },
  {
    title: () => `Financial analysis report — ${faker.date.recent({ days: 180 }).toISOString().split("T")[0]}`,
    fileName: () => `financial_analysis_${faker.string.alphanumeric(8)}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeRange: [100_000, 2_000_000],
  },
  {
    title: () => `Subpoena response — ${faker.company.name()}`,
    fileName: () => `subpoena_response_${faker.string.alphanumeric(8)}.pdf`,
    mimeType: "application/pdf",
    sizeRange: [200_000, 5_000_000],
  },
  {
    title: (caseType) => `${caseType} investigation memo`,
    fileName: () => `investigation_memo_${faker.string.alphanumeric(8)}.docx`,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeRange: [30_000, 300_000],
  },
  {
    title: () => `Evidence photograph — ${faker.helpers.arrayElement(["facility", "document", "equipment", "scene"])}`,
    fileName: () => `evidence_photo_${faker.string.alphanumeric(8)}.jpg`,
    mimeType: "image/jpeg",
    sizeRange: [500_000, 8_000_000],
  },
  {
    title: () => `Email chain — ${faker.internet.email()} to ${faker.internet.email()}`,
    fileName: () => `email_chain_${faker.string.alphanumeric(8)}.eml`,
    mimeType: "message/rfc822",
    sizeRange: [10_000, 200_000],
  },
  {
    title: () => `Audit workpaper — ${faker.helpers.arrayElement(["procurement", "travel", "payroll", "contracts", "grants"])}`,
    fileName: () => `audit_workpaper_${faker.string.alphanumeric(8)}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeRange: [80_000, 1_500_000],
  },
  {
    title: () => `Witness statement — ${faker.person.fullName()}`,
    fileName: () => `witness_statement_${faker.string.alphanumeric(8)}.pdf`,
    mimeType: "application/pdf",
    sizeRange: [20_000, 150_000],
  },
  {
    title: () => `Policy document — ${faker.helpers.arrayElement(["ethics", "procurement", "travel", "IT security", "whistleblower", "records management"])}`,
    fileName: () => `policy_${faker.string.alphanumeric(8)}.pdf`,
    mimeType: "application/pdf",
    sizeRange: [100_000, 1_000_000],
  },
  {
    title: () => `Bank records — account ending ${faker.string.numeric(4)}`,
    fileName: () => `bank_records_${faker.string.alphanumeric(8)}.pdf`,
    mimeType: "application/pdf",
    sizeRange: [500_000, 10_000_000],
  },
  {
    title: () => `Surveillance log — ${faker.date.recent({ days: 90 }).toISOString().split("T")[0]}`,
    fileName: () => `surveillance_log_${faker.string.alphanumeric(8)}.pdf`,
    mimeType: "application/pdf",
    sizeRange: [15_000, 100_000],
  },
  {
    title: () => `Contract copy — ${faker.company.name()}`,
    fileName: () => `contract_${faker.string.alphanumeric(8)}.pdf`,
    mimeType: "application/pdf",
    sizeRange: [200_000, 3_000_000],
  },
  {
    title: () => `Spreadsheet — ${faker.helpers.arrayElement(["expense tracking", "vendor payments", "time records", "inventory", "purchase orders"])}`,
    fileName: () => `data_${faker.string.alphanumeric(8)}.csv`,
    mimeType: "text/csv",
    sizeRange: [5_000, 500_000],
  },
  {
    title: () => `Case briefing presentation`,
    fileName: () => `briefing_${faker.string.alphanumeric(8)}.pptx`,
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    sizeRange: [1_000_000, 15_000_000],
  },
  {
    title: () => `Forensic analysis report — ${faker.helpers.arrayElement(["hard drive", "email server", "mobile device", "network logs"])}`,
    fileName: () => `forensic_report_${faker.string.alphanumeric(8)}.pdf`,
    mimeType: "application/pdf",
    sizeRange: [300_000, 5_000_000],
  },
];

// ─── Evidence generation helpers ────────────────────────

const EVIDENCE_TYPES: string[] = [EvidenceType.DOCUMENT, EvidenceType.PHOTO, EvidenceType.VIDEO, EvidenceType.AUDIO, EvidenceType.DIGITAL, EvidenceType.PHYSICAL, EvidenceType.TESTIMONY, EvidenceType.OTHER];
const EVIDENCE_STATUSES: string[] = [EvidenceStatus.COLLECTED, EvidenceStatus.IN_REVIEW, EvidenceStatus.VERIFIED, EvidenceStatus.DISPUTED, EvidenceStatus.ARCHIVED];

const CUSTODY_ACTIONS = ["Collected", "Transferred", "Reviewed", "Stored in evidence locker", "Released for analysis", "Returned from lab", "Logged into digital vault", "Checked out for court"];

function evidenceTitleForType(type: string, caseType: string): string {
  switch (type) {
    case EvidenceType.DOCUMENT:
      return faker.helpers.arrayElement([
        `${faker.helpers.arrayElement(["Invoice", "Contract", "Memo", "Email chain", "Purchase order", "Expense report"])} — ${faker.company.name()}`,
        `Signed agreement dated ${faker.date.past({ years: 2 }).toISOString().split("T")[0]}`,
        `Internal correspondence re: ${faker.lorem.words(3)}`,
      ]);
    case EvidenceType.PHOTO:
      return faker.helpers.arrayElement([
        `Photograph of ${faker.helpers.arrayElement(["facility exterior", "office workspace", "document pages", "vehicle plates", "meeting attendees"])}`,
        `Surveillance still — ${faker.date.recent({ days: 90 }).toISOString().split("T")[0]}`,
      ]);
    case EvidenceType.VIDEO:
      return faker.helpers.arrayElement([
        `Security camera footage — ${faker.helpers.arrayElement(["lobby", "parking garage", "server room", "loading dock"])}`,
        `Interview recording — ${faker.person.fullName()}`,
        `Bodycam footage — site visit ${faker.date.recent({ days: 60 }).toISOString().split("T")[0]}`,
      ]);
    case EvidenceType.AUDIO:
      return faker.helpers.arrayElement([
        `Recorded phone call — ${faker.person.fullName()}`,
        `Voicemail message from ${faker.helpers.arrayElement(["hotline", "complainant", "anonymous tipster"])}`,
        `Audio transcript of ${faker.helpers.arrayElement(["interview", "deposition", "hearing"])}`,
      ]);
    case EvidenceType.DIGITAL:
      return faker.helpers.arrayElement([
        `Hard drive image — workstation ${faker.string.alphanumeric(6).toUpperCase()}`,
        `Email archive export — ${faker.internet.email()}`,
        `Database extract — ${faker.helpers.arrayElement(["financial records", "access logs", "transaction history"])}`,
        `USB flash drive contents — seized ${faker.date.recent({ days: 120 }).toISOString().split("T")[0]}`,
      ]);
    case EvidenceType.PHYSICAL:
      return faker.helpers.arrayElement([
        `Seized ${faker.helpers.arrayElement(["laptop", "mobile phone", "tablet", "external hard drive", "paper files"])}`,
        `Physical documents — ${faker.helpers.arrayElement(["filing cabinet contents", "desk drawer items", "mailroom intercept"])}`,
        `Equipment tag #${faker.string.numeric(6)}`,
      ]);
    case EvidenceType.TESTIMONY:
      return faker.helpers.arrayElement([
        `Witness statement — ${faker.person.fullName()}`,
        `Sworn affidavit — ${faker.person.fullName()}`,
        `Deposition transcript — ${faker.person.fullName()}`,
        `Informant debriefing notes — ${faker.date.recent({ days: 45 }).toISOString().split("T")[0]}`,
      ]);
    default:
      return `${faker.helpers.arrayElement(["Miscellaneous", "Supplemental", "Reference"])} evidence — ${faker.lorem.words(3)}`;
  }
}

function evidenceSource(type: string): string {
  switch (type) {
    case EvidenceType.DOCUMENT:
      return faker.helpers.arrayElement(["Subpoena response", "Voluntary disclosure", "Field office seizure", "FOIA request", "Audit workpaper"]);
    case EvidenceType.PHOTO:
    case EvidenceType.VIDEO:
      return faker.helpers.arrayElement(["Building security system", "Investigator field work", "Third-party submission", "Public records"]);
    case EvidenceType.AUDIO:
      return faker.helpers.arrayElement(["OIG hotline recording", "Court-authorized intercept", "Consensual monitoring", "Voicemail system export"]);
    case EvidenceType.DIGITAL:
      return faker.helpers.arrayElement(["IT forensics lab", "Cloud service provider", "System admin export", "Network capture"]);
    case EvidenceType.PHYSICAL:
      return faker.helpers.arrayElement(["Search warrant execution", "Consent search", "Abandoned property", "Turn-in from employee"]);
    case EvidenceType.TESTIMONY:
      return faker.helpers.arrayElement(["In-person interview", "Remote deposition", "Grand jury testimony", "Voluntary walk-in"]);
    default:
      return faker.helpers.arrayElement(["Anonymous tip", "Inter-agency referral", "Congressional referral", "Media report"]);
  }
}

// ─── Task generation helpers ────────────────────────────

const TASK_STATUSES: string[] = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.BLOCKED];

function taskTitleForCaseType(caseType: string): string {
  const commonTasks = [
    "Review initial complaint documentation",
    "Conduct background research on subjects",
    "Schedule witness interview",
    "Draft interview questions",
    "Compile financial records summary",
    "Prepare subpoena request",
    "Update case timeline",
    "Review surveillance footage",
    "Cross-reference with prior cases",
    "Submit interim progress report",
    "Coordinate with legal counsel",
    "Verify witness statements",
    "Request additional records from agency",
    "Analyze digital evidence",
    "Prepare briefing memo for supervisor",
    "Document chain of custody gaps",
    "Follow up on outstanding FOIA request",
    "Review audit trail for anomalies",
    "Schedule site visit",
    "Draft case summary for review",
  ];

  const typeTasks: Record<string, string[]> = {
    [CaseType.FRAUD]: [
      "Trace financial transactions through accounts",
      "Compare invoices against procurement records",
      "Interview contracting officer",
      "Obtain bank records via subpoena",
      "Calculate estimated loss amount",
      "Map vendor relationships",
    ],
    [CaseType.WASTE]: [
      "Document wasteful expenditures with receipts",
      "Compare spending against budget allocations",
      "Interview budget officer",
      "Review purchase card transactions",
      "Assess cost recovery options",
    ],
    [CaseType.ABUSE]: [
      "Document instances of authority misuse",
      "Interview subordinate staff members",
      "Review access logs for unauthorized activity",
      "Obtain personnel records",
      "Compare policy requirements against actions taken",
    ],
    [CaseType.MISCONDUCT]: [
      "Review employee conduct policies",
      "Interview HR representative",
      "Obtain timekeeping records",
      "Review email communications",
      "Document policy violations with evidence",
    ],
    [CaseType.WHISTLEBLOWER]: [
      "Verify retaliation timeline",
      "Interview complainant under protection protocols",
      "Review personnel actions for retaliatory patterns",
      "Coordinate with Whistleblower Protection Program",
      "Assess need for interim relief",
    ],
    [CaseType.COMPLIANCE]: [
      "Map regulatory requirements to current practices",
      "Review compliance training records",
      "Interview compliance officer",
      "Document gaps in required reporting",
      "Prepare corrective action recommendations",
    ],
  };

  const pool = [...commonTasks, ...(typeTasks[caseType] ?? [])];
  return faker.helpers.arrayElement(pool);
}

// ─── Audit log generation helpers ───────────────────────

const AUDIT_ACTIONS: string[] = [AuditAction.CREATE, AuditAction.READ, AuditAction.UPDATE, AuditAction.DELETE, AuditAction.LOGIN, AuditAction.LOGOUT, AuditAction.EXPORT, AuditAction.ASSIGN, AuditAction.STATUS_CHANGE, AuditAction.ACCESS_DENIED];
const AUDIT_ENTITY_TYPES = ["Case", "EvidenceItem", "Document", "Task", "WorkflowInstance", "User", "Notification", "CaseNote", "CaseAssignment", "ChainOfCustody"];

// ─── Main seed ──────────────────────────────────────────

async function main() {
  console.log("Seeding database...\n");

  // ── Organizations ──
  const divisionNames = [...new Set(users.map((u) => u.division))];
  const orgMap = new Map<string, string>();

  for (const name of divisionNames) {
    const org = await prisma.organization.upsert({
      where: { name },
      update: {},
      create: { name, shortName: name.split(" ")[0], isActive: true },
    });
    orgMap.set(name, org.id);
  }

  // ── Users ──
  const userMap = new Map<string, string>();
  for (const u of users) {
    const email = `${u.firstName.toLowerCase()}.${u.lastName.toLowerCase().replace("'", "")}@oig.gov`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        organizationId: orgMap.get(u.division)!,
      },
      create: {
        email,
        passwordHash: PASSWORD_HASH,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        organizationId: orgMap.get(u.division)!,
        isActive: true,
      },
    });
    userMap.set(`${u.firstName} ${u.lastName}`, user.id);
    console.log(`  ✓ ${u.badge} ${u.firstName} ${u.lastName} (${u.role})`);
  }

  const johnsonId = userMap.get("Samuel Johnson")!;
  const investigatorIds = users
    .filter((u) => u.role === UserRole.INVESTIGATOR && u.lastName !== "Johnson")
    .map((u) => userMap.get(`${u.firstName} ${u.lastName}`)!);
  const supervisorIds = users
    .filter((u) => u.role === UserRole.SUPERVISOR)
    .map((u) => userMap.get(`${u.firstName} ${u.lastName}`)!);
  const analystIds = users
    .filter((u) => u.role === UserRole.ANALYST)
    .map((u) => userMap.get(`${u.firstName} ${u.lastName}`)!);
  const allStaffIds = [...investigatorIds, ...supervisorIds, ...analystIds, johnsonId];
  const allUserIds = [...allStaffIds, ...users.filter((u) => u.role === UserRole.ADMIN || u.role === UserRole.AUDITOR).map((u) => userMap.get(`${u.firstName} ${u.lastName}`)!)];

  // ── Cases ──
  const caseDefs = buildCases();
  console.log(`\nSeeding ${caseDefs.length} cases...\n`);

  const caseRecords: { id: string; caseNumber: string; caseType: string; status: string; openedAt: Date; assignToJohnson: boolean; primaryInvestigator: string }[] = [];

  for (const cd of caseDefs) {
    const creatorId = faker.helpers.arrayElement([...investigatorIds, ...supervisorIds]);

    const caseRecord = await prisma.case.upsert({
      where: { caseNumber: cd.caseNumber },
      update: {},
      create: {
        caseNumber: cd.caseNumber,
        title: cd.title,
        description: cd.description,
        caseType: cd.caseType,
        status: cd.status,
        priority: cd.priority,
        createdById: creatorId,
        openedAt: cd.openedAt,
        closedAt: cd.closedAt,
        dueDate: cd.dueDate,
      },
    });

    // ── CaseAssignment ──
    const primaryInvestigator = cd.assignToJohnson
      ? johnsonId
      : faker.helpers.arrayElement(investigatorIds);

    await prisma.caseAssignment.upsert({
      where: { caseId_userId: { caseId: caseRecord.id, userId: primaryInvestigator } },
      update: {},
      create: {
        caseId: caseRecord.id,
        userId: primaryInvestigator,
        role: "lead_investigator",
        assignedAt: cd.openedAt,
      },
    });

    // Randomly add a second assignment (supervisor oversight) ~40% of the time
    if (faker.number.float({ min: 0, max: 1 }) < 0.4) {
      const supId = faker.helpers.arrayElement(supervisorIds);
      await prisma.caseAssignment.upsert({
        where: { caseId_userId: { caseId: caseRecord.id, userId: supId } },
        update: {},
        create: {
          caseId: caseRecord.id,
          userId: supId,
          role: "supervisor",
          assignedAt: cd.openedAt,
        },
      });
    }

    // ── CaseStatusHistory ──
    const chain = statusChainTo(cd.status);
    let historyDate = new Date(cd.openedAt);
    for (let i = 0; i < chain.length; i++) {
      const fromStatus = i === 0 ? null : chain[i - 1];
      const toStatus = chain[i];
      await prisma.caseStatusHistory.create({
        data: {
          caseId: caseRecord.id,
          fromStatus,
          toStatus,
          changedBy: creatorId,
          reason: i === 0 ? "Case created" : faker.helpers.arrayElement([
            "Progressing investigation",
            "Per supervisor directive",
            "Evidence review complete",
            "Awaiting external response",
            "Investigation concluded",
            "Administrative closure",
          ]),
          createdAt: historyDate,
        },
      });
      historyDate = new Date(historyDate.getTime() + faker.number.int({ min: 1, max: 30 }) * 86400000);
    }

    caseRecords.push({
      id: caseRecord.id,
      caseNumber: cd.caseNumber,
      caseType: cd.caseType,
      status: cd.status,
      openedAt: cd.openedAt,
      assignToJohnson: cd.assignToJohnson,
      primaryInvestigator,
    });

    if (caseRecords.length % 50 === 0) {
      console.log(`  ... ${caseRecords.length} cases created`);
    }
  }

  console.log(`  ✓ ${caseDefs.length} cases`);

  // ── Subjects ──
  console.log(`\nSeeding 150 subjects...\n`);

  const subjectDefs = buildSubjects(150);
  const subjectIds: string[] = [];

  for (const sd of subjectDefs) {
    const subject = await prisma.subject.create({
      data: {
        type: sd.type,
        firstName: sd.firstName,
        lastName: sd.lastName,
        orgName: sd.orgName,
        email: sd.email,
        phone: sd.phone,
        address: sd.address,
        notes: sd.notes,
      },
    });
    subjectIds.push(subject.id);
  }

  console.log(`  ✓ 150 subjects`);

  // ── CaseSubject links (each case gets 1-3 subjects) ──
  console.log(`\nLinking subjects to cases...\n`);

  let caseSubjectCount = 0;
  const usedPairs = new Set<string>();

  for (const cr of caseRecords) {
    const numSubjects = faker.number.int({ min: 1, max: 3 });
    const selectedSubjects = faker.helpers.arrayElements(subjectIds, numSubjects);

    for (const subjectId of selectedSubjects) {
      const pairKey = `${cr.id}:${subjectId}`;
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      await prisma.caseSubject.create({
        data: {
          caseId: cr.id,
          subjectId,
          role: faker.helpers.arrayElement(SUBJECT_ROLES),
          notes: faker.number.float({ min: 0, max: 1 }) < 0.3 ? faker.lorem.sentence() : null,
        },
      });
      caseSubjectCount++;
    }
  }

  console.log(`  ✓ ${caseSubjectCount} case-subject links`);

  // ── Documents (800 total) ──
  console.log(`\nSeeding 800 documents...\n`);

  let documentCount = 0;
  const documentIds: string[] = [];

  // Distribute 800 documents across cases (skip archived, weight toward active)
  const docEligibleCases = caseRecords.filter((cr) => cr.status !== CaseStatus.ARCHIVED);
  let docsRemaining = 800;

  while (docsRemaining > 0) {
    for (const cr of docEligibleCases) {
      if (docsRemaining <= 0) break;

      // Active/review cases get more docs
      let numDocs: number;
      if (cr.status === CaseStatus.ACTIVE || cr.status === CaseStatus.UNDER_REVIEW) {
        numDocs = faker.number.int({ min: 3, max: 7 });
      } else if (cr.status === CaseStatus.CLOSED) {
        numDocs = faker.number.int({ min: 2, max: 5 });
      } else {
        numDocs = faker.number.int({ min: 1, max: 3 });
      }

      numDocs = Math.min(numDocs, docsRemaining);

      for (let d = 0; d < numDocs; d++) {
        const template = faker.helpers.arrayElement(DOC_TEMPLATES);
        const uploaderId = faker.helpers.arrayElement(allStaffIds);
        const createdAt = faker.date.between({
          from: cr.openedAt,
          to: new Date(Math.min(Date.now(), cr.openedAt.getTime() + 180 * 86400000)),
        });

        let docStatus: string;
        if (cr.status === CaseStatus.CLOSED) {
          docStatus = faker.helpers.arrayElement([DocumentStatus.APPROVED, DocumentStatus.ARCHIVED]);
        } else if (cr.status === CaseStatus.UNDER_REVIEW) {
          docStatus = faker.helpers.arrayElement([DocumentStatus.REVIEWED, DocumentStatus.APPROVED, DocumentStatus.UPLOADED]);
        } else {
          docStatus = faker.helpers.arrayElement([DocumentStatus.DRAFT, DocumentStatus.UPLOADED, DocumentStatus.REVIEWED]);
        }

        const doc = await prisma.document.create({
          data: {
            caseId: cr.id,
            title: template.title(cr.caseType),
            fileName: template.fileName(),
            fileKey: `cases/${cr.id}/documents/${faker.string.uuid()}`,
            mimeType: template.mimeType,
            fileSize: faker.number.int({ min: template.sizeRange[0], max: template.sizeRange[1] }),
            status: docStatus,
            uploadedBy: uploaderId,
            createdAt,
          },
        });

        documentIds.push(doc.id);
        documentCount++;
      }

      docsRemaining -= numDocs;
    }
  }

  console.log(`  ✓ ${documentCount} documents`);

  // ── Evidence Items with Chain of Custody ──
  console.log(`\nSeeding evidence items with chain of custody...\n`);

  let evidenceCount = 0;
  let custodyCount = 0;

  for (const cr of caseRecords) {
    if (cr.status === CaseStatus.INTAKE) continue;

    // More evidence for active/advanced cases
    const numEvidence = cr.status === CaseStatus.OPEN
      ? faker.number.int({ min: 0, max: 2 })
      : faker.number.int({ min: 2, max: 6 });

    if (numEvidence === 0) continue;

    for (let e = 0; e < numEvidence; e++) {
      const evidenceType = faker.helpers.arrayElement(EVIDENCE_TYPES);

      let evidenceStatus: string;
      if (cr.status === CaseStatus.CLOSED || cr.status === CaseStatus.ARCHIVED) {
        evidenceStatus = faker.helpers.arrayElement([EvidenceStatus.VERIFIED, EvidenceStatus.ARCHIVED]);
      } else if (cr.status === CaseStatus.UNDER_REVIEW || cr.status === CaseStatus.PENDING_ACTION) {
        evidenceStatus = faker.helpers.arrayElement([EvidenceStatus.IN_REVIEW, EvidenceStatus.VERIFIED, EvidenceStatus.DISPUTED]);
      } else {
        evidenceStatus = faker.helpers.arrayElement([EvidenceStatus.COLLECTED, EvidenceStatus.IN_REVIEW]);
      }

      const collectedAt = faker.date.between({
        from: cr.openedAt,
        to: new Date(Math.min(Date.now(), cr.openedAt.getTime() + 180 * 86400000)),
      });

      const evidenceItem = await prisma.evidenceItem.create({
        data: {
          caseId: cr.id,
          type: evidenceType,
          status: evidenceStatus,
          title: evidenceTitleForType(evidenceType, cr.caseType),
          description: faker.lorem.paragraph(),
          source: evidenceSource(evidenceType),
          collectedAt,
        },
      });

      evidenceCount++;

      // Chain of Custody
      const collectorId = cr.primaryInvestigator;
      let custodyDate = new Date(collectedAt);

      await prisma.chainOfCustody.create({
        data: {
          evidenceItemId: evidenceItem.id,
          fromUserId: null,
          toUserId: collectorId,
          action: "Collected",
          notes: `Evidence collected and logged into case ${cr.caseNumber}`,
          occurredAt: custodyDate,
        },
      });
      custodyCount++;

      const numTransfers = evidenceStatus === EvidenceStatus.COLLECTED
        ? faker.number.int({ min: 0, max: 1 })
        : faker.number.int({ min: 1, max: 4 });

      let currentHolder = collectorId;

      for (let t = 0; t < numTransfers; t++) {
        custodyDate = new Date(custodyDate.getTime() + faker.number.int({ min: 1, max: 14 }) * 86400000);
        const candidates = allStaffIds.filter((id) => id !== currentHolder);
        const nextHolder = faker.helpers.arrayElement(candidates);
        const action = faker.helpers.arrayElement(CUSTODY_ACTIONS.filter((a) => a !== "Collected"));

        const notes = faker.helpers.arrayElement([
          `${action} per standard operating procedure`,
          `${action} — requested by supervisor`,
          `${action} for ${faker.helpers.arrayElement(["forensic analysis", "legal review", "supervisory review", "court preparation", "lab processing", "secure storage"])}`,
          `${action} — ref ticket #${faker.string.numeric(5)}`,
          null,
        ]);

        await prisma.chainOfCustody.create({
          data: {
            evidenceItemId: evidenceItem.id,
            fromUserId: currentHolder,
            toUserId: nextHolder,
            action,
            notes,
            occurredAt: custodyDate,
          },
        });

        currentHolder = nextHolder;
        custodyCount++;
      }
    }

    if (evidenceCount % 50 === 0 && evidenceCount > 0) {
      console.log(`  ... ${evidenceCount} evidence items, ${custodyCount} custody entries so far`);
    }
  }

  console.log(`  ✓ ${evidenceCount} evidence items with ${custodyCount} chain of custody entries`);

  // ── Tasks ──
  console.log(`\nSeeding tasks...\n`);

  let taskCount = 0;

  for (const cr of caseRecords) {
    if (cr.status === CaseStatus.ARCHIVED) continue;

    let numTasks: number;
    if (cr.status === CaseStatus.INTAKE) {
      numTasks = faker.number.int({ min: 1, max: 2 });
    } else if (cr.status === CaseStatus.OPEN) {
      numTasks = faker.number.int({ min: 2, max: 4 });
    } else if (cr.status === CaseStatus.CLOSED) {
      numTasks = faker.number.int({ min: 3, max: 5 });
    } else {
      numTasks = faker.number.int({ min: 3, max: 8 });
    }

    const usedTitles = new Set<string>();

    for (let t = 0; t < numTasks; t++) {
      let title: string;
      let attempts = 0;
      do {
        title = taskTitleForCaseType(cr.caseType);
        attempts++;
      } while (usedTitles.has(title) && attempts < 20);
      usedTitles.add(title);

      let taskStatus: string;
      if (cr.status === CaseStatus.CLOSED) {
        taskStatus = faker.helpers.arrayElement([TaskStatus.COMPLETED, TaskStatus.COMPLETED, TaskStatus.CANCELLED]);
      } else if (cr.status === CaseStatus.INTAKE) {
        taskStatus = TaskStatus.PENDING;
      } else {
        taskStatus = faker.helpers.weightedArrayElement([
          { value: TaskStatus.PENDING, weight: 3 },
          { value: TaskStatus.IN_PROGRESS, weight: 4 },
          { value: TaskStatus.COMPLETED, weight: 2 },
          { value: TaskStatus.BLOCKED, weight: 1 },
        ]);
      }

      const taskPriority = faker.helpers.arrayElement(PRIORITIES);

      const assigneeId = faker.number.float({ min: 0, max: 1 }) < 0.8
        ? faker.helpers.arrayElement([cr.primaryInvestigator, ...allStaffIds.slice(0, 5)])
        : null;

      const createdAt = faker.date.between({
        from: cr.openedAt,
        to: new Date(Math.min(Date.now(), cr.openedAt.getTime() + 120 * 86400000)),
      });

      const hasDueDate = faker.number.float({ min: 0, max: 1 }) < 0.7;
      const dueDate = hasDueDate
        ? faker.date.between({ from: createdAt, to: new Date("2026-09-30") })
        : null;

      const completedAt = taskStatus === TaskStatus.COMPLETED
        ? faker.date.between({ from: createdAt, to: new Date(Math.min(Date.now(), createdAt.getTime() + 60 * 86400000)) })
        : null;

      await prisma.task.create({
        data: {
          caseId: cr.id,
          title,
          description: faker.helpers.arrayElement([
            faker.lorem.paragraph(),
            faker.lorem.sentence(),
            null,
          ]),
          status: taskStatus,
          priority: taskPriority,
          assigneeId,
          dueDate,
          completedAt,
          createdAt,
        },
      });

      taskCount++;
    }
  }

  console.log(`  ✓ ${taskCount} tasks`);

  // ── Workflow Definitions ──
  console.log(`\nSeeding workflow definitions...\n`);

  const workflowDefs = [
    {
      name: "Case Intake Review",
      type: "CASE_INTAKE" as const,
      description: "Standard intake review workflow for new cases",
      steps: [
        { name: "Initial Screening", type: "review", assigneeRole: "ANALYST", description: "Review complaint for completeness and jurisdictional authority" },
        { name: "Supervisor Approval", type: "approval", assigneeRole: "SUPERVISOR", description: "Supervisor reviews and approves opening a formal investigation" },
        { name: "Case Assignment", type: "review", assigneeRole: "SUPERVISOR", description: "Assign lead investigator and supporting team" },
      ],
    },
    {
      name: "Investigation Closure",
      type: "CLOSURE" as const,
      description: "Multi-step approval for closing an investigation",
      steps: [
        { name: "Investigator Summary", type: "review", assigneeRole: "INVESTIGATOR", description: "Prepare final investigation summary and findings" },
        { name: "Supervisory Review", type: "approval", assigneeRole: "SUPERVISOR", description: "Review investigation findings and recommendation" },
        { name: "Legal Sufficiency Check", type: "review", assigneeRole: "ANALYST", description: "Verify legal sufficiency of evidence and findings" },
        { name: "Final Approval", type: "approval", assigneeRole: "ADMIN", description: "Final approval to close the investigation" },
      ],
    },
    {
      name: "Evidence Review",
      type: "REVIEW" as const,
      description: "Review and verification of evidence items",
      steps: [
        { name: "Evidence Cataloging", type: "review", assigneeRole: "INVESTIGATOR", description: "Catalog and verify chain of custody" },
        { name: "Technical Analysis", type: "review", assigneeRole: "ANALYST", description: "Perform technical analysis of evidence" },
        { name: "Verification Sign-off", type: "approval", assigneeRole: "SUPERVISOR", description: "Verify evidence integrity and approve for use" },
      ],
    },
    {
      name: "Document Approval",
      type: "REVIEW" as const,
      description: "Approval workflow for sensitive documents",
      steps: [
        { name: "Author Review", type: "review", assigneeRole: "INVESTIGATOR", description: "Author confirms document is complete and accurate" },
        { name: "Supervisor Approval", type: "approval", assigneeRole: "SUPERVISOR", description: "Supervisor reviews and approves for distribution" },
      ],
    },
    {
      name: "Whistleblower Protection Assessment",
      type: "INVESTIGATION" as const,
      description: "Assessment workflow for whistleblower protection cases",
      steps: [
        { name: "Identity Protection Verification", type: "review", assigneeRole: "INVESTIGATOR", description: "Verify all identity protection measures are in place" },
        { name: "Risk Assessment", type: "review", assigneeRole: "ANALYST", description: "Assess retaliation risk and recommend protective measures" },
        { name: "Protection Plan Approval", type: "approval", assigneeRole: "SUPERVISOR", description: "Approve protection plan and monitoring schedule" },
      ],
    },
  ];

  const defMap = new Map<string, string>();

  for (const def of workflowDefs) {
    const record = await prisma.workflowDefinition.upsert({
      where: { name: def.name },
      update: { steps: def.steps, description: def.description },
      create: {
        name: def.name,
        type: def.type,
        description: def.description,
        steps: def.steps,
        isActive: true,
      },
    });
    defMap.set(def.name, record.id);
    console.log(`  ✓ Workflow: ${def.name} (${def.steps.length} steps)`);
  }

  // ── Workflow Instances ──
  console.log(`\nSeeding workflow instances...\n`);

  let workflowCount = 0;
  let actionCount = 0;

  const activeCases = caseRecords.filter(
    (cr) => cr.status !== "ARCHIVED" && cr.status !== "INTAKE"
  );

  for (const cr of activeCases) {
    // ~60% of eligible cases get workflows (increased from 40%)
    if (faker.number.float({ min: 0, max: 1 }) > 0.6) continue;

    const numWorkflows = faker.number.int({ min: 1, max: 2 });
    const selectedDefs = faker.helpers.arrayElements(workflowDefs, numWorkflows);

    for (const def of selectedDefs) {
      const defId = defMap.get(def.name)!;
      const steps = def.steps;

      let currentStep: number;
      let wfStatus: string;

      if (cr.status === "CLOSED") {
        currentStep = steps.length - 1;
        wfStatus = "COMPLETED";
      } else if (cr.status === "PENDING_ACTION" || cr.status === "UNDER_REVIEW") {
        currentStep = faker.number.int({ min: 0, max: Math.min(steps.length - 1, 1) });
        wfStatus = "ACTIVE";
      } else {
        currentStep = faker.number.int({ min: 0, max: steps.length - 1 });
        wfStatus = faker.helpers.weightedArrayElement([
          { value: "ACTIVE", weight: 5 },
          { value: "COMPLETED", weight: 2 },
          { value: "PAUSED", weight: 1 },
        ]);
      }

      const startedAt = faker.date.between({
        from: cr.openedAt,
        to: new Date(Math.min(Date.now(), cr.openedAt.getTime() + 90 * 86400000)),
      });

      const completedAt = wfStatus === "COMPLETED"
        ? faker.date.between({ from: startedAt, to: new Date() })
        : null;

      const instance = await prisma.workflowInstance.create({
        data: {
          definitionId: defId,
          caseId: cr.id,
          status: wfStatus,
          currentStep: wfStatus === "COMPLETED" ? steps.length - 1 : currentStep,
          startedAt,
          completedAt,
        },
      });

      workflowCount++;

      const completedSteps = wfStatus === "COMPLETED" ? steps.length : currentStep;
      let actionDate = new Date(startedAt);

      for (let s = 0; s < completedSteps; s++) {
        const step = steps[s];
        const actorId = faker.helpers.arrayElement(allStaffIds);
        actionDate = new Date(actionDate.getTime() + faker.number.int({ min: 1, max: 7 }) * 86400000);

        const action = step.type === "approval"
          ? faker.helpers.weightedArrayElement([
              { value: "approve", weight: 8 },
              { value: "reject", weight: 1 },
            ])
          : "complete";

        await prisma.workflowStepAction.create({
          data: {
            instanceId: instance.id,
            stepIndex: s,
            action,
            userId: actorId,
            notes: faker.helpers.arrayElement([
              `${step.name} completed per standard procedure`,
              `Reviewed and ${action === "approve" ? "approved" : "completed"}`,
              null,
              `See case notes for details`,
            ]),
            createdAt: actionDate,
          },
        });

        actionCount++;
      }
    }
  }

  console.log(`  ✓ ${workflowCount} workflow instances with ${actionCount} step actions`);

  // ── Notifications ──
  console.log(`\nSeeding notifications...\n`);

  let notificationCount = 0;

  const notificationTypes = [
    "CASE_ASSIGNED", "CASE_UPDATED", "TASK_ASSIGNED", "TASK_DUE",
    "DOCUMENT_UPLOADED", "EVIDENCE_ADDED", "WORKFLOW_ACTION", "SYSTEM_ALERT",
  ] as const;

  const johnsonNotificationTemplates = [
    { type: "CASE_ASSIGNED" as const, title: "New case assigned to you", message: "You have been assigned as lead investigator" },
    { type: "TASK_DUE" as const, title: "Task due soon", message: "A task assigned to you is due within 48 hours" },
    { type: "WORKFLOW_ACTION" as const, title: "Workflow approval required", message: "A workflow step requires your review" },
    { type: "CASE_UPDATED" as const, title: "Case status updated", message: "A case you are assigned to has been updated" },
    { type: "EVIDENCE_ADDED" as const, title: "New evidence added", message: "New evidence has been added to your case" },
    { type: "TASK_ASSIGNED" as const, title: "New task assigned", message: "A new task has been assigned to you" },
    { type: "SYSTEM_ALERT" as const, title: "System maintenance scheduled", message: "The system will undergo maintenance this weekend" },
  ];

  // 25 notifications for Johnson
  for (let i = 0; i < 25; i++) {
    const template = faker.helpers.arrayElement(johnsonNotificationTemplates);
    const caseRef = faker.helpers.arrayElement(caseRecords.filter((cr) => cr.assignToJohnson));

    await prisma.notification.create({
      data: {
        userId: johnsonId,
        type: template.type,
        title: template.title,
        message: `${template.message} — ${caseRef.caseNumber}`,
        link: `/dashboard/cases/${caseRef.id}`,
        isRead: i < 12,
        createdAt: faker.date.between({ from: "2026-03-01", to: "2026-03-30" }),
      },
    });
    notificationCount++;
  }

  // More notifications for all staff
  for (const staffId of allStaffIds) {
    if (staffId === johnsonId) continue;

    const numNotifications = faker.number.int({ min: 5, max: 15 });
    for (let i = 0; i < numNotifications; i++) {
      const nType = faker.helpers.arrayElement(notificationTypes);
      const caseRef = faker.helpers.arrayElement(caseRecords);

      await prisma.notification.create({
        data: {
          userId: staffId,
          type: nType,
          title: faker.helpers.arrayElement([
            "Case assigned to you",
            "Task due reminder",
            "Workflow action needed",
            "New evidence uploaded",
            "Case status changed",
            "Document requires review",
            "Task completed notification",
            "New document uploaded to case",
            "Evidence status updated",
            "Supervisor review requested",
          ]),
          message: `Activity on case ${caseRef.caseNumber}`,
          link: `/dashboard/cases/${caseRef.id}`,
          isRead: faker.number.float({ min: 0, max: 1 }) < 0.5,
          createdAt: faker.date.between({ from: "2026-02-01", to: "2026-03-30" }),
        },
      });
      notificationCount++;
    }
  }

  console.log(`  ✓ ${notificationCount} notifications`);

  // ── Audit Logs (10,000) ──
  console.log(`\nSeeding 10,000 audit logs...\n`);

  const BATCH_SIZE = 500;
  let auditLogCount = 0;

  for (let batch = 0; batch < 10000 / BATCH_SIZE; batch++) {
    const auditBatch: {
      userId: string | null;
      action: string;
      entityType: string;
      entityId: string;
      metadata: object | null;
      ipAddress: string | null;
      createdAt: Date;
    }[] = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const action = faker.helpers.weightedArrayElement([
        { value: AuditAction.READ, weight: 40 },
        { value: AuditAction.UPDATE, weight: 20 },
        { value: AuditAction.CREATE, weight: 15 },
        { value: AuditAction.LOGIN, weight: 8 },
        { value: AuditAction.LOGOUT, weight: 5 },
        { value: AuditAction.STATUS_CHANGE, weight: 5 },
        { value: AuditAction.ASSIGN, weight: 3 },
        { value: AuditAction.EXPORT, weight: 2 },
        { value: AuditAction.DELETE, weight: 1 },
        { value: AuditAction.ACCESS_DENIED, weight: 1 },
      ]);

      const entityType = faker.helpers.weightedArrayElement([
        { value: "Case", weight: 30 },
        { value: "Document", weight: 20 },
        { value: "EvidenceItem", weight: 15 },
        { value: "Task", weight: 15 },
        { value: "User", weight: 5 },
        { value: "WorkflowInstance", weight: 5 },
        { value: "CaseNote", weight: 5 },
        { value: "CaseAssignment", weight: 3 },
        { value: "ChainOfCustody", weight: 2 },
      ]);

      // Pick a real entity ID when possible
      let entityId: string;
      if (entityType === "Case" && caseRecords.length > 0) {
        entityId = faker.helpers.arrayElement(caseRecords).id;
      } else if (entityType === "Document" && documentIds.length > 0) {
        entityId = faker.helpers.arrayElement(documentIds);
      } else {
        entityId = faker.string.alphanumeric(25);
      }

      const userId = action === AuditAction.ACCESS_DENIED
        ? faker.helpers.arrayElement(allUserIds)
        : faker.helpers.arrayElement(allUserIds);

      let metadata: object | null = null;
      if (action === AuditAction.STATUS_CHANGE) {
        metadata = {
          fromStatus: faker.helpers.arrayElement(CASE_STATUSES),
          toStatus: faker.helpers.arrayElement(CASE_STATUSES),
        };
      } else if (action === AuditAction.EXPORT) {
        metadata = {
          format: faker.helpers.arrayElement(["pdf", "csv", "xlsx"]),
          recordCount: faker.number.int({ min: 1, max: 500 }),
        };
      } else if (action === AuditAction.ACCESS_DENIED) {
        metadata = {
          reason: faker.helpers.arrayElement(["Insufficient permissions", "Role restriction", "Case not assigned", "Expired session"]),
          attemptedAction: faker.helpers.arrayElement(["view", "edit", "delete", "export"]),
        };
      } else if (faker.number.float({ min: 0, max: 1 }) < 0.3) {
        metadata = {
          detail: faker.lorem.sentence(),
        };
      }

      auditBatch.push({
        userId,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress: faker.helpers.arrayElement([
          "10.0.1." + faker.number.int({ min: 1, max: 254 }),
          "10.0.2." + faker.number.int({ min: 1, max: 254 }),
          "192.168.1." + faker.number.int({ min: 1, max: 254 }),
          "172.16.0." + faker.number.int({ min: 1, max: 254 }),
          null,
        ]),
        createdAt: faker.date.between({ from: "2025-01-01", to: "2026-03-30" }),
      });
    }

    // Use createMany for batch performance
    await prisma.auditLog.createMany({ data: auditBatch });
    auditLogCount += BATCH_SIZE;
    console.log(`  ... ${auditLogCount} audit logs`);
  }

  console.log(`  ✓ ${auditLogCount} audit logs`);

  // ── Reference Data (RRS35) ──
  console.log("Creating reference data...");

  const referenceDataItems = [
    // ALLEGATION_TYPE
    { category: "ALLEGATION_TYPE", code: "FRAUD", label: "Fraud", sortOrder: 1 },
    { category: "ALLEGATION_TYPE", code: "WASTE", label: "Waste", sortOrder: 2 },
    { category: "ALLEGATION_TYPE", code: "ABUSE", label: "Abuse", sortOrder: 3 },
    { category: "ALLEGATION_TYPE", code: "MISCONDUCT", label: "Misconduct", sortOrder: 4 },
    { category: "ALLEGATION_TYPE", code: "ETHICS_VIOLATION", label: "Ethics Violation", sortOrder: 5 },
    { category: "ALLEGATION_TYPE", code: "CRIMINAL", label: "Criminal Activity", sortOrder: 6 },
    { category: "ALLEGATION_TYPE", code: "REGULATORY", label: "Regulatory Violation", sortOrder: 7 },
    // ALLEGATION_SUBTYPE
    { category: "ALLEGATION_SUBTYPE", code: "PROCUREMENT_FRAUD", label: "Procurement Fraud", sortOrder: 1, metadata: { parentCode: "FRAUD" } },
    { category: "ALLEGATION_SUBTYPE", code: "GRANT_FRAUD", label: "Grant Fraud", sortOrder: 2, metadata: { parentCode: "FRAUD" } },
    { category: "ALLEGATION_SUBTYPE", code: "TRAVEL_FRAUD", label: "Travel Voucher Fraud", sortOrder: 3, metadata: { parentCode: "FRAUD" } },
    { category: "ALLEGATION_SUBTYPE", code: "PAYROLL_FRAUD", label: "Payroll Fraud", sortOrder: 4, metadata: { parentCode: "FRAUD" } },
    { category: "ALLEGATION_SUBTYPE", code: "CONTRACT_FRAUD", label: "Contract Fraud", sortOrder: 5, metadata: { parentCode: "FRAUD" } },
    { category: "ALLEGATION_SUBTYPE", code: "CONFLICT_OF_INTEREST", label: "Conflict of Interest", sortOrder: 6, metadata: { parentCode: "ETHICS_VIOLATION" } },
    { category: "ALLEGATION_SUBTYPE", code: "MISUSE_OF_POSITION", label: "Misuse of Position", sortOrder: 7, metadata: { parentCode: "ABUSE" } },
    { category: "ALLEGATION_SUBTYPE", code: "RETALIATION", label: "Retaliation", sortOrder: 8, metadata: { parentCode: "MISCONDUCT" } },
    // CASE_CLOSURE_REASON
    { category: "CASE_CLOSURE_REASON", code: "SUBSTANTIATED", label: "Substantiated", sortOrder: 1 },
    { category: "CASE_CLOSURE_REASON", code: "UNSUBSTANTIATED", label: "Unsubstantiated", sortOrder: 2 },
    { category: "CASE_CLOSURE_REASON", code: "REFERRED", label: "Referred to Another Agency", sortOrder: 3 },
    { category: "CASE_CLOSURE_REASON", code: "INSUFFICIENT_EVIDENCE", label: "Insufficient Evidence", sortOrder: 4 },
    { category: "CASE_CLOSURE_REASON", code: "SETTLED", label: "Settled", sortOrder: 5 },
    { category: "CASE_CLOSURE_REASON", code: "WITHDRAWN", label: "Complaint Withdrawn", sortOrder: 6 },
    { category: "CASE_CLOSURE_REASON", code: "ADMIN_CLOSURE", label: "Administrative Closure", sortOrder: 7 },
    // CASE_CATEGORY
    { category: "CASE_CATEGORY", code: "HOTLINE", label: "Hotline Complaint", sortOrder: 1 },
    { category: "CASE_CATEGORY", code: "CONGRESSIONAL", label: "Congressional Inquiry", sortOrder: 2 },
    { category: "CASE_CATEGORY", code: "PROACTIVE", label: "Proactive Investigation", sortOrder: 3 },
    { category: "CASE_CATEGORY", code: "REFERRAL", label: "External Referral", sortOrder: 4 },
    { category: "CASE_CATEGORY", code: "MANAGEMENT_REQUEST", label: "Management Request", sortOrder: 5 },
    { category: "CASE_CATEGORY", code: "AUDIT_FINDING", label: "Audit Finding", sortOrder: 6 },
    { category: "CASE_CATEGORY", code: "FOIA", label: "FOIA Request", sortOrder: 7 },
    // VIOLATION_TYPE (RRS35)
    { category: "VIOLATION_TYPE", code: "FRAUD", label: "Fraud", sortOrder: 1 },
    { category: "VIOLATION_TYPE", code: "ETHICS", label: "Ethics", sortOrder: 2 },
    { category: "VIOLATION_TYPE", code: "CRIMINAL", label: "Criminal", sortOrder: 3 },
    { category: "VIOLATION_TYPE", code: "REGULATORY", label: "Regulatory", sortOrder: 4 },
    { category: "VIOLATION_TYPE", code: "CONDUCT", label: "Conduct", sortOrder: 5 },
    // REFERRAL_AGENCY (RRS35)
    { category: "REFERRAL_AGENCY", code: "FBI", label: "FBI", sortOrder: 1 },
    { category: "REFERRAL_AGENCY", code: "DOJ", label: "DOJ", sortOrder: 2 },
    { category: "REFERRAL_AGENCY", code: "SEC", label: "SEC", sortOrder: 3 },
    { category: "REFERRAL_AGENCY", code: "IRS", label: "IRS", sortOrder: 4 },
    { category: "REFERRAL_AGENCY", code: "STATE_AG", label: "State AG", sortOrder: 5 },
    { category: "REFERRAL_AGENCY", code: "LOCAL_PD", label: "Local PD", sortOrder: 6 },
    // TECHNIQUE_TYPE (RRS35)
    { category: "TECHNIQUE_TYPE", code: "INTERVIEW", label: "Interview", sortOrder: 1 },
    { category: "TECHNIQUE_TYPE", code: "SURVEILLANCE", label: "Surveillance", sortOrder: 2 },
    { category: "TECHNIQUE_TYPE", code: "SUBPOENA", label: "Subpoena", sortOrder: 3 },
    { category: "TECHNIQUE_TYPE", code: "SEARCH_WARRANT", label: "Search Warrant", sortOrder: 4 },
    { category: "TECHNIQUE_TYPE", code: "DIGITAL_FORENSICS", label: "Digital Forensics", sortOrder: 5 },
  ];

  for (const item of referenceDataItems) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: item.category, code: item.code } },
      update: { label: item.label, sortOrder: item.sortOrder, metadata: (item as any).metadata ?? null },
      create: item,
    });
  }
  console.log(`  ✓ ${referenceDataItems.length} reference data items`);

  // ── Summary ──
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Seed complete:`);
  console.log(`  ${users.length} users`);
  console.log(`  ${caseDefs.length} cases`);
  console.log(`  150 subjects (${caseSubjectCount} case-subject links)`);
  console.log(`  ${documentCount} documents`);
  console.log(`  ${evidenceCount} evidence items (${custodyCount} custody entries)`);
  console.log(`  ${taskCount} tasks`);
  console.log(`  ${workflowCount} workflows (${actionCount} actions)`);
  console.log(`  ${notificationCount} notifications`);
  console.log(`  ${auditLogCount} audit logs`);
  console.log(`${"═".repeat(60)}\n`);

  // ── Sync to MeiliSearch ──
  console.log("Syncing data to MeiliSearch...\n");
  try {
    const counts = await fullSync(prisma as any);
    console.log(`  ✓ MeiliSearch sync: ${counts.cases} cases, ${counts.evidence} evidence, ${counts.tasks} tasks, ${counts.documents} documents`);
  } catch (e) {
    console.warn("  ⚠ MeiliSearch sync failed (is MeiliSearch running?):", (e as Error).message);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
