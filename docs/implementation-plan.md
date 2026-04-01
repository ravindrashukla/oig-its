# System Implementation Plan

## Office of Inspector General — Investigation Tracking System (OIG-ITS)

| Field              | Value                                              |
|--------------------|----------------------------------------------------|
| **Document ID**    | OIG-ITS-SIP-001                                    |
| **Version**        | 1.0                                                |
| **Date**           | March 31, 2026                                     |
| **Author**         | OIG Information Technology Division                |
| **Classification** | For Official Use Only (FOUO)                       |
| **SOW Reference**  | Deliverable DM4 — System Implementation Plan       |
| **Status**         | Draft                                              |

### Revision History

| Version | Date       | Author                        | Description              |
|---------|------------|-------------------------------|--------------------------|
| 0.1     | 2026-03-15 | OIG IT Division               | Initial draft             |
| 0.5     | 2026-03-25 | OIG IT Division               | Internal review           |
| 1.0     | 2026-03-31 | OIG IT Division               | Baseline release          |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Description](#2-system-description)
3. [Implementation Phases](#3-implementation-phases)
4. [Data Migration Plan](#4-data-migration-plan)
5. [Testing Strategy](#5-testing-strategy)
6. [Training Plan](#6-training-plan)
7. [Risk Management](#7-risk-management)
8. [Resource Requirements](#8-resource-requirements)
9. [Security and Compliance](#9-security-and-compliance)
10. [Support and Maintenance](#10-support-and-maintenance)
11. [Milestones and Schedule](#11-milestones-and-schedule)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

### 1.1 Project Overview

The Office of Inspector General Investigation Tracking System (OIG-ITS) is a comprehensive, web-based case management platform designed to modernize and replace the legacy investigation tracking infrastructure currently in use by the OIG. The system provides end-to-end lifecycle management for investigations, audits, preliminary inquiries, and compliance activities conducted by the Office of Inspector General.

### 1.2 Purpose

This System Implementation Plan (SIP) establishes the detailed strategy, timeline, and procedures for deploying OIG-ITS into the production environment. The plan addresses all phases of implementation from infrastructure provisioning through post-go-live stabilization, in accordance with Statement of Work deliverable DM4.

### 1.3 Stakeholders

| Stakeholder                          | Role                                      |
|--------------------------------------|--------------------------------------------|
| Inspector General                    | Executive Sponsor                          |
| Deputy Inspector General             | Authorizing Official                       |
| Assistant IG for Investigations      | Primary Business Owner                     |
| Assistant IG for Audits              | Secondary Business Owner                   |
| Chief Information Officer (CIO)      | Technical Authority                        |
| Information System Security Officer  | Security Oversight                         |
| OIG Investigators                    | Primary End Users                          |
| OIG Supervisors                      | Approving Officials / End Users            |
| OIG Analysts                         | End Users                                  |
| OIG Auditors                         | End Users                                  |
| Contractor Development Team          | System Development and Deployment          |

### 1.4 Implementation Approach

OIG-ITS shall be implemented using an Agile methodology with phased delivery across an 18-week deployment window. The implementation is organized into six distinct phases, each with defined entry criteria, deliverables, and Go/No-Go decision points. This approach mitigates risk by allowing incremental validation of system functionality before proceeding to subsequent phases.

### 1.5 Timeline Overview

The implementation spans 18 weeks, commencing upon Authority to Operate (ATO) approval and infrastructure readiness confirmation. The six phases are:

- **Phase 1:** Infrastructure Setup (Weeks 1--2)
- **Phase 2:** Core Application Deployment (Weeks 3--4)
- **Phase 3:** Data Migration (Weeks 5--8)
- **Phase 4:** Integration and Testing (Weeks 9--12)
- **Phase 5:** Training and Go-Live (Weeks 13--16)
- **Phase 6:** Stabilization (Weeks 17--18)

---

## 2. System Description

### 2.1 Current State (Legacy System)

The current investigation tracking environment consists of a combination of spreadsheet-based tracking tools, shared network drives for document storage, email-based workflow coordination, and manual reporting processes. Key deficiencies of the legacy system include:

- **No centralized case management:** Investigation data is fragmented across multiple spreadsheets, email threads, and individual workstations, resulting in data silos and limited visibility for supervisors and management.
- **Manual workflow processes:** Case assignments, status updates, and approval workflows are conducted via email, introducing delays and eliminating audit trail integrity.
- **Limited search capability:** Investigators cannot efficiently search across historical cases, subjects, or evidentiary records.
- **No role-based access control:** Sensitive investigation data lacks granular access controls, creating compliance and privacy risks.
- **Inadequate reporting:** Management reports require manual compilation, resulting in stale data and significant labor expenditure.
- **No chain-of-custody tracking:** Evidence handling lacks systematic documentation, introducing risk to prosecutorial viability.
- **No integration with analytical tools:** Investigators lack access to AI-powered analytics, pattern detection, and risk scoring capabilities.

### 2.2 Target State (OIG-ITS)

OIG-ITS is a modern, full-stack web application built on Next.js 16, PostgreSQL 16, and a suite of supporting services. The system delivers the following target-state architecture:

- **Centralized case management** with support for fraud, waste, abuse, misconduct, whistleblower, compliance, outreach, and briefing case types.
- **53 data models** encompassing the complete investigation lifecycle, from preliminary inquiry through case closure and archival.
- **Role-based access control (RBAC)** with six defined roles: Administrator, Investigator, Supervisor, Analyst, Auditor, and Read-Only.
- **Full-text search** powered by MeiliSearch for rapid retrieval across cases, subjects, documents, and evidence.
- **Object storage** via MinIO (S3-compatible) for secure document and evidence file management.
- **Background job processing** via BullMQ/Redis for asynchronous operations including email notifications, scheduled reports, and training expiration checks.
- **AI-powered investigation intelligence** comprising 17 algorithm endpoints for risk scoring, similar-case identification, duplicate subject detection, document classification, anomaly detection, network analysis, case clustering, complaint deduplication, investigator recommendation, escalation prediction, evidence strength assessment, timeline anomaly detection, closure readiness evaluation, workload balancing, financial pattern analysis, subject risk profiling, and case narrative generation.
- **Comprehensive audit logging** with immutable records of all system actions for accountability and FISMA compliance.
- **96 API endpoints** supporting the full range of system operations.
- **24 dashboard modules** including case management, subjects, documents, evidence, tasks, workflows, analytics, AI, reports, training, timesheets, calendar, inventory, inquiries, approvals, financial, audit log, notifications, search, settings, and user administration.

### 2.3 Key Capabilities Delivered

| Capability                       | Description                                                                 |
|----------------------------------|-----------------------------------------------------------------------------|
| Case Lifecycle Management        | Intake through closure with configurable status workflows                   |
| Preliminary Inquiries            | Pre-investigation inquiry tracking with conversion to full cases            |
| Subject Management               | Hierarchical subject tracking across cases with role classification         |
| Document Management              | Versioned document storage with approval workflows and retention policies   |
| Evidence Management              | Chain-of-custody tracking with evidence file attachments                    |
| Task Management                  | Assignment, tracking, and completion of investigative tasks                 |
| Workflow Engine                  | Configurable multi-step workflows for case intake, investigation, and review|
| Time and Expense Tracking        | Timesheet management with supervisor approval workflows                    |
| Training Management              | Course tracking, assignments, evaluations, and expiration monitoring        |
| Subpoena Management              | Subpoena package preparation with approval tracking                        |
| Financial Results Tracking       | Monetary recovery and savings documentation per investigation              |
| Investigative Techniques Logging | Documentation of techniques employed per case                              |
| Referral Management              | Inter-agency and intra-agency referral tracking                            |
| Reporting and Analytics          | Configurable reports with scheduling and review workflows                  |
| AI Investigation Intelligence    | 17 machine-learning-powered analytical capabilities                        |
| Whistleblower and Hotline Intake | Public-facing submission endpoints with anonymous reporting                 |
| Calendar and Reminders           | Case-linked calendar events with automated reminders                       |
| Inventory Management             | Equipment and asset tracking with assignment history                        |
| Delegation Management            | Authority delegation tracking between users                                |
| Notification System              | In-app and email notifications with per-user preference configuration      |
| Saved Searches                   | Persistent search criteria for rapid retrieval                             |
| User Preferences                 | Per-user customization including keyboard shortcuts                        |
| Data Export                      | Bulk export of cases, subjects, and documents in standard formats          |
| Audit Logging                    | Immutable action-level audit trail for all system operations               |

---

## 3. Implementation Phases

### Phase 1: Infrastructure Setup (Weeks 1--2)

**Objective:** Establish the production hosting environment with all required infrastructure services provisioned, configured, and validated.

**Activities:**

1. **Docker Environment Deployment**
   - Provision production server(s) meeting minimum hardware specifications (see Section 8.2).
   - Install Docker Engine and Docker Compose on production host(s).
   - Configure container networking, volume mounts, and resource limits.
   - Validate container orchestration with health checks.

2. **PostgreSQL Database Provisioning**
   - Deploy PostgreSQL 16 Alpine container with persistent volume storage.
   - Configure database users, roles, and connection pooling parameters.
   - Establish automated backup schedules (daily full, hourly incremental).
   - Validate connectivity from application containers.

3. **MeiliSearch Setup**
   - Deploy MeiliSearch v1.6 container with persistent index storage.
   - Configure master key and API key rotation schedule.
   - Establish index configuration for case, subject, and document search.
   - Validate search endpoint availability.

4. **MinIO Object Storage Setup**
   - Deploy MinIO container with persistent data volume.
   - Configure access policies, bucket structure, and retention policies.
   - Establish bucket naming conventions (e.g., `oig-its-documents`, `oig-its-evidence`).
   - Validate S3-compatible API connectivity.

5. **Redis Setup**
   - Deploy Redis 7 Alpine container for session management and job queue support.
   - Configure persistence (AOF) and memory limits.
   - Validate BullMQ connectivity for background job processing.

6. **SSL/TLS Certificates**
   - Obtain and install agency-approved SSL/TLS certificates.
   - Configure TLS termination at the reverse proxy layer.
   - Validate certificate chain integrity and expiration monitoring.

7. **Network Configuration**
   - Configure firewall rules per agency security requirements.
   - Establish network segmentation between application, database, and storage tiers.
   - Configure DNS entries for production URL.
   - Validate network connectivity across all service components.

**Exit Criteria:** All infrastructure services are operational, monitored, and passing health checks. Infrastructure readiness sign-off obtained from the CIO and ISSO.

---

### Phase 2: Core Application Deployment (Weeks 3--4)

**Objective:** Deploy the OIG-ITS application, execute database migrations, seed reference data, and configure role-based access controls.

**Activities:**

1. **Application Build and Deployment**
   - Execute production build (`next build`) with production environment variables.
   - Deploy application container with appropriate resource allocations.
   - Configure reverse proxy (nginx/Apache) with SSL termination.
   - Validate application startup and endpoint availability.

2. **Database Migration Execution**
   - Execute Prisma migrations against the production database (20 migration files).
   - Validate schema integrity across all 53 models.
   - Confirm index creation for performance-critical queries.
   - Document migration execution log for audit purposes.

3. **Initial Data Seeding**
   - Seed reference data tables (case types, priorities, statuses, violation codes).
   - Populate system settings with agency-specific configuration values.
   - Load feature flag defaults.
   - Configure default report definitions and schedules.

4. **RBAC Role Configuration**
   - Configure the six user roles (Admin, Investigator, Supervisor, Analyst, Auditor, Read-Only) with appropriate permission matrices.
   - Validate role-based endpoint restrictions across all 96 API routes.
   - Document role-permission mapping for security accreditation package.

5. **User Account Provisioning**
   - Create administrator accounts for IT staff.
   - Provision initial user accounts per organizational roster.
   - Configure password policies (minimum length, complexity, expiration).
   - Validate account lockout mechanisms (failed login attempt thresholds).

**Exit Criteria:** Application is deployed, all migrations are successful, RBAC is validated, and administrator accounts are functional. Application readiness sign-off obtained.

---

### Phase 3: Data Migration (Weeks 5--8)

**Objective:** Migrate all relevant data from legacy systems into OIG-ITS with full validation and reconciliation.

**Activities:**

1. **Legacy Data Assessment (Week 5)**
   - Inventory all legacy data sources (spreadsheets, databases, file shares, email archives).
   - Assess data quality, completeness, and format consistency.
   - Identify data cleansing requirements and transformation rules.
   - Document data volumes and estimated migration duration.

2. **Field Mapping Document (Week 5)**
   - Create detailed field-level mapping from legacy data structures to OIG-ITS Prisma models.
   - Document data type conversions, default values, and validation rules.
   - Identify fields requiring manual review or enrichment.
   - Obtain business owner approval of mapping document.

3. **Migration Scripts Development (Week 6)**
   - Develop automated migration scripts for each entity type.
   - Implement data transformation and cleansing logic.
   - Build validation checks into the migration pipeline.
   - Develop bulk document upload scripts using the `/api/import/cases` and `/api/import/documents` endpoints.

4. **Test Migration Execution (Week 6--7)**
   - Execute migration against a staging environment with production-equivalent data.
   - Validate record counts, field mappings, and referential integrity.
   - Conduct user verification of migrated data for accuracy.
   - Document discrepancies and corrective actions.

5. **Data Validation and Reconciliation (Week 7)**
   - Perform automated reconciliation of record counts between source and target.
   - Validate referential integrity across all foreign key relationships.
   - Spot-check individual records across all entity types.
   - Generate and archive reconciliation reports.

6. **Production Migration (Week 8)**
   - Execute production migration during scheduled maintenance window.
   - Verify migration success criteria.
   - Re-index MeiliSearch with migrated data.
   - Validate document and evidence file accessibility in MinIO.

7. **Rollback Plan**
   - Maintain pre-migration database snapshot for 30 days.
   - Document step-by-step rollback procedures.
   - Establish rollback decision criteria and authorization chain.
   - Test rollback procedure in staging environment prior to production migration.

**Exit Criteria:** All legacy data is migrated, validated, and reconciled. Migration completion sign-off obtained from business owners.

---

### Phase 4: Integration and Testing (Weeks 9--12)

**Objective:** Validate all system integrations, conduct comprehensive security and performance testing, and obtain user acceptance.

**Activities:**

1. **MeiliSearch Index Synchronization (Week 9)**
   - Validate search index synchronization with PostgreSQL data.
   - Test search accuracy across cases, subjects, and documents.
   - Verify incremental index updates on data changes.
   - Load-test search performance under concurrent user scenarios.

2. **Email Notification Testing (Week 9)**
   - Validate SMTP configuration with agency mail server.
   - Test all notification types (case assigned, task due, document uploaded, etc.).
   - Verify notification preference controls function correctly.
   - Confirm email delivery reliability and formatting.

3. **File Storage Validation (Week 9)**
   - Validate document upload, download, and deletion workflows.
   - Test document versioning and retention policy enforcement.
   - Verify evidence file chain-of-custody tracking.
   - Test bulk document download (ZIP archive) functionality.

4. **Security Testing (Weeks 10--11)**
   - Conduct penetration testing by an independent security assessor.
   - Validate RBAC enforcement across all 96 API endpoints.
   - Test account lockout, session management, and password reset flows.
   - Verify audit log completeness for all security-relevant actions.
   - Test input validation and protection against injection attacks.
   - Validate CSRF, XSS, and SSRF protections.

5. **Performance Testing (Week 11)**
   - Conduct load testing with 30+ concurrent simulated users.
   - Measure response times for critical operations (case creation, search, document upload).
   - Test database query performance under load with 53-model schema.
   - Validate background job processing throughput (BullMQ/Redis).
   - Identify and remediate performance bottlenecks.

6. **User Acceptance Testing (Weeks 11--12)**
   - Execute UAT test cases covering all 24 dashboard modules.
   - Validate end-to-end workflows (case intake through closure).
   - Test AI-powered features (risk scoring, similar cases, document classification).
   - Document UAT findings and prioritize defect remediation.
   - Obtain formal UAT sign-off from business owners.

7. **508 Accessibility Testing (Week 12)**
   - Conduct automated accessibility scanning with WCAG 2.1 AA compliance tools.
   - Perform manual keyboard navigation testing across all modules.
   - Test screen reader compatibility.
   - Validate color contrast ratios and focus indicators.
   - Remediate identified accessibility deficiencies.

**Exit Criteria:** All tests pass acceptance criteria, security findings are remediated or have approved Plans of Action and Milestones (POA&M), and UAT sign-off is obtained.

---

### Phase 5: Training and Go-Live (Weeks 13--16)

**Objective:** Train all user roles, conduct parallel operations, and execute production go-live cutover.

**Activities:**

1. **Administrator Training (Week 13)**
   - System administration procedures (user management, role assignment).
   - Reference data and system settings configuration.
   - Report definition and scheduling.
   - Backup, recovery, and incident response procedures.
   - Feature flag management.

2. **End-User Training by Role (Weeks 13--14)**
   - **Investigators:** Case creation, subject management, evidence handling, document upload, task management, time entry, AI tools.
   - **Supervisors:** Case assignment, approval workflows, reporting, timesheet approval, performance dashboards.
   - **Analysts:** Search and analytics, AI investigation intelligence, financial analysis, report generation.
   - **Auditors:** Audit log review, compliance reporting, evidence review.
   - **Read-Only Users:** Dashboard navigation, case viewing, report access.

3. **Parallel Operations Period (Weeks 14--15)**
   - Operate OIG-ITS in parallel with legacy systems for a minimum of two weeks.
   - Require users to enter data in both systems during parallel period.
   - Compare outputs and identify discrepancies.
   - Document and resolve issues discovered during parallel operations.

4. **Go-Live Cutover (Week 16)**
   - Execute final data synchronization from legacy systems.
   - Disable write access to legacy systems.
   - Redirect users to OIG-ITS production URL.
   - Activate email notification delivery.
   - Confirm all background jobs are operational.
   - Issue formal go-live communication to all stakeholders.

5. **Post-Go-Live Support (Week 16)**
   - Deploy on-site and remote support personnel during first week of production use.
   - Establish dedicated support communication channel.
   - Monitor system performance and error logs continuously.
   - Address critical issues within 4-hour SLA.

**Exit Criteria:** All users are trained, parallel operations are completed successfully, and go-live cutover is executed without critical issues.

---

### Phase 6: Stabilization (Weeks 17--18)

**Objective:** Resolve post-go-live issues, optimize performance, and finalize documentation.

**Activities:**

1. **Bug Fix Window (Week 17)**
   - Triage and prioritize reported defects.
   - Deploy critical and high-priority fixes via expedited change management.
   - Regression-test deployed fixes.

2. **Performance Tuning (Week 17)**
   - Analyze production performance metrics.
   - Optimize database queries and indexes based on actual usage patterns.
   - Tune MeiliSearch index configuration for search relevance.
   - Adjust Redis memory allocation and BullMQ concurrency settings.

3. **User Feedback Collection (Week 18)**
   - Distribute user satisfaction surveys.
   - Conduct feedback sessions with each user role group.
   - Prioritize enhancement requests for future releases.

4. **Documentation Finalization (Week 18)**
   - Update all system documentation to reflect as-deployed configuration.
   - Finalize operations and maintenance guide.
   - Archive implementation artifacts.
   - Deliver final SIP update as a project closeout deliverable.

**Exit Criteria:** All critical defects are resolved, documentation is finalized, and implementation closeout report is delivered.

---

## 4. Data Migration Plan

### 4.1 Source Systems Inventory

| Source System             | Data Type                    | Format             | Estimated Volume   |
|---------------------------|------------------------------|--------------------|--------------------|
| Legacy Case Spreadsheets  | Case records                 | XLSX/CSV           | 5,000--15,000 rows |
| Network File Shares       | Investigation documents      | PDF, DOCX, XLSX    | 50,000+ files      |
| Email Archives            | Correspondence, attachments  | MSG/EML            | 10,000+ items      |
| Personnel Database        | Investigator profiles        | CSV export         | 200--500 records   |
| Training Records          | Certifications, completions  | XLSX               | 2,000+ records     |
| Evidence Logs             | Evidence tracking sheets     | XLSX               | 5,000+ records     |

### 4.2 Entity Mapping (Legacy to OIG-ITS Models)

| Legacy Entity         | OIG-ITS Model             | Key Transformations                           |
|-----------------------|---------------------------|-----------------------------------------------|
| Case record           | Case                      | Status normalization, case number generation   |
| Person of interest    | Subject + CaseSubject     | Type classification, role assignment           |
| Case assignment       | CaseAssignment            | Role standardization                           |
| Investigation notes   | CaseNote                  | Author mapping, timestamp normalization        |
| Documents             | Document                  | File migration to MinIO, metadata extraction   |
| Evidence items        | EvidenceItem + EvidenceFile| Chain-of-custody initialization                |
| Task lists            | Task                      | Status mapping, assignee resolution            |
| Violations            | Violation                 | Code normalization                             |
| Financial outcomes    | FinancialResult           | Currency formatting, type classification       |
| Referrals             | Referral                  | Agency name standardization                    |
| Training records      | TrainingRecord            | Course mapping, date normalization             |
| Equipment inventory   | InventoryItem             | Serial number validation                       |

### 4.3 Document Migration Approach

Document migration shall utilize the bulk upload API (`/api/import/documents`) to process files in batches. The migration pipeline shall:

1. Scan source file shares and enumerate all investigation-related documents.
2. Extract metadata (file name, creation date, author, associated case identifier).
3. Upload files to MinIO via the S3-compatible API.
4. Create corresponding Document records in PostgreSQL with file key references.
5. Index document metadata in MeiliSearch for full-text search.
6. Validate file integrity via checksum comparison (source vs. stored).

### 4.4 Validation Criteria

- Record count reconciliation: 100% match between source and target for all entity types.
- Referential integrity: Zero orphaned records across all foreign key relationships.
- Document accessibility: 100% of migrated documents retrievable via the application.
- Search coverage: 100% of migrated records indexed and searchable in MeiliSearch.
- Data accuracy: Random sample validation of 5% of migrated records by business users.

### 4.5 Rollback Procedures

1. **Pre-Migration Snapshot:** Full PostgreSQL database dump and MinIO bucket snapshot captured immediately prior to production migration.
2. **Rollback Trigger:** Migration failure affecting more than 1% of records, or critical data integrity issue identified within 72 hours of migration.
3. **Rollback Execution:** Restore PostgreSQL from pre-migration snapshot; restore MinIO bucket from snapshot; re-index MeiliSearch; verify application functionality.
4. **Rollback Authorization:** Requires approval from Project Manager and CIO.

---

## 5. Testing Strategy

### 5.1 Unit Testing

OIG-ITS includes an automated test suite comprising 100+ test cases (`test-100.sh`) covering all critical system functions. The test suite validates:

- Security and RBAC enforcement (role-based endpoint access control)
- Case CRUD operations (create, read, update, delete)
- Subject management and case-subject linkage
- Document upload, versioning, and approval workflows
- Evidence management and chain-of-custody tracking
- Task lifecycle management
- Workflow engine execution
- Time tracking and timesheet approval
- Training management and expiration monitoring
- AI algorithm endpoint availability and response correctness
- Search functionality and index synchronization
- Notification delivery and preference management
- Audit log generation and completeness
- Data export functionality

All unit tests shall pass at 100% prior to deployment to production.

### 5.2 Integration Testing

Integration tests shall validate:

- NextAuth.js authentication flow with session management.
- PostgreSQL data persistence and transactional integrity.
- MeiliSearch index synchronization on data create, update, and delete operations.
- MinIO file storage operations (upload, download, delete, bulk archive).
- BullMQ/Redis job processing for email notifications and scheduled reports.
- Anthropic AI SDK integration for investigation intelligence features.

### 5.3 Security Testing

- **Penetration Testing:** Conducted by an independent, agency-approved security assessor.
- **RBAC Validation:** Systematic testing of all 96 API endpoints against all 6 user roles.
- **Authentication Testing:** Password policy enforcement, account lockout, session timeout, password reset.
- **Input Validation:** SQL injection, XSS, CSRF, and command injection testing.
- **Encryption Validation:** Data-at-rest (PostgreSQL, MinIO) and data-in-transit (TLS) verification.

### 5.4 Performance Testing

| Metric                    | Target                                   |
|---------------------------|------------------------------------------|
| Concurrent Users          | 30+ simultaneous users without degradation |
| Page Load Time            | < 2 seconds for dashboard views          |
| API Response Time         | < 500ms for standard CRUD operations     |
| Search Response Time      | < 200ms for full-text search queries     |
| Document Upload           | < 5 seconds for files up to 50MB         |
| Report Generation         | < 30 seconds for standard reports        |
| AI Algorithm Response     | < 10 seconds for analytical operations   |

### 5.5 UAT Test Cases

UAT test cases shall cover all 24 dashboard modules with scenario-based testing:

1. Complete case lifecycle: Intake, assignment, investigation, review, closure.
2. Preliminary inquiry creation and conversion to full case.
3. Subject creation with hierarchical relationships.
4. Document upload, version management, approval, and redaction.
5. Evidence collection with chain-of-custody documentation.
6. Workflow initiation and multi-step approval completion.
7. Time entry and timesheet submission with supervisor approval.
8. Training course assignment, completion, and evaluation.
9. Report creation, scheduling, and review workflow.
10. AI-powered risk assessment and case similarity analysis.

### 5.6 Acceptance Criteria

- All unit tests pass at 100%.
- All critical and high-severity defects are resolved.
- Security penetration test yields no unmitigated critical findings.
- Performance benchmarks meet or exceed targets in Section 5.4.
- UAT sign-off obtained from the Assistant IG for Investigations.
- 508 accessibility compliance validated to WCAG 2.1 AA.

---

## 6. Training Plan

### 6.1 Training Schedule by Role

| Role          | Training Duration | Training Window | Delivery Method      |
|---------------|-------------------|-----------------|----------------------|
| Administrator | 8 hours           | Week 13         | In-person, hands-on  |
| Investigator  | 6 hours           | Weeks 13--14    | In-person, hands-on  |
| Supervisor    | 4 hours           | Week 13         | In-person, hands-on  |
| Analyst       | 4 hours           | Week 14         | In-person, hands-on  |
| Auditor       | 3 hours           | Week 14         | In-person, hands-on  |
| Read-Only     | 2 hours           | Week 14         | Virtual, recorded    |

### 6.2 Training Materials

| Material                          | Format                | Audience          |
|-----------------------------------|-----------------------|-------------------|
| OIG-ITS User Manual               | PDF (print-ready)     | All users         |
| Quick Reference Cards (per role)   | Laminated, 2-sided    | All users         |
| System Demo Video                  | MP4 (4:38 duration)   | All users         |
| Administrator Guide                | PDF                   | IT Administrators |
| Data Migration Reference Guide     | PDF                   | IT Staff          |
| Security Configuration Guide       | PDF (FOUO)            | ISSO, IT Staff    |

### 6.3 Train-the-Trainer Approach

OIG-ITS shall adopt a train-the-trainer model to ensure sustainable knowledge transfer:

1. **Master Trainers:** Two to three staff members per regional office shall be designated as Master Trainers.
2. **Master Trainer Certification:** Master Trainers shall complete the full 8-hour administrator training plus a 4-hour training facilitation workshop.
3. **Ongoing Training Delivery:** Master Trainers shall be responsible for onboarding new personnel and delivering refresher training on a quarterly basis.
4. **Training Materials Maintenance:** Master Trainers shall coordinate with the IT Division to update training materials following system updates.

### 6.4 Ongoing Support Plan

- **Help Desk Integration:** OIG-ITS support tier integrated into existing agency help desk (Tier 1 triage, Tier 2 application support, Tier 3 development team escalation).
- **Knowledge Base:** Searchable FAQ and troubleshooting articles maintained in the agency intranet.
- **Office Hours:** Weekly virtual office hours during the first 90 days post-go-live.
- **Feedback Channel:** Dedicated feedback mechanism within the application for enhancement requests.

---

## 7. Risk Management

### 7.1 Risk Register

| ID   | Risk Description                                          | Probability | Impact   | Mitigation Strategy                                                      |
|------|-----------------------------------------------------------|-------------|----------|--------------------------------------------------------------------------|
| R-01 | Legacy data quality issues cause migration delays         | High        | High     | Conduct early data profiling; build data cleansing into migration scripts |
| R-02 | User resistance to new system                             | Medium      | High     | Comprehensive training; executive communications; champion network       |
| R-03 | Infrastructure provisioning delays                        | Medium      | High     | Early procurement; pre-staged Docker images; contingency cloud hosting   |
| R-04 | Security vulnerabilities discovered during pen test       | Medium      | Critical | Allocate remediation sprint in schedule; prioritize findings by severity |
| R-05 | Performance degradation under concurrent load             | Low         | High     | Early performance testing; database index optimization; caching strategy |
| R-06 | ATO approval timeline exceeds plan                        | Medium      | Critical | Begin security documentation early; engage ISSO from Phase 1             |
| R-07 | Key personnel turnover during implementation              | Low         | Medium   | Cross-training; documentation; knowledge transfer sessions               |
| R-08 | Third-party service outage (MeiliSearch, MinIO)           | Low         | Medium   | Containerized deployment with local persistence; backup/restore procedures|
| R-09 | Data loss during migration cutover                        | Low         | Critical | Pre-migration snapshots; validated rollback procedures; parallel period  |
| R-10 | Scope creep from stakeholder enhancement requests         | High        | Medium   | Strict change control board process; defer non-critical items to Phase 2 release |

### 7.2 Contingency Plans

- **Migration Failure:** Execute rollback to pre-migration database snapshot; extend migration window by two weeks.
- **Go-Live Critical Defect:** Revert to legacy systems; activate incident response team; deploy fix within 48 hours.
- **Infrastructure Failure:** Failover to pre-configured backup environment; restore from most recent backup.
- **ATO Delay:** Continue UAT and training activities; defer go-live to earliest available date post-ATO.

---

## 8. Resource Requirements

### 8.1 Personnel

| Role                    | FTE   | Duration         | Responsibilities                                      |
|-------------------------|-------|------------------|-------------------------------------------------------|
| Project Manager         | 1.0   | Weeks 1--18      | Overall implementation coordination and reporting      |
| Lead Developer          | 1.0   | Weeks 1--18      | Technical architecture, deployment, and issue resolution|
| Full-Stack Developer    | 2.0   | Weeks 1--17      | Application deployment, migration scripts, bug fixes   |
| Database Administrator  | 0.5   | Weeks 1--8       | PostgreSQL provisioning, migration, optimization       |
| Security Engineer       | 0.5   | Weeks 1--12      | Security configuration, pen test coordination          |
| QA/Test Engineer        | 1.0   | Weeks 5--16      | Test execution, defect management, UAT coordination    |
| DevOps Engineer         | 0.5   | Weeks 1--4       | Docker, CI/CD, infrastructure automation               |
| Training Specialist     | 1.0   | Weeks 12--16     | Training material development and delivery             |
| Business Analyst        | 0.5   | Weeks 5--12      | Data mapping, UAT coordination, requirements validation|

### 8.2 Infrastructure

| Component                | Specification                                    | Quantity |
|--------------------------|--------------------------------------------------|----------|
| Application Server       | 8 vCPU, 32 GB RAM, 100 GB SSD                   | 2 (HA)   |
| Database Server          | 8 vCPU, 64 GB RAM, 500 GB SSD (NVMe)            | 1 + 1 replica |
| Object Storage (MinIO)   | 4 vCPU, 16 GB RAM, 2 TB HDD                     | 1        |
| Search Server (MeiliSearch)| 4 vCPU, 16 GB RAM, 100 GB SSD                  | 1        |
| Redis Server             | 2 vCPU, 8 GB RAM, 50 GB SSD                     | 1        |
| Load Balancer / Reverse Proxy | 2 vCPU, 4 GB RAM                             | 1        |
| Backup Storage           | 5 TB network-attached storage                    | 1        |

### 8.3 Software Licenses

| Software           | License Type        | Notes                                        |
|--------------------|---------------------|----------------------------------------------|
| Next.js 16         | MIT (Open Source)   | No license cost                              |
| PostgreSQL 16      | PostgreSQL License  | No license cost                              |
| MeiliSearch v1.6   | MIT (Open Source)   | No license cost                              |
| MinIO              | AGPLv3 / Commercial| Evaluate commercial license for production   |
| Redis 7            | BSD (Open Source)   | No license cost                              |
| Prisma ORM 7.6     | Apache 2.0          | No license cost                              |
| Anthropic Claude API| Commercial SaaS    | API usage-based pricing for AI features      |
| Docker Engine      | Apache 2.0          | No license cost                              |
| SSL/TLS Certificates| Agency CA          | Per agency certificate authority procedures  |

---

## 9. Security and Compliance

### 9.1 ATO Timeline

| Milestone                               | Target Date     |
|-----------------------------------------|-----------------|
| Security Plan (SSP) submission          | Week -4         |
| Security Assessment (SA&A) initiation   | Week -2         |
| Penetration Test execution              | Weeks 10--11    |
| POA&M development                       | Week 11         |
| ATO decision                            | Week 12         |
| Continuous monitoring initiation        | Week 13         |

### 9.2 FISMA Documentation Checklist

| Document                                          | Status      |
|---------------------------------------------------|-------------|
| System Security Plan (SSP)                        | In Progress |
| Risk Assessment (RA)                              | In Progress |
| Security Assessment Report (SAR)                  | Planned     |
| Plan of Action and Milestones (POA&M)             | Planned     |
| Configuration Management Plan (CMP)               | In Progress |
| Contingency Plan (CP)                             | In Progress |
| Incident Response Plan (IRP)                      | Planned     |
| Privacy Impact Assessment (PIA)                   | Planned     |
| System of Records Notice (SORN)                   | Under Review|
| Rules of Behavior (ROB)                           | Complete    |
| Interconnection Security Agreement (ISA)          | N/A         |

### 9.3 FedRAMP Alignment

OIG-ITS is deployed on-premises within the agency's accredited network boundary. Where cloud-hosted components are utilized (e.g., Anthropic Claude API for AI features), the agency shall ensure that such services maintain FedRAMP Moderate authorization or obtain an approved waiver per agency policy.

### 9.4 Privacy Impact Assessment Schedule

| Activity                          | Target      |
|-----------------------------------|-------------|
| PIA initial draft                 | Week 2      |
| Privacy review board submission   | Week 4      |
| PIA approval                      | Week 8      |
| PIA publication (if required)     | Week 10     |

### 9.5 Security Control Implementation Status

OIG-ITS implements the following NIST SP 800-53 control families:

| Control Family                    | Implementation Status                                      |
|-----------------------------------|------------------------------------------------------------|
| AC (Access Control)               | Implemented — RBAC with 6 roles, session management        |
| AU (Audit and Accountability)     | Implemented — Immutable audit logs, 10 action types        |
| AT (Awareness and Training)       | Implemented — Training management module                   |
| CM (Configuration Management)     | Implemented — Feature flags, system settings               |
| CP (Contingency Planning)         | Planned — Backup procedures, rollback documentation        |
| IA (Identification and Auth)      | Implemented — bcrypt password hashing, account lockout     |
| IR (Incident Response)            | Planned — Procedures to be documented                      |
| MA (Maintenance)                  | Planned — Patch management schedule                        |
| MP (Media Protection)             | Implemented — Encrypted storage, document access logging   |
| PE (Physical/Environmental)       | Inherited — Agency data center controls                    |
| PL (Planning)                     | Implemented — This document                                |
| PS (Personnel Security)           | Inherited — Agency personnel security program              |
| RA (Risk Assessment)              | In Progress — Risk register (Section 7)                    |
| SA (System Acquisition)           | Implemented — Open-source stack, documented procurement    |
| SC (System and Communications)    | Implemented — TLS encryption, network segmentation         |
| SI (System and Information Integrity)| Implemented — Input validation, error handling            |

---

## 10. Support and Maintenance

### 10.1 SLA Definitions

| Severity | Description                                    | Response Time | Resolution Time |
|----------|------------------------------------------------|---------------|-----------------|
| Critical | System unavailable or data loss                | 30 minutes    | 4 hours         |
| High     | Major feature inoperable, no workaround        | 2 hours       | 8 hours         |
| Medium   | Feature degraded with workaround available     | 4 hours       | 3 business days |
| Low      | Cosmetic issue or minor inconvenience          | 1 business day| 10 business days|

### 10.2 Incident Response Procedures

1. **Detection:** Automated monitoring alerts, user-reported issues, or audit log anomalies.
2. **Triage:** Help desk categorizes severity per SLA definitions above.
3. **Escalation:** Critical and High severity incidents escalated to development team and CIO immediately.
4. **Investigation:** Root cause analysis conducted; interim mitigation deployed if available.
5. **Resolution:** Fix deployed via emergency change management process.
6. **Post-Incident Review:** Incident report filed within 5 business days; lessons learned documented.

### 10.3 Change Management Process

All changes to OIG-ITS shall follow the agency's Change Advisory Board (CAB) process:

1. **Change Request Submission:** Requestor submits change request with description, justification, risk assessment, and rollback plan.
2. **CAB Review:** Weekly CAB meeting reviews pending change requests.
3. **Approval:** CAB approves, defers, or rejects changes.
4. **Implementation:** Approved changes deployed during scheduled maintenance windows.
5. **Validation:** Post-deployment validation and stakeholder notification.

### 10.4 Patch Management

| Component       | Patch Cadence      | Responsibility       |
|-----------------|--------------------|-----------------------|
| Operating System| Monthly            | Infrastructure Team   |
| Docker Engine   | Monthly            | Infrastructure Team   |
| PostgreSQL      | Quarterly          | DBA                   |
| Node.js/Next.js | Quarterly          | Development Team      |
| npm Dependencies| Monthly (security) | Development Team      |
| MeiliSearch     | Quarterly          | Infrastructure Team   |
| MinIO           | Quarterly          | Infrastructure Team   |
| Redis           | Quarterly          | Infrastructure Team   |

### 10.5 Backup Schedule

| Component       | Backup Type      | Frequency       | Retention   | Storage Location     |
|-----------------|------------------|-----------------|-------------|----------------------|
| PostgreSQL      | Full dump        | Daily (02:00)   | 30 days     | Network storage      |
| PostgreSQL      | WAL archiving    | Continuous      | 7 days      | Network storage      |
| MinIO (files)   | Incremental sync | Daily (03:00)   | 30 days     | Network storage      |
| MeiliSearch     | Index snapshot    | Daily (04:00)   | 14 days     | Network storage      |
| Redis           | RDB snapshot     | Every 6 hours   | 7 days      | Network storage      |
| Application config| Full backup    | Weekly          | 90 days     | Network storage      |

---

## 11. Milestones and Schedule

### 11.1 Milestone Table

| ID   | Milestone                                  | Start    | End      | Duration | Dependencies   | Go/No-Go |
|------|--------------------------------------------|----------|----------|----------|----------------|-----------|
| M-01 | Infrastructure Provisioning Complete       | Week 1   | Week 2   | 2 weeks  | ATO (Interim)  | Yes       |
| M-02 | Application Deployed to Production         | Week 3   | Week 4   | 2 weeks  | M-01           | Yes       |
| M-03 | Database Migrations Executed               | Week 3   | Week 3   | 1 week   | M-01           | No        |
| M-04 | RBAC Configuration Validated               | Week 4   | Week 4   | 1 week   | M-03           | No        |
| M-05 | Legacy Data Assessment Complete            | Week 5   | Week 5   | 1 week   | M-02           | No        |
| M-06 | Field Mapping Document Approved            | Week 5   | Week 5   | 1 week   | M-05           | Yes       |
| M-07 | Test Migration Successful                  | Week 6   | Week 7   | 2 weeks  | M-06           | Yes       |
| M-08 | Production Data Migration Complete         | Week 8   | Week 8   | 1 week   | M-07           | Yes       |
| M-09 | Integration Testing Complete               | Week 9   | Week 9   | 1 week   | M-08           | No        |
| M-10 | Security Penetration Test Complete         | Week 10  | Week 11  | 2 weeks  | M-09           | Yes       |
| M-11 | Performance Testing Complete               | Week 11  | Week 11  | 1 week   | M-09           | No        |
| M-12 | UAT Sign-Off Obtained                      | Week 11  | Week 12  | 2 weeks  | M-09, M-10     | Yes       |
| M-13 | 508 Accessibility Validation Complete      | Week 12  | Week 12  | 1 week   | M-09           | No        |
| M-14 | ATO Decision Received                      | Week 12  | Week 12  | --       | M-10           | Yes       |
| M-15 | Training Complete (All Roles)              | Week 13  | Week 14  | 2 weeks  | M-12           | No        |
| M-16 | Parallel Operations Complete               | Week 14  | Week 15  | 2 weeks  | M-15           | Yes       |
| M-17 | Go-Live Cutover                            | Week 16  | Week 16  | 1 week   | M-14, M-16     | Yes       |
| M-18 | Stabilization Complete                     | Week 17  | Week 18  | 2 weeks  | M-17           | No        |
| M-19 | Implementation Closeout Report Delivered   | Week 18  | Week 18  | --       | M-18           | --        |

### 11.2 Go/No-Go Decision Points

Each milestone marked with "Yes" in the Go/No-Go column requires a formal decision meeting with the following attendees:

- Project Manager (Chair)
- CIO or designee
- ISSO (for security milestones)
- Business Owner (Assistant IG for Investigations)
- Lead Developer

**Decision Criteria:** All exit criteria for the preceding phase must be met. Any open critical or high-severity defects must have an approved mitigation plan. Formal Go/No-Go decision documented in project record.

---

## 12. Appendices

### Appendix A: Technology Stack Details

| Layer            | Technology                | Version   | Purpose                                |
|------------------|---------------------------|-----------|----------------------------------------|
| Frontend         | React                     | 19.2.4    | User interface rendering               |
| Framework        | Next.js                   | 16.2.1    | Full-stack application framework       |
| ORM              | Prisma                    | 7.6.0     | Database access and schema management  |
| Database         | PostgreSQL                | 16 Alpine | Primary data store                     |
| Search Engine    | MeiliSearch               | 1.6       | Full-text search and indexing          |
| Object Storage   | MinIO                     | Latest    | S3-compatible file storage             |
| Cache/Queue      | Redis                     | 7 Alpine  | Session cache and job queue backend    |
| Job Queue        | BullMQ                    | 5.71.1    | Background job processing              |
| Authentication   | NextAuth.js               | 4.24.13   | Authentication and session management  |
| AI/ML            | Anthropic Claude SDK      | 0.81.0    | AI-powered investigation intelligence  |
| UI Components    | shadcn/ui + Radix         | 4.1.1     | Accessible component library           |
| Charts           | Recharts                  | 3.8.1     | Data visualization                     |
| Rich Text        | TipTap                    | 3.21.0    | Rich text editing for notes/documents  |
| Forms            | React Hook Form + Zod     | 7.72.0    | Form management and validation         |
| State Management | Zustand                   | 5.0.12    | Client-side state management           |
| Styling          | Tailwind CSS              | 4.x       | Utility-first CSS framework            |
| Email            | Nodemailer                | 7.0.13    | Email notification delivery            |
| File Processing  | Archiver                  | 7.0.1     | ZIP archive generation                 |
| Spreadsheets     | SheetJS (xlsx)            | 0.18.5    | Excel import/export                    |
| Containerization | Docker + Docker Compose   | Latest    | Application containerization           |

### Appendix B: Environment Configuration

| Environment | Purpose                        | URL Pattern                        | Database            |
|-------------|--------------------------------|------------------------------------|---------------------|
| Development | Developer workstations         | http://localhost:3000               | oig_its (local)     |
| Staging     | Pre-production testing         | https://oig-its-staging.agency.gov  | oig_its_staging     |
| Production  | Live operations                | https://oig-its.agency.gov          | oig_its_prod        |

**Required Environment Variables:**

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Authentication session encryption key
- `NEXTAUTH_URL` — Application base URL
- `MEILISEARCH_HOST` — MeiliSearch service URL
- `MEILI_MASTER_KEY` — MeiliSearch authentication key
- `S3_ENDPOINT` — MinIO service URL
- `S3_ACCESS_KEY` — MinIO access credentials
- `S3_SECRET_KEY` — MinIO secret credentials
- `S3_BUCKET` — Default storage bucket name
- `REDIS_URL` — Redis connection string
- `SMTP_HOST` — Email server hostname
- `SMTP_PORT` — Email server port
- `SMTP_USER` — Email server credentials
- `SMTP_PASS` — Email server password
- `ANTHROPIC_API_KEY` — Anthropic Claude API key for AI features

### Appendix C: API Endpoint Inventory

OIG-ITS exposes 96 API endpoints organized by functional domain:

| Domain              | Endpoints | Key Routes                                            |
|---------------------|-----------|-------------------------------------------------------|
| Authentication      | 3         | `/api/auth/[...nextauth]`, `/api/auth/reset-password` |
| Cases               | 14        | `/api/cases`, `/api/cases/[caseId]`, `/api/cases/export`, and sub-resources (tasks, documents, notes, violations, financial-results, techniques, referrals, subject-actions, timeline, relationships, evidence, checklist, subjects, subpoenas, field-permissions, report) |
| Subjects            | 2         | `/api/subjects`, `/api/subjects/export`               |
| Documents           | 4         | `/api/cases/[caseId]/documents`, download, approve, from-template |
| Import              | 2         | `/api/import/cases`, `/api/import/documents`          |
| Workflows           | 2         | `/api/workflows`, `/api/workflows/[instanceId]/action`|
| Users               | 1         | `/api/users`                                          |
| Tasks               | 1         | `/api/tasks`                                          |
| Notifications       | 1         | `/api/notifications`                                  |
| Settings            | 1         | `/api/settings`                                       |
| Reports             | 4         | `/api/reports`, run, seed-defaults, run-scheduled, review |
| Analytics           | 2         | `/api/analytics`, `/api/analytics/financial`          |
| Search              | 2         | `/api/search`, `/api/saved-searches`                  |
| Audit Logs          | 1         | `/api/audit-logs`                                     |
| Calendar            | 2         | `/api/calendar`, `/api/calendar/check-reminders`      |
| Inventory           | 1         | `/api/inventory`                                      |
| Time Tracking       | 2         | `/api/time-entries`, `/api/timesheets`                 |
| Training            | 6         | `/api/training/courses`, records, assignments, analytics, evaluations, export, check-expirations |
| Inquiries           | 3         | `/api/inquiries`, `/api/inquiries/[id]`, convert      |
| Admin               | 5         | `/api/admin/retention`, filing-rules, routing-rules, exceptions, field-labels, data-dictionary |
| AI Intelligence     | 17        | `/api/ai/risk-score`, predictions, similar-cases, duplicate-subjects, classify-document, anomalies, network, clusters, complaint-dedup, recommend-investigator, escalations, evidence-strength, timeline-anomalies, closure-readiness, workload, financial-patterns, subject-risk, case-narrative, natural-search, analyze-document, interview-questions, generate-report |
| Public              | 2         | `/api/public/whistleblower`, `/api/public/hotline`    |
| Delegations         | 1         | `/api/delegations`                                    |
| Document Templates  | 1         | `/api/document-templates`                             |
| Reference Data      | 1         | `/api/reference-data`                                 |
| User Preferences    | 2         | `/api/user-preferences`, shortcuts                    |
| Downloads           | 1         | `/api/download-case-docs/[caseId]`                    |

### Appendix D: Database Schema Summary

OIG-ITS utilizes a PostgreSQL 16 database with 53 models managed by Prisma ORM 7.6. The schema encompasses 20 database migrations.

**Core Enumerations (12):**

| Enum               | Values                                                              |
|--------------------|---------------------------------------------------------------------|
| UserRole           | ADMIN, INVESTIGATOR, SUPERVISOR, ANALYST, AUDITOR, READONLY         |
| CaseStatus         | INTAKE, OPEN, ACTIVE, UNDER_REVIEW, PENDING_ACTION, CLOSED, ARCHIVED|
| CaseType           | FRAUD, WASTE, ABUSE, MISCONDUCT, WHISTLEBLOWER, COMPLIANCE, OUTREACH, BRIEFING, OTHER |
| Priority           | LOW, MEDIUM, HIGH, CRITICAL                                        |
| TaskStatus         | PENDING, IN_PROGRESS, COMPLETED, CANCELLED, BLOCKED                |
| DocumentStatus     | DRAFT, UPLOADED, REVIEWED, APPROVED, REDACTED, ARCHIVED            |
| EvidenceStatus     | COLLECTED, IN_REVIEW, VERIFIED, DISPUTED, ARCHIVED                 |
| EvidenceType       | DOCUMENT, PHOTO, VIDEO, AUDIO, DIGITAL, PHYSICAL, TESTIMONY, OTHER |
| WorkflowType       | CASE_INTAKE, INVESTIGATION, REVIEW, CLOSURE, CUSTOM                |
| WorkflowStatus     | DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED                        |
| SubjectType        | INDIVIDUAL, ORGANIZATION, DEPARTMENT, VENDOR, OTHER                 |
| SubjectRole        | COMPLAINANT, RESPONDENT, WITNESS, SUBJECT_OF_INTEREST, INFORMANT, OTHER |
| NotificationType   | CASE_ASSIGNED, CASE_UPDATED, TASK_ASSIGNED, TASK_DUE, DOCUMENT_UPLOADED, EVIDENCE_ADDED, WORKFLOW_ACTION, SYSTEM_ALERT, ANNOUNCEMENT |
| AuditAction        | CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, ASSIGN, STATUS_CHANGE, ACCESS_DENIED |

**Core Entity Models (53):**

User, Session, Case, CaseSubject, Subject, CaseRelationship, CaseAssignment, CaseStatusHistory, CaseNote, Document, DocumentAccessLog, DocumentComment, EvidenceItem, ChainOfCustody, EvidenceFile, Task, WorkflowDefinition, WorkflowInstance, WorkflowStepAction, Notification, NotificationPreference, AuditLog, ReportDefinition, ReportRun, ReportSchedule, SavedSearch, SystemSetting, ReferenceData, Organization, Announcement, FeatureFlag, Violation, FinancialResult, InvestigativeTechnique, Referral, SubjectAction, InventoryItem, CalendarReminder, PasswordResetToken, TimeEntry, Timesheet, TrainingCourse, TrainingRecord, TrainingAssignment, PreliminaryInquiry, CloseChecklist, Delegation, DocumentAttachment, ReportReview, FieldLabel, SubpoenaPackage, CourseEvaluation, UserPreference.

**Key Relationships:**

- Cases are linked to Users (creator, assignees), Subjects (via CaseSubject junction), and Organizations.
- Documents and EvidenceItems are associated with Cases and tracked via chain-of-custody records.
- Workflows are defined as templates (WorkflowDefinition) and instantiated per case (WorkflowInstance).
- Subjects support hierarchical relationships (parent-child) for organizational mapping.
- Audit logs capture all system actions with user, action type, and timestamp for FISMA compliance.

---

*End of Document*

*This document is a controlled deliverable under SOW requirement DM4. Distribution is limited to authorized OIG personnel and contractor staff with a valid need-to-know. Questions regarding this document should be directed to the OIG Information Technology Division.*
