# OIG Investigation Tracking System (OIG-ITS) -- Technical Specification

**Version:** 0.1.0  
**Date:** 2026-03-31  
**Classification:** For Official Use Only (FOUO)

---

## 1. System Overview

### Purpose

The OIG Investigation Tracking System (OIG-ITS) is a web-based case management platform purpose-built for Office of Inspector General (OIG) investigative operations. It provides end-to-end lifecycle management for fraud, waste, abuse, misconduct, and whistleblower investigations, from preliminary inquiry intake through case closure and archival.

### Scope

The system supports:

- Complaint intake and preliminary inquiry triage (hotline, whistleblower, congressional referrals)
- Full investigative case lifecycle management with 7 status stages
- Digital evidence management with chain-of-custody tracking
- Document management with versioning, approval workflows, and AI classification
- Task assignment and workflow automation
- Time and labor tracking (including LEAP -- Law Enforcement Availability Pay)
- Training records management with course evaluations
- 22 AI/ML algorithms for investigation intelligence
- Financial results and violation tracking
- Comprehensive audit trail and RBAC security model

### SOW Alignment

The system addresses requirements across multiple SOW domains: Case Management (CM), Document Management & Records (DMR), Evidence & Forensics (EF), Workflow & Process Navigation (WPN), Reporting & Research Support (RRS), Administrative Functions (AF), Hotline & Whistleblower Complaints (HWC), Financial & Compliance (FC), and Training Management (TM).

---

## 2. Architecture

### High-Level Architecture

OIG-ITS is a monorepo, server-rendered web application using a layered architecture:

```
Client (Browser)
  |
  v
Next.js 16 App Router (React 19 RSC + Client Components)
  |
  +---> REST API Routes (/api/*)
  |       |
  |       +---> Prisma 7 ORM ---> PostgreSQL 16
  |       +---> MeiliSearch v1.6 (full-text search)
  |       +---> MinIO S3 (file storage)
  |       +---> Redis 7 (caching, job queues via BullMQ)
  |       +---> MailHog / Nodemailer (email)
  |       +---> Claude API (AI-powered features)
  |
  v
Docker Compose (local development infrastructure)
```

### Application Structure

| Directory | Purpose |
|---|---|
| `src/app/(auth)/` | Authentication pages (login, password reset) |
| `src/app/(dashboard)/` | Protected dashboard with 24 feature modules |
| `src/app/(public)/` | Public-facing pages |
| `src/app/api/` | 28 API route groups with RESTful endpoints |
| `src/lib/` | Shared utilities, database client, RBAC, AI algorithms |
| `src/lib/ai/` | 18 algorithmic modules + Claude API client |
| `src/generated/prisma/` | Prisma-generated client output |
| `prisma/` | Schema definition and seed scripts |

### Dashboard Modules

The dashboard (`src/app/(dashboard)/dashboard/`) contains 24 feature modules: ai, analytics, approvals, audit-log, calendar, cases, documents, evidence, financial, inquiries, inventory, notifications, reports, search, settings, subjects, tasks, timesheets, training, users, and workflows.

---

## 3. Technology Stack

### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.2.1 | Full-stack React framework (App Router, RSC) |
| `react` / `react-dom` | 19.2.4 | UI component library |
| `@prisma/client` | ^7.6.0 | PostgreSQL ORM with type-safe queries |
| `@prisma/adapter-pg` | ^7.6.0 | PostgreSQL driver adapter for Prisma |
| `pg` | ^8.20.0 | PostgreSQL client driver |
| `next-auth` | ^4.24.13 | Authentication (JWT sessions) |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `@anthropic-ai/sdk` | ^0.81.0 | Claude AI API client |
| `@aws-sdk/client-s3` | ^3.1019.0 | MinIO / S3 file storage client |
| `meilisearch` | ^0.56.0 | Full-text search client |
| `ioredis` | ^5.10.1 | Redis client |
| `bullmq` | ^5.71.1 | Background job queue (Redis-backed) |
| `nodemailer` | ^7.0.13 | Email delivery (SMTP) |
| `zod` | ^4.3.6 | Runtime schema validation |
| `react-hook-form` | ^7.72.0 | Form state management |
| `@hookform/resolvers` | ^5.2.2 | Zod resolver for react-hook-form |
| `@tanstack/react-query` | ^5.95.2 | Server state management and caching |
| `zustand` | ^5.0.12 | Client-side state management |
| `recharts` | ^3.8.1 | Data visualization / charting |
| `@tiptap/react` | ^3.21.0 | Rich text editor (notes, descriptions) |
| `@tiptap/starter-kit` | ^3.21.0 | TipTap base extensions |
| `@tiptap/extension-placeholder` | ^3.21.0 | TipTap placeholder extension |
| `lucide-react` | ^1.7.0 | Icon library |
| `shadcn` | ^4.1.1 | UI component system |
| `@base-ui/react` | ^1.3.0 | Headless UI primitives |
| `class-variance-authority` | ^0.7.1 | Component variant management |
| `clsx` | ^2.1.1 | Conditional class name utility |
| `tailwind-merge` | ^3.5.0 | Tailwind class conflict resolution |
| `tw-animate-css` | ^1.4.0 | CSS animation utilities |
| `cmdk` | ^1.1.1 | Command palette component |
| `sonner` | ^2.0.7 | Toast notification system |
| `date-fns` | ^4.1.0 | Date manipulation library |
| `react-dropzone` | ^15.0.0 | File upload drag-and-drop |
| `archiver` | ^7.0.1 | ZIP archive generation (bulk document download) |
| `xlsx` | ^0.18.5 | Excel spreadsheet export |
| `next-themes` | ^0.4.6 | Dark/light theme switching |

### Development Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5 | Type-safe development |
| `prisma` | ^7.6.0 | Schema migration and generation CLI |
| `tailwindcss` | ^4 | Utility-first CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS integration for Tailwind |
| `eslint` | ^9 | Code linting |
| `eslint-config-next` | 16.2.1 | Next.js-specific ESLint rules |
| `@faker-js/faker` | ^10.4.0 | Test data generation for seeding |
| `ts-node` | ^10.9.2 | TypeScript execution for seed scripts |

