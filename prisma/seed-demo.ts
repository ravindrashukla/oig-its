import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import {
  CaseType,
  CaseStatus,
  Priority,
  SubjectType,
  SubjectRole,
  EvidenceType,
  EvidenceStatus,
} from "../src/generated/prisma/enums.ts";

// ─── Bootstrap Prisma ────────────────────────────────────────

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://oig:oig_dev_2026@localhost:5432/oig_its",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────

/** Return the first user in the database to serve as the creator / author */
async function getDefaultUser() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No users found. Run the main seed first: npx ts-node prisma/seed.ts");
  return user;
}

/** Get several users so we can spread assignments around */
async function getUsers(count: number) {
  return prisma.user.findMany({ take: count, orderBy: { createdAt: "asc" } });
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log("=== OIG-ITS Demo Seed ===\n");

  const defaultUser = await getDefaultUser();
  const users = await getUsers(10);
  const userId = defaultUser.id;
  const userIds = users.map((u) => u.id);

  // Helper to pick a user id by index, wrapping around
  const uid = (i: number) => userIds[i % userIds.length];

  // ─────────────────────────────────────────────────────────
  // CASE 1 — Procurement Fraud Ring
  // ─────────────────────────────────────────────────────────

  const case1 = await prisma.case.upsert({
    where: { caseNumber: "OIG-2026-DEMO-001" },
    update: {},
    create: {
      caseNumber: "OIG-2026-DEMO-001",
      title: "Multi-state procurement fraud ring — Apex Defense Solutions",
      description:
        "Investigation into a multi-state procurement fraud ring involving Apex Defense Solutions, a defense contractor, and multiple shell companies used to inflate contract costs and divert federal funds. The scheme involves coordinated bid-rigging, false invoicing, and wire fraud across three federal agencies.",
      caseType: CaseType.FRAUD,
      status: CaseStatus.ACTIVE,
      priority: Priority.CRITICAL,
      createdById: userId,
      openedAt: new Date("2026-01-15"),
      dueDate: new Date("2026-06-30"),
      jurisdiction: "FEDERAL",
      partnerAgencies: "DOJ Criminal Division, FBI White Collar, DCIS",
      leadAgency: "OPM OIG",
      complaintSource: "HOTLINE",
      crimeType: "Wire Fraud / False Claims",
      investigationApproach: "PROACTIVE",
      affectedProgram: "Federal Procurement",
      suspectType: "VENDOR",
    },
  });

  // Subjects for Case 1
  const subj1_ceo = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Richard",
      lastName: "Harmon",
      email: "r.harmon@apexdefense.example.com",
      phone: "(703) 555-0142",
      address: "4521 Corporate Blvd, Arlington, VA 22201",
      notes: "CEO of Apex Defense Solutions. Primary target of procurement fraud investigation.",
    },
  });

  const subj1_cfo = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Patricia",
      lastName: "Voss",
      email: "p.voss@apexdefense.example.com",
      phone: "(703) 555-0198",
      address: "4521 Corporate Blvd, Arlington, VA 22201",
      notes: "CFO of Apex Defense Solutions. Managed financial accounts used in the scheme.",
    },
  });

  const subj1_shell = await prisma.subject.create({
    data: {
      type: SubjectType.ORGANIZATION,
      orgName: "Triton Logistics LLC",
      address: "PO Box 8841, Wilmington, DE 19801",
      notes: "Shell company believed to be controlled by Harmon. Used to submit fraudulent sub-contracts and launder proceeds.",
    },
  });

  const subj1_whistleblower = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Danielle",
      lastName: "Ortiz",
      email: "d.ortiz.anon@proton.example.com",
      notes: "Former Apex employee who filed the initial complaint via the OIG hotline. Identity protected under whistleblower statutes.",
    },
  });

  // Link subjects to case 1
  await prisma.caseSubject.createMany({
    data: [
      { caseId: case1.id, subjectId: subj1_ceo.id, role: SubjectRole.RESPONDENT, notes: "Primary respondent — CEO" },
      { caseId: case1.id, subjectId: subj1_cfo.id, role: SubjectRole.RESPONDENT, notes: "Co-respondent — CFO" },
      { caseId: case1.id, subjectId: subj1_shell.id, role: SubjectRole.SUBJECT_OF_INTEREST, notes: "Shell entity used to launder proceeds" },
      { caseId: case1.id, subjectId: subj1_whistleblower.id, role: SubjectRole.COMPLAINANT, notes: "Original complainant — identity protected" },
    ],
    skipDuplicates: true,
  });

  // Violations for Case 1
  await prisma.violation.createMany({
    data: [
      { caseId: case1.id, subjectId: subj1_ceo.id, type: "CRIMINAL", title: "Wire Fraud", description: "18 U.S.C. ss 1343 — Use of interstate wire communications to execute a scheme to defraud the United States.", status: "SUBSTANTIATED" },
      { caseId: case1.id, subjectId: subj1_ceo.id, type: "CRIMINAL", title: "False Claims", description: "31 U.S.C. ss 3729 — Submission of false and fraudulent claims for payment to federal agencies.", status: "SUBSTANTIATED" },
      { caseId: case1.id, subjectId: subj1_cfo.id, type: "CRIMINAL", title: "Conspiracy to Defraud", description: "18 U.S.C. ss 371 — Conspiracy to commit wire fraud and submit false claims.", status: "SUBSTANTIATED" },
    ],
  });

  // Financial Results for Case 1
  await prisma.financialResult.createMany({
    data: [
      { caseId: case1.id, subjectId: subj1_ceo.id, type: "RECOVERY", amount: 4500000, description: "Recovery of diverted contract funds through asset forfeiture and civil settlement", status: "APPROVED", resultDate: new Date("2026-03-10") },
      { caseId: case1.id, subjectId: subj1_cfo.id, type: "FINE", amount: 500000, description: "Civil monetary penalty — CFO", status: "APPROVED", resultDate: new Date("2026-03-10") },
      { caseId: case1.id, subjectId: subj1_ceo.id, type: "FINE", amount: 250000, description: "Civil monetary penalty — CEO", status: "APPROVED", resultDate: new Date("2026-03-10") },
    ],
  });

  // Investigative Techniques for Case 1
  await prisma.investigativeTechnique.createMany({
    data: [
      { caseId: case1.id, type: "INTERVIEW", description: "Interview with whistleblower Danielle Ortiz — obtained initial account of inflated invoicing scheme.", date: new Date("2026-01-20"), status: "COMPLETED", findings: "Whistleblower provided detailed accounts of CEO directing fabrication of sub-contractor invoices." },
      { caseId: case1.id, type: "INTERVIEW", description: "Interview with Apex accounts payable clerk — corroborated invoice discrepancies.", date: new Date("2026-02-05"), status: "COMPLETED", findings: "Clerk confirmed irregular payment patterns to Triton Logistics LLC." },
      { caseId: case1.id, type: "INTERVIEW", description: "Interview with contracting officer at DoD — confirmed bid irregularities.", date: new Date("2026-02-18"), status: "COMPLETED", findings: "CO noted that Apex consistently won bids by narrow margins and Triton always appeared as sub-contractor." },
      { caseId: case1.id, type: "SUBPOENA", description: "Subpoena for Apex Defense Solutions financial records (2023-2026).", date: new Date("2026-02-01"), status: "COMPLETED", findings: "Records reveal $4.5M in payments to Triton Logistics with no corresponding deliverables." },
      { caseId: case1.id, type: "SUBPOENA", description: "Bank subpoena — Triton Logistics LLC accounts at First National Bank.", date: new Date("2026-02-15"), status: "COMPLETED", findings: "Funds trace directly to personal accounts of Richard Harmon and Patricia Voss." },
      { caseId: case1.id, type: "DIGITAL_FORENSICS", description: "Forensic imaging of Apex corporate email server and CFO workstation.", date: new Date("2026-03-01"), endDate: new Date("2026-03-15"), status: "COMPLETED", findings: "Recovered deleted emails discussing creation of Triton LLC and coordination of false invoices." },
      { caseId: case1.id, type: "SURVEILLANCE", description: "Physical surveillance of Harmon residence and Triton LLC registered address.", date: new Date("2026-02-20"), endDate: new Date("2026-03-05"), status: "COMPLETED", findings: "Triton registered address is a virtual mailbox. No employees observed." },
    ],
  });

  // Referral for Case 1
  await prisma.referral.create({
    data: {
      caseId: case1.id,
      agencyName: "Department of Justice — Criminal Division, Fraud Section",
      agencyType: "FEDERAL",
      contactName: "AUSA Michael Chen",
      contactEmail: "michael.chen@usdoj.example.gov",
      referralDate: new Date("2026-03-15"),
      reason: "Criminal prosecution referral for wire fraud (18 U.S.C. ss 1343), false claims (31 U.S.C. ss 3729), and conspiracy (18 U.S.C. ss 371). Evidence supports indictment of CEO and CFO.",
      status: "ACCEPTED",
      outcome: "Grand jury convened; indictment expected Q2 2026.",
    },
  });

  // Case Notes for Case 1
  const case1Notes = [
    { content: "Hotline complaint received. Complainant alleges CEO of Apex Defense Solutions directed creation of shell company to inflate contract costs. Assigned for preliminary review.", date: new Date("2026-01-15") },
    { content: "Preliminary review complete. Complaint has merit — public procurement records show Triton Logistics as sub-contractor on 12 contracts totaling $18M. No evidence of Triton performing any actual work. Recommending full investigation.", date: new Date("2026-01-22") },
    { content: "Subpoena returns received from First National Bank. Funds from Triton account traced to personal accounts of Harmon and Voss. Total diverted funds estimated at $4.5M. Coordinating with DOJ Fraud Section for potential criminal referral.", date: new Date("2026-02-28") },
    { content: "Digital forensics team recovered 47 deleted emails from CFO workstation. Emails contain explicit discussions of invoice fabrication and fund diversion. Evidence is strong for conspiracy charge. Preserving chain of custody for prosecution.", date: new Date("2026-03-10") },
    { content: "DOJ accepted criminal referral. AUSA Chen assigned. Grand jury proceedings initiated. Coordinating witness preparation with FBI White Collar Crime unit. Asset freeze order obtained for Triton accounts.", date: new Date("2026-03-20") },
  ];
  for (const note of case1Notes) {
    await prisma.caseNote.create({
      data: { caseId: case1.id, authorId: userId, content: note.content, createdAt: note.date },
    });
  }

  console.log("  [1/5] Procurement Fraud Ring (OIG-2026-DEMO-001)");

  // ─────────────────────────────────────────────────────────
  // CASE 2 — Healthcare Billing Fraud
  // ─────────────────────────────────────────────────────────

  const case2 = await prisma.case.upsert({
    where: { caseNumber: "OIG-2026-DEMO-002" },
    update: {},
    create: {
      caseNumber: "OIG-2026-DEMO-002",
      title: "FEHBP carrier overbilling — MedFirst Insurance Group",
      description:
        "Investigation into systematic overbilling by MedFirst Insurance Group, a Federal Employees Health Benefits Program (FEHBP) carrier. Analysis of claims data reveals inflated reimbursement rates, duplicate billing, and phantom claims for services not rendered. Estimated overpayments exceed $3.2M over a 3-year period.",
      caseType: CaseType.FRAUD,
      status: CaseStatus.UNDER_REVIEW,
      priority: Priority.HIGH,
      createdById: userId,
      openedAt: new Date("2025-11-01"),
      dueDate: new Date("2026-08-15"),
      jurisdiction: "FEDERAL",
      partnerAgencies: "HHS OIG, OPM Healthcare & Insurance",
      leadAgency: "OPM OIG",
      complaintSource: "AUDIT",
      crimeType: "Healthcare Fraud",
      investigationApproach: "PROACTIVE",
      affectedProgram: "FEHBP",
      suspectType: "VENDOR",
    },
  });

  const subj2_insurer = await prisma.subject.create({
    data: {
      type: SubjectType.ORGANIZATION,
      orgName: "MedFirst Insurance Group",
      email: "compliance@medfirst.example.com",
      phone: "(312) 555-0300",
      address: "200 N LaSalle St, Suite 2400, Chicago, IL 60601",
      notes: "FEHBP carrier under investigation for systematic overbilling. Carrier ID: MFG-7742.",
    },
  });

  const subj2_manager = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Kevin",
      lastName: "Driscoll",
      email: "k.driscoll@medfirst.example.com",
      phone: "(312) 555-0315",
      notes: "Senior Claims Manager at MedFirst. Responsible for claims processing unit implicated in the scheme.",
    },
  });

  const subj2_analyst = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Priya",
      lastName: "Sharma",
      email: "priya.sharma@opm.example.gov",
      notes: "OPM Healthcare & Insurance analyst who identified anomalies in MedFirst claims data during routine audit.",
    },
  });

  await prisma.caseSubject.createMany({
    data: [
      { caseId: case2.id, subjectId: subj2_insurer.id, role: SubjectRole.RESPONDENT, notes: "FEHBP carrier — primary respondent" },
      { caseId: case2.id, subjectId: subj2_manager.id, role: SubjectRole.SUBJECT_OF_INTEREST, notes: "Claims manager overseeing implicated unit" },
      { caseId: case2.id, subjectId: subj2_analyst.id, role: SubjectRole.WITNESS, notes: "OPM analyst who discovered billing anomalies" },
    ],
    skipDuplicates: true,
  });

  await prisma.violation.createMany({
    data: [
      { caseId: case2.id, subjectId: subj2_insurer.id, type: "FRAUD", title: "Fraudulent Billing", description: "Submission of inflated and duplicate claims to FEHBP for reimbursement.", status: "PENDING" },
      { caseId: case2.id, subjectId: subj2_insurer.id, type: "FRAUD", title: "Inflated Claims", description: "Systematic inflation of procedure codes (upcoding) to increase reimbursement amounts.", status: "PENDING" },
    ],
  });

  await prisma.financialResult.createMany({
    data: [
      { caseId: case2.id, subjectId: subj2_insurer.id, type: "RECOVERY", amount: 3200000, description: "Total disputed claims — overpayments identified through claims data analysis (2023-2025)", status: "DISPUTED" },
      { caseId: case2.id, subjectId: subj2_insurer.id, type: "RECOVERY", amount: 1800000, description: "Recovery pending — negotiation with MedFirst legal counsel in progress", status: "PENDING" },
    ],
  });

  await prisma.investigativeTechnique.createMany({
    data: [
      { caseId: case2.id, type: "DOCUMENT_REVIEW", description: "Comprehensive review of MedFirst FEHBP claims data (2023-2025). Cross-referenced with provider records and beneficiary statements.", date: new Date("2025-11-15"), endDate: new Date("2026-01-15"), status: "COMPLETED", findings: "Identified 1,247 duplicate claims, 892 upcoded procedures, and 156 phantom claims across 3 fiscal years." },
      { caseId: case2.id, type: "INTERVIEW", description: "Interview with OPM analyst Priya Sharma regarding initial discovery of billing anomalies.", date: new Date("2025-12-10"), status: "COMPLETED", findings: "Sharma identified statistical outliers in MedFirst claims rates compared to peer carriers. MedFirst denial rate 40% below industry average." },
    ],
  });

  await prisma.referral.create({
    data: {
      caseId: case2.id,
      agencyName: "HHS Office of Inspector General",
      agencyType: "FEDERAL",
      contactName: "SA Jennifer Walsh",
      contactEmail: "jennifer.walsh@oig.hhs.example.gov",
      referralDate: new Date("2026-03-01"),
      reason: "Coordination referral for FEHBP carrier fraud investigation. HHS OIG has concurrent jurisdiction over healthcare fraud matters.",
      status: "PENDING",
    },
  });

  console.log("  [2/5] Healthcare Billing Fraud (OIG-2026-DEMO-002)");

  // ─────────────────────────────────────────────────────────
  // CASE 3 — Whistleblower Retaliation
  // ─────────────────────────────────────────────────────────

  const case3 = await prisma.case.upsert({
    where: { caseNumber: "OIG-2026-DEMO-003" },
    update: {},
    create: {
      caseNumber: "OIG-2026-DEMO-003",
      title: "Whistleblower retaliation — GS-13 demoted after safety report",
      description:
        "Investigation into alleged retaliation against a GS-13 federal employee who filed a safety report concerning deficient building maintenance at the Federal Records Center. Within 30 days of the report, the employee was involuntarily reassigned to a lower-graded position and denied a previously approved within-grade increase. The supervisor cited 'performance concerns' not previously documented.",
      caseType: CaseType.WHISTLEBLOWER,
      status: CaseStatus.ACTIVE,
      priority: Priority.HIGH,
      createdById: userId,
      openedAt: new Date("2026-02-01"),
      dueDate: new Date("2026-05-15"),
      jurisdiction: "FEDERAL",
      complaintSource: "WHISTLEBLOWER",
      investigationApproach: "REACTIVE",
      affectedProgram: "Federal Employee Protections",
      suspectType: "EMPLOYEE",
    },
  });

  const subj3_supervisor = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Gregory",
      lastName: "Fontaine",
      email: "gregory.fontaine@gsa.example.gov",
      phone: "(202) 555-0445",
      address: "1800 F Street NW, Washington, DC 20405",
      notes: "GS-15 Branch Chief, Federal Records Center Operations. Supervisor of complainant. Took adverse action within 30 days of safety report.",
    },
  });

  const subj3_whistleblower = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Angela",
      lastName: "Whitfield",
      email: "angela.whitfield@gsa.example.gov",
      phone: "(202) 555-0467",
      notes: "GS-13 Records Management Specialist. Filed safety report regarding structural deficiencies at Federal Records Center. Subsequently demoted and denied WGI.",
    },
  });

  await prisma.caseSubject.createMany({
    data: [
      { caseId: case3.id, subjectId: subj3_supervisor.id, role: SubjectRole.RESPONDENT, notes: "Supervisor who allegedly retaliated" },
      { caseId: case3.id, subjectId: subj3_whistleblower.id, role: SubjectRole.COMPLAINANT, notes: "Whistleblower — demoted after filing safety report" },
    ],
    skipDuplicates: true,
  });

  // Administrative action against supervisor
  await prisma.subjectAction.create({
    data: {
      caseId: case3.id,
      subjectId: subj3_supervisor.id,
      category: "ADMINISTRATIVE",
      type: "SUSPENSION",
      description: "14-day suspension without pay pending investigation outcome. Supervisor removed from supervisory duties over complainant.",
      status: "IMPLEMENTED",
      effectiveDate: new Date("2026-02-15"),
    },
  });

  await prisma.investigativeTechnique.createMany({
    data: [
      { caseId: case3.id, type: "INTERVIEW", description: "Initial interview with complainant Angela Whitfield — detailed timeline of safety report and subsequent adverse actions.", date: new Date("2026-02-05"), status: "COMPLETED", findings: "Whitfield provided safety report, performance evaluations (all 'Exceeds'), and reassignment letter. Timeline strongly suggests retaliatory motive." },
      { caseId: case3.id, type: "INTERVIEW", description: "Interview with respondent Gregory Fontaine regarding basis for reassignment.", date: new Date("2026-02-12"), status: "COMPLETED", findings: "Fontaine cited vague 'organizational needs' and 'performance concerns.' Unable to produce any prior documented performance issues." },
      { caseId: case3.id, type: "INTERVIEW", description: "Interview with HR specialist who processed the reassignment.", date: new Date("2026-02-20"), status: "COMPLETED", findings: "HR specialist confirmed no performance improvement plan was in place. Stated Fontaine expedited reassignment without standard HR consultation." },
      { caseId: case3.id, type: "DOCUMENT_REVIEW", description: "Review of Whitfield's personnel file, performance evaluations, safety report, and reassignment documentation.", date: new Date("2026-02-08"), endDate: new Date("2026-02-25"), status: "COMPLETED", findings: "Five consecutive years of 'Exceeds Expectations' ratings. No counseling memos. Safety report filed Jan 5; reassignment letter dated Feb 2." },
    ],
  });

  console.log("  [3/5] Whistleblower Retaliation (OIG-2026-DEMO-003)");

  // ─────────────────────────────────────────────────────────
  // CASE 4 — IT Security Breach
  // ─────────────────────────────────────────────────────────

  const case4 = await prisma.case.upsert({
    where: { caseNumber: "OIG-2026-DEMO-004" },
    update: {},
    create: {
      caseNumber: "OIG-2026-DEMO-004",
      title: "Unauthorized access to personnel records — IT contractor",
      description:
        "Investigation into unauthorized access to OPM personnel records by an IT contractor employed by CyberNova Solutions. Server access logs reveal the contractor accessed 12,000+ employee records outside the scope of their maintenance contract. Data exfiltration suspected but not yet confirmed. Potential PII breach affecting current and former federal employees.",
      caseType: CaseType.MISCONDUCT,
      status: CaseStatus.ACTIVE,
      priority: Priority.CRITICAL,
      createdById: userId,
      openedAt: new Date("2026-03-01"),
      dueDate: new Date("2026-04-30"),
      jurisdiction: "FEDERAL",
      partnerAgencies: "FBI Cyber Division, CISA",
      leadAgency: "OPM OIG",
      complaintSource: "PROACTIVE",
      crimeType: "Unauthorized Computer Access",
      investigationApproach: "REACTIVE",
      affectedProgram: "OPM IT Infrastructure",
      suspectType: "CONTRACTOR",
    },
  });

  const subj4_contractor = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Alexei",
      lastName: "Petrov",
      email: "a.petrov@cybernova.example.com",
      phone: "(571) 555-0288",
      notes: "IT contractor, CyberNova Solutions. Database administrator with elevated privileges. Accessed 12,000+ personnel records outside contract scope.",
    },
  });

  const subj4_co = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Sandra",
      lastName: "Mitchell",
      email: "sandra.mitchell@opm.example.gov",
      phone: "(202) 555-0534",
      notes: "Contracting Officer's Representative (COR) for CyberNova contract. Responsible for contractor oversight.",
    },
  });

  await prisma.caseSubject.createMany({
    data: [
      { caseId: case4.id, subjectId: subj4_contractor.id, role: SubjectRole.RESPONDENT, notes: "IT contractor — unauthorized access to personnel records" },
      { caseId: case4.id, subjectId: subj4_co.id, role: SubjectRole.WITNESS, notes: "Contracting officer responsible for contractor oversight" },
    ],
    skipDuplicates: true,
  });

  // Evidence items for Case 4
  await prisma.evidenceItem.createMany({
    data: [
      { caseId: case4.id, type: EvidenceType.DIGITAL, status: EvidenceStatus.VERIFIED, title: "Server Access Logs", description: "Complete access logs from OPM personnel database server (Jan-Mar 2026). Shows 847 unauthorized queries by contractor account.", source: "OPM CISO", exhibitNumber: "EX-001", collectedAt: new Date("2026-03-02") },
      { caseId: case4.id, type: EvidenceType.DIGITAL, status: EvidenceStatus.IN_REVIEW, title: "Contractor Workstation Forensic Image", description: "Full forensic image of Petrov's assigned workstation. Analysis in progress for evidence of data exfiltration.", source: "Digital Forensics Lab", exhibitNumber: "EX-002", collectedAt: new Date("2026-03-05") },
      { caseId: case4.id, type: EvidenceType.DOCUMENT, status: EvidenceStatus.VERIFIED, title: "CyberNova Contract SOW", description: "Statement of Work defining contractor access scope. Database maintenance only — no access to personnel records authorized.", source: "Procurement Office", exhibitNumber: "EX-003", collectedAt: new Date("2026-03-03") },
    ],
  });

  await prisma.referral.create({
    data: {
      caseId: case4.id,
      agencyName: "FBI Cyber Division",
      agencyType: "FEDERAL",
      contactName: "SSA David Park",
      contactEmail: "david.park@fbi.example.gov",
      referralDate: new Date("2026-03-10"),
      reason: "Criminal referral for unauthorized access to federal computer systems (18 U.S.C. ss 1030). Potential data exfiltration of 12,000+ personnel records containing PII of federal employees.",
      status: "ACCEPTED",
      outcome: "FBI opened parallel investigation. Joint forensic analysis underway.",
    },
  });

  await prisma.investigativeTechnique.createMany({
    data: [
      { caseId: case4.id, type: "DIGITAL_FORENSICS", description: "Forensic analysis of contractor workstation and network traffic logs. Examining for evidence of data exfiltration to external media or cloud storage.", date: new Date("2026-03-05"), endDate: new Date("2026-03-25"), status: "IN_PROGRESS", findings: "Preliminary: Found encrypted archive files on workstation created during unauthorized access windows. Analysis ongoing." },
      { caseId: case4.id, type: "INTERVIEW", description: "Interview with COR Sandra Mitchell regarding contractor access controls and oversight procedures.", date: new Date("2026-03-08"), status: "COMPLETED", findings: "Mitchell confirmed contractor was authorized for database maintenance only. Access to personnel tables was not in the SOW. Acknowledged insufficient monitoring of contractor activities." },
    ],
  });

  console.log("  [4/5] IT Security Breach (OIG-2026-DEMO-004)");

  // ─────────────────────────────────────────────────────────
  // CASE 5 — Travel Voucher Fraud
  // ─────────────────────────────────────────────────────────

  const case5 = await prisma.case.upsert({
    where: { caseNumber: "OIG-2026-DEMO-005" },
    update: {},
    create: {
      caseNumber: "OIG-2026-DEMO-005",
      title: "Falsified travel vouchers — Regional office supervisors",
      description:
        "Investigation into falsified travel vouchers submitted by three regional office supervisors. The employees submitted claims for travel that did not occur, inflated per diem claims, and submitted receipts for expenses not incurred. Total fraudulent claims over an 18-month period estimated at $85,000.",
      caseType: CaseType.WASTE,
      status: CaseStatus.PENDING_ACTION,
      priority: Priority.MEDIUM,
      createdById: userId,
      openedAt: new Date("2025-09-15"),
      dueDate: new Date("2026-04-01"),
      jurisdiction: "FEDERAL",
      complaintSource: "MANAGEMENT",
      crimeType: "Travel Voucher Fraud",
      investigationApproach: "REACTIVE",
      affectedProgram: "Agency Travel Program",
      suspectType: "EMPLOYEE",
    },
  });

  const subj5_emp1 = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Robert",
      lastName: "Callahan",
      email: "robert.callahan@opm.example.gov",
      phone: "(404) 555-0177",
      address: "75 Ted Turner Dr SW, Atlanta, GA 30303",
      notes: "GS-14 Regional Office Supervisor — Atlanta. Submitted $38,000 in fraudulent travel claims.",
    },
  });

  const subj5_emp2 = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Maria",
      lastName: "Santos",
      email: "maria.santos@opm.example.gov",
      phone: "(214) 555-0293",
      address: "1100 Commerce St, Dallas, TX 75242",
      notes: "GS-14 Regional Office Supervisor — Dallas. Submitted $27,000 in fraudulent travel claims.",
    },
  });

  const subj5_emp3 = await prisma.subject.create({
    data: {
      type: SubjectType.INDIVIDUAL,
      firstName: "Thomas",
      lastName: "Bradley",
      email: "thomas.bradley@opm.example.gov",
      phone: "(303) 555-0412",
      address: "1961 Stout St, Denver, CO 80294",
      notes: "GS-13 Regional Office Supervisor — Denver. Submitted $20,000 in fraudulent travel claims.",
    },
  });

  await prisma.caseSubject.createMany({
    data: [
      { caseId: case5.id, subjectId: subj5_emp1.id, role: SubjectRole.RESPONDENT, notes: "Atlanta supervisor — $38K in false claims" },
      { caseId: case5.id, subjectId: subj5_emp2.id, role: SubjectRole.RESPONDENT, notes: "Dallas supervisor — $27K in false claims" },
      { caseId: case5.id, subjectId: subj5_emp3.id, role: SubjectRole.RESPONDENT, notes: "Denver supervisor — $20K in false claims" },
    ],
    skipDuplicates: true,
  });

  await prisma.financialResult.createMany({
    data: [
      { caseId: case5.id, subjectId: subj5_emp1.id, type: "RECOVERY", amount: 38000, description: "Repayment order — Callahan fraudulent travel claims", status: "PENDING" },
      { caseId: case5.id, subjectId: subj5_emp2.id, type: "RECOVERY", amount: 27000, description: "Repayment order — Santos fraudulent travel claims", status: "PENDING" },
      { caseId: case5.id, subjectId: subj5_emp3.id, type: "RECOVERY", amount: 20000, description: "Repayment order — Bradley fraudulent travel claims", status: "PENDING" },
    ],
  });

  await prisma.subjectAction.createMany({
    data: [
      { caseId: case5.id, subjectId: subj5_emp1.id, category: "ADMINISTRATIVE", type: "REPRIMAND", description: "Official letter of reprimand. Required to repay $38,000 in fraudulent claims.", status: "IMPLEMENTED", effectiveDate: new Date("2026-03-01") },
      { caseId: case5.id, subjectId: subj5_emp2.id, category: "ADMINISTRATIVE", type: "REPRIMAND", description: "Official letter of reprimand. Required to repay $27,000 in fraudulent claims.", status: "IMPLEMENTED", effectiveDate: new Date("2026-03-01") },
      { caseId: case5.id, subjectId: subj5_emp3.id, category: "ADMINISTRATIVE", type: "REPRIMAND", description: "Official letter of reprimand. Required to repay $20,000 in fraudulent claims. Additionally placed on 90-day performance improvement plan.", status: "IMPLEMENTED", effectiveDate: new Date("2026-03-01") },
    ],
  });

  console.log("  [5/5] Travel Voucher Fraud (OIG-2026-DEMO-005)");

  // ─────────────────────────────────────────────────────────
  // Training Courses (5)
  // ─────────────────────────────────────────────────────────

  console.log("\n  Creating training courses...");

  const courses = await Promise.all([
    prisma.trainingCourse.upsert({
      where: { id: "demo-course-ethics" },
      update: {},
      create: {
        id: "demo-course-ethics",
        title: "Annual Ethics Training for OIG Personnel",
        description: "Mandatory annual ethics training covering conflicts of interest, gift acceptance, outside activities, financial disclosure, and post-employment restrictions under 5 C.F.R. Part 2635.",
        provider: "OPM Office of General Counsel",
        category: "ETHICS",
        method: "ONLINE",
        duration: 4,
        credits: 4,
        isRequired: true,
        isRepeating: true,
        repeatInterval: "ANNUAL",
      },
    }),
    prisma.trainingCourse.upsert({
      where: { id: "demo-course-firearms" },
      update: {},
      create: {
        id: "demo-course-firearms",
        title: "Law Enforcement Firearms Qualification",
        description: "Semi-annual firearms qualification course covering handgun proficiency, tactical shooting, use-of-force decision scenarios, and weapons safety. Required for all 1811-series criminal investigators.",
        provider: "FLETC — Glynco, GA",
        category: "FIREARMS",
        method: "IN_PERSON",
        duration: 16,
        credits: 16,
        isRequired: true,
        isRepeating: true,
        repeatInterval: "BIENNIAL",
      },
    }),
    prisma.trainingCourse.upsert({
      where: { id: "demo-course-legal" },
      update: {},
      create: {
        id: "demo-course-legal",
        title: "Legal Updates: Federal Investigation Authorities",
        description: "Quarterly legal briefing covering recent case law, regulatory changes, subpoena authorities, digital evidence standards, and Fourth Amendment developments affecting OIG investigations.",
        provider: "OIG Counsel Division",
        category: "LEGAL",
        method: "CLASSROOM",
        duration: 2,
        credits: 2,
        isRequired: false,
        isRepeating: true,
        repeatInterval: "QUARTERLY",
      },
    }),
    prisma.trainingCourse.upsert({
      where: { id: "demo-course-forensics" },
      update: {},
      create: {
        id: "demo-course-forensics",
        title: "Advanced Digital Forensics for Investigators",
        description: "Hands-on training in digital evidence acquisition, forensic imaging, mobile device forensics, cloud evidence collection, and chain-of-custody procedures for digital evidence.",
        provider: "SANS Institute",
        category: "TECHNICAL",
        method: "BLENDED",
        duration: 40,
        credits: 40,
        cost: 6500,
        isRequired: false,
        isRepeating: false,
      },
    }),
    prisma.trainingCourse.upsert({
      where: { id: "demo-course-leadership" },
      update: {},
      create: {
        id: "demo-course-leadership",
        title: "Leadership Development Program — GS-13 to GS-15",
        description: "OPM-sponsored leadership development program for mid-career federal employees. Covers strategic thinking, team management, change leadership, and executive communication.",
        provider: "OPM Federal Executive Institute",
        category: "LEADERSHIP",
        method: "BLENDED",
        duration: 80,
        credits: 80,
        cost: 12000,
        isRequired: false,
        isRepeating: false,
      },
    }),
  ]);

  // ─────────────────────────────────────────────────────────
  // Training Records (10)
  // ─────────────────────────────────────────────────────────

  console.log("  Creating training records...");

  const trainingRecords = [
    { userId: uid(0), courseId: courses[0].id, status: "COMPLETED", completionDate: new Date("2026-01-10"), expirationDate: new Date("2027-01-10"), score: 95, hours: 4 },
    { userId: uid(1), courseId: courses[0].id, status: "COMPLETED", completionDate: new Date("2026-01-12"), expirationDate: new Date("2027-01-12"), score: 88, hours: 4 },
    { userId: uid(2), courseId: courses[0].id, status: "IN_PROGRESS", hours: 2 },
    { userId: uid(0), courseId: courses[1].id, status: "COMPLETED", completionDate: new Date("2025-10-15"), expirationDate: new Date("2027-10-15"), score: 92, hours: 16 },
    { userId: uid(1), courseId: courses[1].id, status: "COMPLETED", completionDate: new Date("2025-11-01"), expirationDate: new Date("2027-11-01"), score: 97, hours: 16 },
    { userId: uid(3), courseId: courses[2].id, status: "COMPLETED", completionDate: new Date("2026-03-01"), score: null, hours: 2 },
    { userId: uid(4), courseId: courses[2].id, status: "ENROLLED" },
    { userId: uid(2), courseId: courses[3].id, status: "COMPLETED", completionDate: new Date("2026-02-20"), score: 91, hours: 40, cost: 6500 },
    { userId: uid(5), courseId: courses[3].id, status: "ENROLLED", cost: 6500 },
    { userId: uid(3), courseId: courses[4].id, status: "IN_PROGRESS", hours: 40, cost: 12000 },
  ];

  for (const rec of trainingRecords) {
    await prisma.trainingRecord.upsert({
      where: { userId_courseId: { userId: rec.userId, courseId: rec.courseId } },
      update: {},
      create: rec as any,
    });
  }

  // ─────────────────────────────────────────────────────────
  // Time Entries (15)
  // ─────────────────────────────────────────────────────────

  console.log("  Creating time entries...");

  const caseIds = [case1.id, case2.id, case3.id, case4.id, case5.id];

  const timeEntries = [
    { userId: uid(0), caseId: caseIds[0], activityType: "CASE_WORK", description: "Reviewed subpoena returns from First National Bank; catalogued financial records.", date: new Date("2026-03-10"), hours: 8, status: "APPROVED" },
    { userId: uid(0), caseId: caseIds[0], activityType: "CASE_WORK", description: "Prepared referral package for DOJ Criminal Division.", date: new Date("2026-03-11"), hours: 6, status: "APPROVED" },
    { userId: uid(1), caseId: caseIds[0], activityType: "COURT", description: "Grand jury testimony preparation with AUSA Chen.", date: new Date("2026-03-20"), hours: 4, status: "SUBMITTED" },
    { userId: uid(1), caseId: caseIds[1], activityType: "CASE_WORK", description: "Claims data analysis — identified duplicate billing patterns in MedFirst Q3 2024 data.", date: new Date("2026-02-15"), hours: 8, status: "APPROVED" },
    { userId: uid(2), caseId: caseIds[1], activityType: "CASE_WORK", description: "Conducted interview with OPM analyst regarding billing anomalies.", date: new Date("2025-12-10"), hours: 3, status: "APPROVED" },
    { userId: uid(2), caseId: caseIds[2], activityType: "CASE_WORK", description: "Interview with complainant Angela Whitfield.", date: new Date("2026-02-05"), hours: 4, status: "APPROVED" },
    { userId: uid(2), caseId: caseIds[2], activityType: "CASE_WORK", description: "Interview with respondent Gregory Fontaine.", date: new Date("2026-02-12"), hours: 3, status: "APPROVED" },
    { userId: uid(3), caseId: caseIds[3], activityType: "CASE_WORK", description: "Forensic imaging of contractor workstation.", date: new Date("2026-03-05"), hours: 8, status: "APPROVED" },
    { userId: uid(3), caseId: caseIds[3], activityType: "CASE_WORK", description: "Network traffic log analysis — identifying data exfiltration patterns.", date: new Date("2026-03-12"), hours: 8, isOvertime: true, status: "SUBMITTED" },
    { userId: uid(3), caseId: caseIds[3], activityType: "CASE_WORK", description: "Encrypted archive analysis and decryption attempts.", date: new Date("2026-03-15"), hours: 10, isOvertime: true, status: "SUBMITTED" },
    { userId: uid(4), caseId: caseIds[4], activityType: "CASE_WORK", description: "Travel voucher reconciliation — Callahan claims (Atlanta).", date: new Date("2026-01-20"), hours: 6, status: "APPROVED" },
    { userId: uid(4), caseId: caseIds[4], activityType: "CASE_WORK", description: "Travel voucher reconciliation — Santos claims (Dallas).", date: new Date("2026-01-22"), hours: 6, status: "APPROVED" },
    { userId: uid(0), activityType: "TRAINING", description: "Annual Ethics Training (online module).", date: new Date("2026-01-10"), hours: 4, status: "APPROVED" },
    { userId: uid(1), activityType: "TRAINING", description: "Firearms qualification — FLETC Glynco.", date: new Date("2025-11-01"), hours: 16, status: "APPROVED" },
    { userId: uid(5), activityType: "ADMIN", description: "Quarterly performance review preparation and self-assessment.", date: new Date("2026-03-25"), hours: 3, status: "DRAFT" },
  ];

  for (const entry of timeEntries) {
    await prisma.timeEntry.create({ data: entry as any });
  }

  // ─────────────────────────────────────────────────────────
  // Inventory Items (5)
  // ─────────────────────────────────────────────────────────

  console.log("  Creating inventory items...");

  const inventoryItems = [
    { type: "EQUIPMENT", name: "Dell Latitude 7440 Rugged Laptop", description: "Ruggedized field laptop — encrypted SSD, CAC reader, BitLocker enabled. Assigned to digital forensics team.", serialNumber: "DELL-7440-OIG-0012", barcode: "INV-2026-0012", status: "ASSIGNED", assignedToId: uid(3), caseId: caseIds[3], location: "OIG HQ — Digital Forensics Lab", condition: "GOOD", acquiredDate: new Date("2025-06-01") },
    { type: "EQUIPMENT", name: "Nikon D850 DSLR Camera", description: "Evidence photography camera with macro lens kit. Used for documenting physical evidence and surveillance.", serialNumber: "NIK-D850-OIG-0003", barcode: "INV-2026-0003", status: "AVAILABLE", location: "OIG HQ — Equipment Room B", condition: "GOOD", acquiredDate: new Date("2024-03-15") },
    { type: "EQUIPMENT", name: "Olympus DS-9500 Digital Voice Recorder", description: "Professional digital voice recorder with 256-bit encryption. Used for witness and subject interviews.", serialNumber: "OLY-DS95-OIG-0008", barcode: "INV-2026-0008", status: "ASSIGNED", assignedToId: uid(2), location: "Field — Assigned to Investigator", condition: "GOOD", acquiredDate: new Date("2025-01-20") },
    { type: "EQUIPMENT", name: "OIG Special Agent Credentials & Badge", description: "Official OIG credentials and badge — 1811-series Special Agent. Badge #SA-1047.", serialNumber: "BADGE-SA-1047", barcode: "INV-2026-1047", status: "ASSIGNED", assignedToId: uid(0), location: "Assigned to Agent", condition: "NEW", acquiredDate: new Date("2025-08-01") },
    { type: "EQUIPMENT", name: "2024 Ford Explorer — Government Vehicle", description: "Unmarked government vehicle assigned to OIG field office. GPS tracked, dashcam equipped.", serialNumber: "GOV-FE-2024-OIG-007", barcode: "VEH-2026-0007", status: "IN_USE", assignedToId: uid(0), location: "OIG Field Office — Motor Pool", region: "NCR", condition: "GOOD", acquiredDate: new Date("2024-01-10") },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({ data: item as any });
  }

  // ─────────────────────────────────────────────────────────
  // Calendar Reminders (3)
  // ─────────────────────────────────────────────────────────

  console.log("  Creating calendar reminders...");

  await prisma.calendarReminder.createMany({
    data: [
      {
        userId: uid(0),
        title: "Quarterly Semi-Annual Report to Congress — Due",
        description: "Submit semi-annual report to Congress per IG Act requirements. Coordinate with all divisions for case statistics, financial results, and recommendations.",
        date: new Date("2026-04-30"),
        isRecurring: true,
        frequency: "SEMIANNUAL",
        isActive: true,
      },
      {
        userId: uid(1),
        title: "Annual Ethics Training Deadline",
        description: "All OIG personnel must complete annual ethics training by this date. Verify completion status for all team members.",
        date: new Date("2026-06-30"),
        isRecurring: true,
        frequency: "ANNUAL",
        isActive: true,
      },
      {
        userId: uid(0),
        title: "Case Review — OIG-2026-DEMO-001 (Apex Defense)",
        description: "Supervisory review of Apex Defense procurement fraud investigation. Review evidence package, DOJ referral status, and financial recovery progress before grand jury proceedings.",
        date: new Date("2026-04-15"),
        caseId: caseIds[0],
        isRecurring: false,
        isActive: true,
      },
    ],
  });

  // ─────────────────────────────────────────────────────────
  // Case Assignments
  // ─────────────────────────────────────────────────────────

  console.log("  Creating case assignments...");

  const assignments = [
    { caseId: caseIds[0], userId: uid(0), role: "lead_investigator" },
    { caseId: caseIds[0], userId: uid(1), role: "investigator" },
    { caseId: caseIds[1], userId: uid(1), role: "lead_investigator" },
    { caseId: caseIds[1], userId: uid(2), role: "analyst" },
    { caseId: caseIds[2], userId: uid(2), role: "lead_investigator" },
    { caseId: caseIds[3], userId: uid(3), role: "lead_investigator" },
    { caseId: caseIds[3], userId: uid(0), role: "supervisor" },
    { caseId: caseIds[4], userId: uid(4), role: "lead_investigator" },
  ];

  for (const a of assignments) {
    await prisma.caseAssignment.upsert({
      where: { caseId_userId: { caseId: a.caseId, userId: a.userId } },
      update: {},
      create: a,
    });
  }

  console.log("\n=== Demo seed complete ===");
  console.log(`  5 investigation cases`);
  console.log(`  5 training courses`);
  console.log(`  10 training records`);
  console.log(`  15 time entries`);
  console.log(`  5 inventory items`);
  console.log(`  3 calendar reminders`);
  console.log(`  8 case assignments\n`);
}

main()
  .catch((e) => {
    console.error("Demo seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
