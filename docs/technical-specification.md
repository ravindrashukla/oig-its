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

The system includes **22 AI algorithms** across two categories: **18 algorithmic (rule-based/statistical)** modules in `src/lib/ai/` and **4 Claude LLM-powered** endpoints.

### Algorithmic Modules (src/lib/ai/)

| # | Algorithm | File | SOW Ref | Description |
|---|---|---|---|---|
| 1 | Anomaly Detection | `anomaly-detection.ts` | RRS24 | Statistical z-score analysis across case data to identify outlier patterns in timelines, financials, and activity |
| 2 | Risk Scoring | `risk-scoring.ts` | HWC1 | Keyword-weighted risk assessment for incoming complaints; outputs score (0-100), risk level, and contributing factors |
| 3 | Case Similarity | `case-similarity.ts` | CM4, RRS11 | Cosine similarity over case attributes (type, source, jurisdiction) to find related investigations |
| 4 | Entity Resolution | `entity-resolution.ts` | EF15, WPN16 | Levenshtein edit-distance matching to detect duplicate subjects across cases |
| 5 | Predictive Analytics | `predictions.ts` | RRS23 | Duration prediction, outcome probability, and caseload forecasting using historical data regression |
| 6 | Network Analysis | `network-analysis.ts` | CM49, CM4 | Graph-based analysis of subject-case relationships to identify fraud rings and high-connectivity nodes |
| 7 | Document Classifier | `document-classifier.ts` | DMR1, EF5 | Rule-based classification of documents into 11 categories with confidence scoring and tag generation |
| 8 | Investigator Recommender | `investigator-recommender.ts` | C17 | Workload-balanced investigator assignment recommendations based on expertise, caseload, and case type match |
| 9 | Auto-Escalation | `auto-escalation.ts` | WPN27 | Automated priority escalation recommendations for cases approaching deadlines or with overdue tasks |
| 10 | Evidence Strength | `evidence-strength.ts` | EF7 | Point-based evidence portfolio grading (A-F) based on diversity, volume, and chain-of-custody completeness |
| 11 | Complaint Deduplication | `complaint-dedup.ts` | EF15, HWC1 | Keyword overlap and Levenshtein matching to identify duplicate complaints across inquiries and cases |
| 12 | Timeline Anomalies | `timeline-anomalies.ts` | CM34 | Detection of suspicious activity patterns (weekend activity, after-hours, rapid sequences, large gaps) |
| 13 | Workload Balancing | `workload-balancing.ts` | RRS23, C17 | Real-time workload scoring per investigator considering active cases, overdue tasks, and critical case count |
| 14 | Closure Readiness | `closure-readiness.ts` | CM41 | Checklist-based scoring to determine if a case meets all closure requirements |
| 15 | Financial Patterns | `financial-patterns.ts` | FC1, RRS24 | Pattern mining across financial results to detect round-number clustering, duplicates, and suspicious distributions |
| 16 | Subject Risk Profiling | `subject-risk.ts` | CM8, CM49 | Multi-factor risk scoring for subjects based on case history, violation count, and recidivism patterns |
| 17 | Case Narrative | `case-narrative.ts` | RRS16, CM34 | Automated generation of structured case narratives with sections for opening, subjects, investigation, violations, financials, referrals, and status |
| 18 | Case Clustering | (via `case-similarity.ts`) | RRS11 | Groups similar cases into clusters based on attribute similarity vectors |

### Claude LLM-Powered Endpoints

| # | Endpoint | Purpose |
|---|---|---|
| 19 | `/api/ai/natural-search` | Natural language search -- converts plain English queries to structured search parameters |
| 20 | `/api/ai/analyze-document` | AI-powered document analysis and summarization |
| 21 | `/api/ai/interview-questions` | Generates case-specific interview questions for investigation preparation |
| 22 | `/api/ai/generate-report` | AI-assisted investigation report drafting |

All Claude-powered features use the `claude-sonnet-4-20250514` model via the `@anthropic-ai/sdk` client (`src/lib/ai/claude-client.ts`) with a 30-second timeout.

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