---

## 4. Database Schema

The PostgreSQL database is defined via Prisma 7 in `prisma/schema.prisma` with **53 models** and **15 enums**. Models are grouped by domain below.

### Enums

| Enum | Values |
|---|---|
| `UserRole` | ADMIN, INVESTIGATOR, SUPERVISOR, ANALYST, AUDITOR, READONLY |
| `CaseStatus` | INTAKE, OPEN, ACTIVE, UNDER_REVIEW, PENDING_ACTION, CLOSED, ARCHIVED |
| `CaseType` | FRAUD, WASTE, ABUSE, MISCONDUCT, WHISTLEBLOWER, COMPLIANCE, OUTREACH, BRIEFING, OTHER |
| `Priority` | LOW, MEDIUM, HIGH, CRITICAL |
| `TaskStatus` | PENDING, IN_PROGRESS, COMPLETED, CANCELLED, BLOCKED |
| `DocumentStatus` | DRAFT, UPLOADED, REVIEWED, APPROVED, REDACTED, ARCHIVED |
| `EvidenceStatus` | COLLECTED, IN_REVIEW, VERIFIED, DISPUTED, ARCHIVED |
| `EvidenceType` | DOCUMENT, PHOTO, VIDEO, AUDIO, DIGITAL, PHYSICAL, TESTIMONY, OTHER |
| `WorkflowType` | CASE_INTAKE, INVESTIGATION, REVIEW, CLOSURE, CUSTOM |
| `WorkflowStatus` | DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED |
| `SubjectType` | INDIVIDUAL, ORGANIZATION, DEPARTMENT, VENDOR, OTHER |
| `SubjectRole` | COMPLAINANT, RESPONDENT, WITNESS, SUBJECT_OF_INTEREST, INFORMANT, OTHER |
| `NotificationType` | CASE_ASSIGNED, CASE_UPDATED, TASK_ASSIGNED, TASK_DUE, DOCUMENT_UPLOADED, EVIDENCE_ADDED, WORKFLOW_ACTION, SYSTEM_ALERT, ANNOUNCEMENT |
| `AuditAction` | CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, ASSIGN, STATUS_CHANGE, ACCESS_DENIED |

### Auth & User Management (4 models)

| Model | Purpose |
|---|---|
| `User` | System users with role, organization, login lockout tracking, and failed-attempt counter |
| `Session` | Active sessions with token, IP address, user agent, and expiration |
| `PasswordResetToken` | Time-limited tokens for password reset flow |
| `Organization` | Organizational units that scope users and cases |

### Case Management (9 models)

| Model | Purpose |
|---|---|
| `Case` | Core investigation record with 7-status lifecycle, case type, priority, jurisdiction, complaint source, crime type, follow-up tracking, soft delete, and draft support |
| `CaseSubject` | Many-to-many association between cases and subjects with role assignment |
| `Subject` | Individuals, organizations, departments, or vendors involved in investigations; supports hierarchical parent-child relationships |
| `CaseRelationship` | Links between related cases (e.g., related fraud schemes) |
| `CaseAssignment` | Investigator and team assignments to cases |
| `CaseStatusHistory` | Audit trail of all case status transitions with reason |
| `CaseNote` | Investigator notes with private visibility flag |
| `PreliminaryInquiry` | Hotline/whistleblower intake records with risk scoring, anonymity support, and case conversion tracking (SOW: HWC1) |
| `CloseChecklist` | Required closure checklist items with completion tracking (SOW: CM41) |

### Evidence Management (3 models)

| Model | Purpose |
|---|---|
| `EvidenceItem` | Evidence records with type classification, exhibit numbering (EX-001 format), and status tracking |
| `ChainOfCustody` | Full chain-of-custody log with from/to user, action, and timestamp |
| `EvidenceFile` | Physical file references stored in MinIO with hash integrity |

### Document Management (4 models)

| Model | Purpose |
|---|---|
| `Document` | Case documents with versioning (DMR7), supervisory approval workflow (CM15), AI auto-classification, and subject association (CM19) |
| `DocumentAccessLog` | Access audit trail with user, action, IP address |
| `DocumentComment` | Collaborative comments on documents |
| `DocumentAttachment` | Additional file attachments linked to documents (CM20) |

### Task Management (1 model)

| Model | Purpose |
|---|---|
| `Task` | Case tasks with assignment, priority, due date, status lifecycle, and completion tracking |

### Workflow Engine (3 models)

| Model | Purpose |
|---|---|
| `WorkflowDefinition` | Configurable workflow templates with JSON step definitions |
| `WorkflowInstance` | Active workflow instances tied to cases with current step tracking |
| `WorkflowStepAction` | Individual step completion records with user and action |

### Notifications (2 models)

| Model | Purpose |
|---|---|
| `Notification` | In-app notifications with type, read status, and deep links |
| `NotificationPreference` | Per-user notification channel preferences (email, in-app, disabled) |

### Audit & Compliance (2 models)

| Model | Purpose |
|---|---|
| `AuditLog` | Comprehensive audit trail recording all CRUD operations, logins, exports, and access denials with metadata and IP |
| `FieldLabel` | Configurable field labels per entity type (SOW: C16) |

### Reporting (4 models)

| Model | Purpose |
|---|---|
| `ReportDefinition` | Saved report configurations with JSON query/column/filter definitions |
| `ReportRun` | Report execution history with parameters and output file reference |
| `ReportSchedule` | Cron-based report scheduling with recipient lists |
| `ReportReview` | Supervisor review workflow for report submissions (SOW: RRS30) |

### Search & Settings (3 models)

| Model | Purpose |
|---|---|
| `SavedSearch` | User-saved search queries with default flag |
| `SystemSetting` | Key-value system configuration store |
| `UserPreference` | Per-user UI preferences (column visibility, shortcuts) |

### Violations & Financial (3 models)

| Model | Purpose |
|---|---|
| `Violation` | Tracked violations per subject per case with disposition tracking |
| `FinancialResult` | Monetary outcomes (recoveries, fines, penalties, restitution, cost avoidance) |
| `SubjectAction` | Administrative, legal, and sentencing actions against subjects (SOW: CM29/30/31) |

### Investigation Operations (4 models)

| Model | Purpose |
|---|---|
| `InvestigativeTechnique` | Documented investigative methods (interview, surveillance, subpoena, forensics) with authorization tracking (SOW: CM10) |
| `Referral` | Inter-agency referrals with contact info, status, and outcome (SOW: CM22) |
| `Delegation` | Authority delegation between users scoped by type and case (SOW: WPN27) |
| `SubpoenaPackage` | Subpoena document packages with approval workflow (SOW: CM11) |

### Time & Labor (2 models)

| Model | Purpose |
|---|---|
| `TimeEntry` | Individual time entries with activity type (including LEAP), overtime, and approval workflow |
| `Timesheet` | Bi-weekly timesheet aggregation with submission and supervisor approval |

### Training Management (3 models)

| Model | Purpose |
|---|---|
| `TrainingCourse` | Course catalog with categories, delivery methods, credit hours, cost, and recurrence rules |
| `TrainingRecord` | Individual completion records with scores, certificates, and expiration dates |
| `TrainingAssignment` | Bulk training assignments by user, role, or group with booking status (SOW: TM3) |

### Inventory (1 model)

| Model | Purpose |
|---|---|
| `InventoryItem` | Equipment, evidence, and property tracking with assignment, location, region, and condition (SOW: AF6/CM48) |

### Other (4 models)

| Model | Purpose |
|---|---|
| `Announcement` | System-wide announcements with priority and expiration |
| `FeatureFlag` | Feature toggles for progressive rollout |
| `CalendarReminder` | Case and user reminders with recurrence support (SOW: CM43) |
| `CourseEvaluation` | Anonymous or attributed course feedback with 1-5 rating (SOW: TM16) |
| `ReferenceData` | Configurable lookup tables (categories, codes, labels) |

---

## 5. API Architecture

### REST API Design

All API endpoints are implemented as Next.js App Router route handlers under `src/app/api/`. The system exposes **28 route groups**:

| Route Group | Key Endpoints |
|---|---|
| `/api/auth/` | Login, logout, session management, password reset |
| `/api/cases/` | CRUD, status transitions, export, bulk operations |
| `/api/cases/[caseId]/documents/` | Document upload, download, approval, template generation |
| `/api/cases/[caseId]/evidence/` | Evidence CRUD with chain-of-custody |
| `/api/cases/[caseId]/notes/` | Case notes CRUD |
| `/api/cases/[caseId]/tasks/` | Task management per case |
| `/api/cases/[caseId]/violations/` | Violation tracking |
| `/api/cases/[caseId]/financial-results/` | Financial outcomes |
| `/api/cases/[caseId]/techniques/` | Investigative techniques |
| `/api/cases/[caseId]/referrals/` | Agency referrals |
| `/api/cases/[caseId]/subject-actions/` | Subject actions |
| `/api/cases/[caseId]/relationships/` | Case linking |
| `/api/cases/[caseId]/checklist/` | Close checklist |
| `/api/cases/[caseId]/subpoenas/` | Subpoena packages |
| `/api/cases/[caseId]/timeline/` | Activity timeline |
| `/api/cases/[caseId]/report/` | Case report generation |
| `/api/cases/[caseId]/field-permissions/` | Field-level permission checks |
| `/api/inquiries/` | Preliminary inquiry CRUD and conversion to case |
| `/api/subjects/` | Subject CRUD and export |
| `/api/tasks/` | Cross-case task management |
| `/api/users/` | User administration |
| `/api/reports/` | Report definition, execution, and review |
| `/api/workflows/` | Workflow instance management and step actions |
| `/api/training/` | Courses, records, assignments, evaluations, analytics, export |
| `/api/time-entries/` and `/api/timesheets/` | Time tracking and timesheet management |
| `/api/inventory/` | Inventory CRUD |
| `/api/search/` | MeiliSearch-powered full-text search |
| `/api/ai/*` | 22 AI endpoint routes (see Section 6) |
| `/api/admin/` | Routing rules, filing rules, retention policies |
| `/api/analytics/` | Dashboard analytics and financial analytics |

### Authentication Flow

1. User submits credentials to `/api/auth/` (NextAuth)
2. Server validates password hash (bcryptjs) and checks lockout status
3. On success: JWT token issued, `Session` record created with IP and user agent
4. JWT contains: `userId`, `role`, `email`, `organizationId`
5. Subsequent requests include JWT in session cookie
6. API routes extract session via `getServerSession()` and validate permissions

### RBAC Model

The system implements a **6-role, 35-permission** RBAC model defined in `src/lib/rbac.ts`.

**Roles:**

| Role | Description | Permission Count |
|---|---|---|
| `ADMIN` | Full system access, user management, settings | 35 (all) |
| `SUPERVISOR` | Case oversight, assignments, approvals, training management | 29 |
| `INVESTIGATOR` | Case work, evidence/document management, task execution | 19 |
| `ANALYST` | Read-only case access, reporting and analytics | 11 |
| `AUDITOR` | Read-only access with audit log visibility | 12 |
| `READONLY` | Minimal read access to cases, documents, tasks, training | 4 |

**Permission Categories:**

- **Case:** create, read, update, delete, assign, close
- **Evidence:** create, read, update, delete
- **Document:** create, read, update, delete
- **Task:** create, read, update, delete
- **User:** create, read, update, delete
- **Report:** create, read, run
- **Audit:** read
- **Settings:** read, update
- **Training:** read, create, update, assign

### Field-Level Permissions

Defined in `src/lib/field-permissions.ts`, the system enforces field-level edit restrictions based on both **role** and **case status**. For example:

- **Investigator + INTAKE status:** Can edit title, description, priority, dueDate, caseType, status, and 12 other fields
- **Investigator + CLOSED status:** Can only edit followUpNotes and followUpStatus
- **Investigator + ARCHIVED status:** No editable fields
- **Supervisor:** Full edit access in INTAKE/OPEN/ACTIVE; restricted in UNDER_REVIEW/PENDING_ACTION
- **Admin:** All fields editable in all statuses
- **Analyst/Auditor/Readonly:** No edit access in any status

### Case Visibility

- ADMIN, SUPERVISOR, AUDITOR, and ANALYST see all cases
- INVESTIGATOR and READONLY see only cases assigned to them (filtered via `CaseAssignment`)

---

## 6. AI/ML Capabilities

The system includes **22 AI algorithms** across two categories: **18 algorithmic (rule-based/statistical)** modules implemented in pure TypeScript (`src/lib/ai/`) and **4 Claude LLM-powered** endpoints using the Anthropic API. All algorithms are accessible via REST API and through the interactive **AI Insights Dashboard** (`/dashboard/ai`) with 7 tabbed sections.

### 6.1 Anomaly Detection (`src/lib/ai/anomaly-detection.ts`)

**SOW:** RRS3, RRS22, CM32 | **Endpoint:** `GET /api/ai/anomalies` | **Cache:** 10 min

Three detection functions using z-score statistical analysis:

- **Financial Anomalies:** Groups all `FinancialResult` records by type (RECOVERY, FINE, RESTITUTION, SAVINGS), calculates mean and standard deviation per type, flags any result where `amount > mean + 2σ`. Returns anomalies with z-scores and severity (CRITICAL if z > 3, HIGH if z > 2).
- **Case Anomalies:** Flags cases with: duration exceeding mean + 2σ days open, document count > mean + 2σ, evidence count > mean + 2σ, or financial totals significantly above average.
- **Activity Anomalies:** Analyzes last 30 days of `AuditLog` entries per user. Flags users with significantly more or fewer entries than average, and users with excessive `ACCESS_DENIED` events.

### 6.2 Risk Scoring (`src/lib/ai/risk-scoring.ts`)

**SOW:** HWC1, CM1, C17 | **Endpoint:** `POST /api/ai/risk-score`

Keyword-weighted scoring system producing a score 0–100 with risk level classification:

- **Keyword Analysis (+5 to +20):** Scans description for high-risk terms: "fraud" (+20), "theft" (+15), "bribery" (+15), "retaliation" (+15), "billing" (+10), "kickback" (+10), "safety" (+10), etc.
- **Source Weight (+5 to +15):** WHISTLEBLOWER=+15, CONGRESSIONAL=+10, HOTLINE=+5.
- **Contact Information (+5 to +10):** Non-anonymous=+10, has email=+5, has phone=+5.
- **Description Quality (+5 to +15):** Longer, more detailed descriptions score higher.
- **Category Match (+10):** High-priority categories (FRAUD, MISCONDUCT) receive bonus.
- **Output:** `{ score: 0-100, riskLevel: LOW|MEDIUM|HIGH|CRITICAL, factors: [{factor, points, description}] }`
- **Integration:** Auto-runs on every hotline and whistleblower submission. Scores >75 auto-escalate priority to HIGH or CRITICAL. Risk score stored on `PreliminaryInquiry.riskScore`.

### 6.3 Predictive Analytics (`src/lib/ai/predictions.ts`)

**SOW:** RRS3, RRS12, RRS22 | **Endpoint:** `GET /api/ai/predictions`

Four prediction functions using linear regression on historical case data:

- **`predictCaseDuration(caseData)`:** Predicts days to close based on composite feature scoring of case type, priority, and subject count. Uses historical closed cases to build regression model. Output: predicted days with confidence.
- **`predictClosureOutcome(caseData)`:** Predicts SUBSTANTIATED vs UNSUBSTANTIATED using nearest-centroid classification with Bayesian prior blending. Input features: case type, evidence count, violation count, financial results.
- **`predictCaseload()`:** Forecasts next month's new cases using linear regression on 12-month trend of `openedAt` dates.
- **`identifyAtRiskCases()`:** Flags active cases likely to miss due dates by comparing current progress (tasks completed / total, days remaining) against predicted duration.

### 6.4 Case Similarity & Clustering (`src/lib/ai/case-similarity.ts`)

**SOW:** CM4, RRS11 | **Endpoints:** `GET /api/ai/similar-cases?caseId=`, `GET /api/ai/clusters`

- **Similarity:** Constructs 22-dimensional feature vectors per case: case type (one-hot encoded, 9 dims), priority (ordinal, 1 dim), complaint source (one-hot, 8 dims), plus numeric features (subject count, evidence count, financial total, violation count). Computes cosine similarity between the target case and all other cases. Returns top N most similar with similarity score (0.0–1.0) and shared features.
- **Clustering:** Implements k-means clustering (k=5) with Euclidean distance on the same feature vectors. Each cluster is labeled with its most common case type and complaint source. Iterates until convergence or 100 iterations.

### 6.5 Duplicate Entity Resolution (`src/lib/ai/entity-resolution.ts`)

**SOW:** EF15, WPN16 | **Endpoint:** `GET /api/ai/duplicate-subjects`

Multi-method fuzzy matching to detect duplicate subjects across the entire database:

- **Levenshtein Distance:** Edit distance algorithm implemented from scratch. Names with distance < 3 edits are flagged as potential matches.
- **Soundex Phonetic Matching:** Classic Soundex algorithm implemented from scratch (letter → code mapping: B/F/P/V→1, C/G/J/K/Q/S/X/Z→2, D/T→3, L→4, M/N→5, R→6). Subjects with matching Soundex codes are flagged regardless of spelling.
- **Email Domain Matching:** Subjects sharing the same email domain are flagged.
- **Address Similarity:** Partial string matching on address fields.
- **Confidence Score:** Combined weighted score 0.0–1.0 from all matching methods. Pairs with confidence > 0.3 are returned.

### 6.6 Network Analysis (`src/lib/ai/network-analysis.ts`)

**SOW:** CM49, CM4, WPN16 | **Endpoint:** `GET /api/ai/network` | **Cache:** 10 min

Graph-based analysis of investigation relationships:

- **Graph Construction:** Builds an undirected graph where nodes = subjects + cases, edges = subject-case links (via `CaseSubject`) + case-case relationships (via `CaseRelationship`) + implicit shared-subject links between cases.
- **Node Degree:** Calculates connection count per node. High-degree nodes are "hubs" — subjects or cases central to multiple investigations.
- **Connected Components:** BFS traversal identifies isolated clusters of related entities. Each component represents a distinct group of linked investigations.
- **Fraud Ring Detection:** Identifies subjects appearing in 2 or more cases together. Groups of co-occurring subjects across multiple cases are flagged as potential organized fraud rings. Returns ring members and linked case IDs.

### 6.7 Document Classification (`src/lib/ai/document-classifier.ts`)

**SOW:** DMR1, EF5, EF7 | **Endpoint:** `POST /api/ai/classify-document`

Rule-based document classification into 8 categories with auto-tagging:

- **Classification Rules (regex on title/filename):** "subpoena"→LEGAL_SUBPOENA (0.9), "interview"/"MOI"/"memorandum"→INTERVIEW_MEMO (0.85), "report"/"ROI"→INVESTIGATION_REPORT (0.8), "invoice"/"receipt"/"billing"→FINANCIAL_RECORD (0.85), "photo"/"image"/"screenshot"→PHOTOGRAPHIC_EVIDENCE (0.9), "email"/"correspondence"→CORRESPONDENCE (0.75), "contract"/"agreement"→CONTRACT (0.8), "warrant"/"affidavit"→COURT_DOCUMENT (0.85), default→GENERAL_DOCUMENT (0.5).
- **MIME Type Boost:** Image MIMEs boost PHOTOGRAPHIC_EVIDENCE confidence. Audio/video boost TESTIMONY.
- **Auto-Tagging:** Extracts dollar amounts (`$X,XXX`), dates, case numbers (`OIG-XXXX-XXX`), agency names (FBI, DOJ, SEC, etc.), and PII indicators.
- **Integration:** Runs automatically on every document upload. Results stored in `Document.aiCategory` and `Document.aiTags`.

### 6.8 Investigator Recommendation Engine (`src/lib/ai/investigator-recommender.ts`)

**SOW:** CM3, WPN19 | **Endpoint:** `POST /api/ai/recommend-investigator`

Multi-factor scoring to recommend the best investigator for a new case:

- **Expertise Match (30 pts):** Ratio of past cases with the same `caseType` to total assigned cases. An investigator who has handled 10 fraud cases out of 15 total scores 20/30 for a new fraud case.
- **Current Workload (25 pts):** Inverse of active case count. Fewer active cases = higher score.
- **Success Rate (25 pts):** Ratio of closed cases to total assigned cases.
- **Availability (20 pts):** Bonus if no cases have due dates this week.
- Returns top 3 investigators with total score and individual factor breakdowns.

### 6.9 Auto-Escalation Engine (`src/lib/ai/auto-escalation.ts`)

**SOW:** CM35, WPN13 | **Endpoint:** `GET /api/ai/escalations` | **Cache:** 5 min

Scans all ACTIVE/OPEN cases and recommends priority escalations:

- **Financial Threshold:** Cases with total financial results > $500K and priority != CRITICAL → recommend CRITICAL.
- **Deadline Proximity:** Cases with due date within 7 days and priority LOW/MEDIUM → recommend HIGH.
- **Stale Cases:** Cases with no `AuditLog` entries in 14 days → flag as stale requiring attention.
- **Evidence Gap:** Cases with >10 evidence items but 0 violations recorded → flag for review.

### 6.10 Evidence Strength Scoring (`src/lib/ai/evidence-strength.ts`)

**SOW:** WPN23, AF6 | **Endpoint:** `GET /api/ai/evidence-strength?caseId=`

Point-based scoring system producing a 0–100 score with letter grade:

- **Per-Item Points:** DOCUMENT=+3, PHOTO=+3, DIGITAL=+4, TESTIMONY=+2, PHYSICAL=+5, VIDEO=+4, AUDIO=+3 per item (capped at 40).
- **Custody Chain Completeness (+10):** All evidence items have ≥2 chain-of-custody entries.
- **Type Diversity (+15):** Evidence from 3+ different types.
- **Source Corroboration (+10):** Evidence from different sources.
- **Timeline Coverage (+5):** Evidence dates span >30 days.
- **Grading:** A=80+, B=65+, C=50+, D=35+, F=<35.

### 6.11 Timeline Anomaly Detection (`src/lib/ai/timeline-anomalies.ts`)

**SOW:** CM14, AF4 | **Endpoint:** `GET /api/ai/timeline-anomalies?caseId=`

Builds a unified timeline from status changes, notes, documents, evidence, and tasks, then flags:

- **Activity Gaps:** Periods >30 days with no recorded activity (severity: MEDIUM if 30-60 days, HIGH if >60).
- **Post-Review Evidence:** Evidence collected after case moved to UNDER_REVIEW or later status (severity: HIGH — may indicate procedural irregularity).
- **Weekend/Holiday Uploads:** Documents uploaded on Saturday or Sunday (severity: LOW — may be legitimate but flagged for awareness).
- **Rapid Status Changes:** Multiple status changes on the same day (severity: MEDIUM — may indicate testing or errors).

### 6.12 Closure Readiness Scoring (`src/lib/ai/closure-readiness.ts`)

**SOW:** CM40, CM41 | **Endpoint:** `GET /api/ai/closure-readiness?caseId=`

13-criteria checklist scoring system (total 100 points):

| Criterion | Points | Check |
|-----------|--------|-------|
| Subjects documented | 15 | ≥1 CaseSubject linked |
| Violations recorded | 10 | ≥1 Violation |
| Evidence collected | 10 | ≥1 EvidenceItem |
| Evidence verified | 5 | Any evidence with VERIFIED status |
| Financial results | 10 | ≥1 FinancialResult |
| All tasks complete | 10 | No PENDING/IN_PROGRESS tasks |
| Referrals resolved | 5 | No PENDING referrals |
| Techniques logged | 5 | ≥1 InvestigativeTechnique |
| Case notes >3 | 5 | At least 3 CaseNotes |
| Supervisor review | 5 | Any workflow with COMPLETED status |
| Checklist items done | 10 | All required CloseChecklist items completed |
| Documents >2 | 5 | At least 2 Documents |
| No pending workflows | 5 | No ACTIVE WorkflowInstances |

Score ≥80 = ready to close. Returns score, ready boolean, and list of missing items.

### 6.13 Complaint Deduplication (`src/lib/ai/complaint-dedup.ts`)

**SOW:** EF15, HWC1 | **Endpoint:** `POST /api/ai/complaint-dedup`

Detects when a new complaint duplicates an existing inquiry or open case:

- **Subject Matching (60% weight):** Levenshtein distance on complaint subject text (imported from `entity-resolution.ts`). Distance normalized to 0–1 similarity.
- **Keyword Overlap (40% weight):** Tokenizes both descriptions, computes Jaccard similarity coefficient (intersection / union of keyword sets).
- **Combined Score:** Weighted average, threshold at 0.3 for reporting.
- **Cross-entity:** Compares against both `PreliminaryInquiry` (last 90 days) and open `Case` records.
- **Integration:** Auto-runs on every hotline submission. Potential duplicates included in response as `potentialDuplicates`.

### 6.14 Workload Balancing (`src/lib/ai/workload-balancing.ts`)

**SOW:** RRS23, C17 | **Endpoint:** `GET /api/ai/workload`

Per-investigator workload analysis with team-level balancing:

- **Workload Score:** Weighted sum of: active cases (×3), critical cases (×5), pending tasks (×1), overdue tasks (×4), cases due this week (×3).
- **Statistical Thresholds:** Calculates team mean and standard deviation. Overloaded = score > mean + 1.5σ. Underloaded = score < mean - 1σ.
- **Supervisor Queues:** Counts pending approval workflow steps per supervisor.
- **Output:** Per-investigator breakdown, overloaded/underloaded flags, team average, supervisor queue depths.

### 6.15 Financial Pattern Mining (`src/lib/ai/financial-patterns.ts`)

**SOW:** FC1, RRS24 | **Endpoint:** `GET /api/ai/financial-patterns`

Detects suspicious patterns in financial results:

- **Round Numbers:** Flags amounts that are exact multiples of $10K, $50K, or $100K (may indicate fabricated figures).
- **Just-Below-Threshold:** Flags amounts like $9,999.99 that fall just under common reporting thresholds.
- **Sequential/Clustered Amounts:** Detects multiple results from the same subject with suspiciously similar amounts.
- **Outliers (IQR-based):** Calculates interquartile range. Amounts below Q1-1.5×IQR or above Q3+1.5×IQR are flagged.
- **Weekend/Holiday Dates:** Results with `resultDate` on Saturday or Sunday.

### 6.16 Subject Risk Profiling (`src/lib/ai/subject-risk.ts`)

**SOW:** CM8, CM49 | **Endpoint:** `GET /api/ai/subject-risk`

Multi-factor 0–100 risk scoring per subject:

- **Case Involvement:** +5 per case linked.
- **Violations:** +10 per violation, +20 if status is SUBSTANTIATED.
- **Financial Impact (log scale):** $1K=+5, $10K=+10, $100K=+15, $1M+=+25.
- **Network Hub Score:** Higher score for subjects with many connections (from network analysis).
- **Repeat Offender:** +15 if subject appears in >2 cases.
- **Role Escalation:** +10 if subject's role was upgraded (e.g., WITNESS → RESPONDENT across cases).
- **Risk Levels:** CRITICAL (80+), HIGH (60+), MEDIUM (40+), LOW (<40).

### 6.17 Automated Case Narrative (`src/lib/ai/case-narrative.ts`)

**SOW:** RRS16, CM34 | **Endpoint:** `GET /api/ai/case-narrative?caseId=`

Generates structured plain-English investigation summary from case data:

- **Opening:** "Case [number] is a [type] investigation opened on [date] involving [N] subjects."
- **Subjects:** Lists all linked subjects with roles and types.
- **Investigation:** Summarizes techniques employed with dates and findings.
- **Violations:** Lists documented violations with status and disposition.
- **Financial Impact:** Totals recoveries, fines, restitution, savings with per-subject breakdown.
- **Referrals:** Lists agency referrals with status and outcomes.
- **Status:** Current case status with closure readiness score.

### 6.18 Case Clustering (via `src/lib/ai/case-similarity.ts`)

**SOW:** RRS11 | **Endpoint:** `GET /api/ai/clusters` | **Cache:** 10 min

K-means clustering algorithm grouping all active cases into 5 clusters:

- **Feature Vectors:** Same 22-dimensional vectors as similarity (case type one-hot, priority ordinal, complaint source one-hot, numeric counts).
- **Algorithm:** Random centroid initialization, iterative assignment/update until convergence or 100 iterations. Euclidean distance metric.
- **Output:** Cluster ID, label (most common type + source), case count, member case IDs.

### 6.19–6.22 Claude LLM-Powered Endpoints

All Claude-powered features use the `claude-sonnet-4-20250514` model via `@anthropic-ai/sdk` client (`src/lib/ai/claude-client.ts`) with a 30-second timeout. The API key is configured in `.env.local` as `ANTHROPIC_API_KEY`.

#### 6.19 Natural Language Search

**Endpoint:** `POST /api/ai/natural-search`

- **Input:** `{ query: "Show me all fraud cases from 2025 with recoveries over $500K" }`
- **Process:** Claude translates the natural language query into a structured JSON filter with fields: `status`, `caseType`, `priority`, `dateFrom`, `dateTo`, `search`, `minAmount`.
- **Execution:** The parsed filters are applied as Prisma `where` clauses against the Case model with RBAC access filters.
- **Output:** `{ query, filters, results, resultCount }`

#### 6.20 Document Content Analysis

**Endpoint:** `POST /api/ai/analyze-document`

- **Input:** `{ title, content }` — document title and text content.
- **Process:** Claude analyzes the text and extracts structured intelligence.
- **Output:** `{ keyFacts, entities, redFlags, classification, recommendedActions, summary }`

#### 6.21 Interview Question Generator

**Endpoint:** `POST /api/ai/interview-questions`

- **Input:** `{ caseType, subjectRole, subjectName?, caseDescription?, knownFacts? }`
- **Process:** Claude generates role-appropriate questions considering the investigation type and subject's relationship to the case.
- **Output:** `{ openingQuestions, substantiveQuestions, probeQuestions, closingQuestions, interviewTips }`

#### 6.22 Smart Report Generation

**Endpoint:** `POST /api/ai/generate-report`

- **Input:** `{ caseId, reportType: "summary"|"narrative"|"findings"|"recommendation" }`
- **Process:** Fetches complete case data (subjects, violations, financials, techniques, referrals, notes, evidence, assignments), sends to Claude with report-type-specific instructions.
- **Output:** `{ report, wordCount, sections }`

### AI Dashboard UI

All 22 algorithms are accessible through the **AI Insights Dashboard** (`/dashboard/ai`) organized in 7 tabs:

| Tab | Algorithms | Interactive Features |
|-----|-----------|---------------------|
| Alerts & Anomalies | Anomaly Detection, Auto-Escalation, Financial Patterns | Auto-loaded alerts with severity badges |
| Case Intelligence | Similarity, Clustering, Narrative, Closure Readiness | Case ID input, similarity bars, readiness gauge |
| Evidence & Timeline | Evidence Strength, Timeline Anomalies | Case ID input, letter grade display, timeline cards |
| Subjects & Network | Duplicate Resolution, Network Analysis, Risk Profiling | Confidence bars, fraud ring display, ranked risk list |
| Workload & Predictions | Investigator Recommender, Workload Balancing, Predictions | Case type/priority form, workload table, forecast chart |
| Claude AI | Natural Language Search, Interview Questions, Report Gen, Doc Analysis | Text inputs, generated results display |
| Risk Scoring | Risk Scoring, Complaint Deduplication | Complaint form with factor breakdown, duplicate checker |

---

## 7. Security Features

### Authentication Security

- **Password Hashing:** bcryptjs with salted hashes (`src/lib/` + `bcryptjs ^3.0.3`)
- **Login Lockout:** Tracks `failedLoginAttempts` on the User model; `lockedUntil` timestamp prevents login after threshold exceeded
- **Session Management:** Server-side session records with IP address and user agent tracking; explicit `expiresAt` timestamp; indexed for fast lookup

### Authorization

- **Role-Based Access Control:** 6 roles with 35 discrete permissions enforced on every API route
- **Case-Level Filtering:** Investigators and read-only users can only access cases assigned to them
- **Field-Level Permissions:** Edit permissions vary by role AND case status (7 statuses x 6 roles matrix)
- **Document Approval Workflow:** Documents can require supervisory approval before finalization

### Audit Trail

- **AuditLog Model:** Records every CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, ASSIGN, STATUS_CHANGE, and ACCESS_DENIED event
- **Document Access Logging:** Separate DocumentAccessLog tracks every file view/download with IP address
- **Case Status History:** Immutable record of every status transition with reason and actor
- **Chain of Custody:** Full evidence custody trail with from/to user and timestamp

### Data Protection

- **Password Reset Tokens:** Time-limited, single-use tokens with expiration enforcement
- **Soft Delete:** Cases support `deletedAt` for recoverable deletion
- **Case Locking:** Cases can be locked (`isLocked`, `lockedAt`, `lockedBy`) to prevent concurrent edits
- **Draft Mode:** Cases support `isDraft` flag for incomplete records

---

## 8. Infrastructure

### Docker Compose Services

Defined in `docker-compose.yml`, the development stack consists of 5 services:

| Service | Image | Ports | Purpose |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | Primary relational database |
| `redis` | `redis:7-alpine` | 6379 | Caching, BullMQ job queues |
| `minio` | `minio/minio` | 9000 (API), 9001 (Console) | S3-compatible object storage for documents and evidence files |
| `meilisearch` | `getmeili/meilisearch:v1.6` | 7700 | Full-text search engine |
| `mailhog` | `mailhog/mailhog` | 8025 (UI), 1025 (SMTP) | Development email capture and testing |

Persistent volumes: `pgdata`, `minio_data`, `meili_data`.

### Environment Variables

Defined in `.env.local` (not committed to version control):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | JWT signing secret for NextAuth |
| `NEXTAUTH_URL` | Application base URL |
| `REDIS_URL` | Redis connection string |
| `MINIO_ENDPOINT` | MinIO server hostname |
| `MINIO_PORT` | MinIO API port |
| `MINIO_ACCESS_KEY` | MinIO access credentials |
| `MINIO_SECRET_KEY` | MinIO secret credentials |
| `MINIO_BUCKET` | Default storage bucket name |
| `MINIO_USE_SSL` | SSL toggle for MinIO connections |
| `MEILISEARCH_URL` | MeiliSearch server URL |
| `MEILISEARCH_KEY` | MeiliSearch master API key |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_FROM` | Default sender email address |
| `ANTHROPIC_API_KEY` | Claude API key for AI features |

### Deployment Requirements

- **Node.js:** Required for Next.js 16 runtime
- **PostgreSQL 16:** Primary data store
- **Redis 7:** Required for caching and BullMQ job processing
- **S3-compatible storage:** MinIO for development; any S3-compatible service for production
- **MeiliSearch v1.6:** Full-text search (can be replaced with managed search service)

---

## 9. Performance

### Caching Strategy

- **React Query (`@tanstack/react-query`):** Client-side server state caching with configurable stale times and automatic background refetching
- **Redis:** Server-side caching for expensive queries; BullMQ job queue for background processing
- **Next.js:** Server-side rendering with React Server Components reduces client-side data fetching

### Database Indexing

The Prisma schema defines **100+ database indexes** across all models. Key indexing strategies:

- **Primary lookups:** Every foreign key has a corresponding index (e.g., `@@index([caseId])`, `@@index([userId])`)
- **Status filtering:** All status fields are indexed for dashboard queries (e.g., `@@index([status])`)
- **Temporal queries:** Date fields indexed for timeline and reporting (e.g., `@@index([createdAt])`, `@@index([openedAt])`, `@@index([date])`)
- **Composite uniqueness:** Multi-column unique constraints prevent duplicates (e.g., `@@unique([caseId, userId])`, `@@unique([userId, type])`)
- **Search optimization:** Email, name, and case number fields indexed for lookup performance

### Pagination

- API endpoints implement cursor-based or offset pagination
- MeiliSearch handles paginated full-text search results with configurable page sizes

---

## 10. Integration Points

### MeiliSearch Full-Text Search

Configured in `src/lib/meilisearch.ts`, the search engine indexes 4 entity types:

| Index | Searchable Attributes | Filterable Attributes |
|---|---|---|
| `cases` | title, caseNumber, description, caseType | status, caseType, priority, createdById, organizationId |
| `evidence` | title, description, type | (configured per index) |
| `tasks` | title, description | (configured per index) |
| `documents` | title, fileName | (configured per index) |

Search synchronization occurs on entity creation and update via API route handlers.

### MinIO File Storage

- S3-compatible object storage via `@aws-sdk/client-s3`
- Stores: case documents, evidence files, training certificates, report outputs, document attachments
- File references stored as `fileKey` in database records
- Supports hash-based integrity verification for evidence files
- Bulk download via ZIP archive generation (`archiver` package)

### Email (Nodemailer)

- SMTP-based email delivery via `nodemailer ^7.0.13`
- Development: MailHog captures all outgoing mail on port 8025
- Used for: notification delivery, password reset tokens, scheduled report distribution
- Configurable sender address via `SMTP_FROM` environment variable

### Claude AI API

- Integration via `@anthropic-ai/sdk ^0.81.0`
- Client singleton in `src/lib/ai/claude-client.ts`
- Model: `claude-sonnet-4-20250514`
- 30-second request timeout with AbortController
- Used for: natural language search, document analysis, interview question generation, report drafting

### Data Export

- **Excel:** `xlsx ^0.18.5` for case and subject data export
- **ZIP:** `archiver ^7.0.1` for bulk document downloads

---

## 11. Compliance

The system is designed to support federal compliance frameworks. Below are mappings between regulatory requirements and implemented features.

### FedRAMP / FISMA

| Control Area | Implementation |
|---|---|
| Access Control (AC) | 6-role RBAC, field-level permissions, case-level access filtering |
| Audit and Accountability (AU) | AuditLog with 10 action types, document access logs, case status history |
| Identification and Authentication (IA) | bcryptjs password hashing, JWT sessions, login lockout, session tracking with IP/user agent |
| System and Communications Protection (SC) | Environment-variable-based secret management, configurable SSL |

### NIST 800-53

| Control Family | Implementation |
|---|---|
| AC-2 Account Management | User model with isActive flag, role assignment, organization scoping |
| AC-3 Access Enforcement | Permission checks on every API route, field-level edit restrictions |
| AC-6 Least Privilege | READONLY default role, progressive permission grants |
| AU-2 Audit Events | CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, ASSIGN, STATUS_CHANGE, ACCESS_DENIED |
| AU-3 Content of Audit Records | userId, action, entityType, entityId, metadata (JSON), IP address, timestamp |
| IA-5 Authenticator Management | Password reset tokens with expiration, bcrypt hashing |

### HIPAA (where applicable)

| Requirement | Implementation |
|---|---|
| Access Controls | Role-based access, session management, automatic lockout |
| Audit Controls | Comprehensive audit logging with IP tracking |
| Integrity Controls | Evidence file hashing, chain of custody, document versioning |
| Transmission Security | Configurable SSL for all external service connections |

### Evidence Integrity

| Requirement | Implementation |
|---|---|
| Chain of Custody | ChainOfCustody model with from/to user, action, timestamp |
| Evidence Integrity | File hash storage on EvidenceFile model |
| Exhibit Tracking | Sequential exhibit numbering (EX-001 format) |
| Tamper Prevention | Case locking, document approval workflows, audit trail |

---

## 12. Testing

### Seed Data

The project includes two seed scripts in `prisma/`:

- **`prisma/seed.ts`** -- Base seed data for development
- **`prisma/seed-demo.ts`** -- Demo seed data with realistic investigation scenarios (run via `npm run seed:demo`)

The demo seed uses `@faker-js/faker ^10.4.0` for generating realistic test data.

### Manual Testing Coverage

The application supports manual testing across the following categories:

| Category | Coverage Areas |
|---|---|
| Authentication | Login, logout, password reset, session management, lockout |
| Case Management | CRUD, status transitions, assignment, notes, timeline |
| Evidence | Upload, chain of custody, exhibit numbering, file integrity |
| Documents | Upload, versioning, approval, AI classification, bulk download |
| Tasks | Creation, assignment, status tracking, due date management |
| Workflows | Definition, instance creation, step actions |
| Search | Full-text search, saved searches, natural language search |
| AI Algorithms | All 22 endpoints (risk scoring, anomaly detection, predictions, etc.) |
| Reporting | Definition, execution, scheduling, supervisor review |
| Training | Course management, records, assignments, evaluations |
| Time Tracking | Time entries, timesheets, approval workflow |
| Inventory | CRUD, assignment, status tracking |
| Admin | Settings, reference data, routing rules, filing rules, retention |
| RBAC | Permission enforcement across all 6 roles |

### Running the Application

```bash
# Start infrastructure services
docker compose up -d

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed demo data
npm run seed:demo

# Start development server
npm run dev
```

### Linting

```bash
npm run lint
```

---

## Appendix: File Reference

| Path | Description |
|---|---|
| `prisma/schema.prisma` | Database schema (53 models, 15 enums) |
| `src/lib/rbac.ts` | RBAC permission definitions (6 roles, 35 permissions) |
| `src/lib/field-permissions.ts` | Field-level edit permission matrix |
| `src/lib/meilisearch.ts` | MeiliSearch client and index configuration |
| `src/lib/ai/claude-client.ts` | Anthropic Claude API client singleton |
| `src/lib/ai/*.ts` | 18 algorithmic AI modules |
| `src/app/api/ai/*/route.ts` | 22 AI API endpoints |
| `src/app/api/` | 28 REST API route groups |
| `docker-compose.yml` | Development infrastructure (5 services) |
| `.env.local` | Environment configuration (16 variables) |
| `package.json` | Dependencies and scripts |
