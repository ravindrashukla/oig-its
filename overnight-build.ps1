# OIG-ITS Overnight Builder
$ErrorActionPreference = "Continue"
Set-Location "$HOME\oig-its"

function CC($prompt, $label) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $label" -ForegroundColor Yellow
    claude -p $prompt 2>&1 | Tee-Object -FilePath "$HOME\oig-its\build-log.txt" -Append
    git add -A 2>$null; git commit -m $label -q 2>$null
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] DONE: $label" -ForegroundColor Green
}

Write-Host "=== OIG-ITS OVERNIGHT BUILD STARTED ===" -ForegroundColor Cyan
"BUILD STARTED $(Get-Date)" | Out-File "$HOME\oig-its\build-log.txt" -Encoding ASCII

CC 'Create docker-compose.yml with services: postgres (postgres:16-alpine port 5432 user=oig pass=oig_dev_2026 db=oig_its volume pgdata), redis (redis:7-alpine port 6379), minio (minio/minio ports 9000+9001 command server /data --console-address :9001 user=oig_minio pass=oig_minio_secret_2026 volume minio_data), meilisearch (getmeili/meilisearch:v1.6 port 7700 key=oig_search_master_key_2026 volume meili_data), mailhog (mailhog/mailhog ports 8025+1025). Named volumes. Create .env.local with DATABASE_URL=postgresql://oig:oig_dev_2026@localhost:5432/oig_its NEXTAUTH_SECRET=oig-its-dev-secret-2026 NEXTAUTH_URL=http://localhost:3000 REDIS_URL=redis://localhost:6379 MINIO_ENDPOINT=localhost MINIO_PORT=9000 MINIO_ACCESS_KEY=oig_minio MINIO_SECRET_KEY=oig_minio_secret_2026 MINIO_BUCKET=oig-documents MINIO_USE_SSL=false MEILISEARCH_URL=http://localhost:7700 MEILISEARCH_KEY=oig_search_master_key_2026 SMTP_HOST=localhost SMTP_PORT=1025 SMTP_FROM=noreply@oig-its.opm.gov. Run docker compose up -d. Do not ask questions.' 'S1-Docker'

Start-Sleep -Seconds 12

CC 'Read CLAUDE.md. Create complete Prisma schema at prisma/schema.prisma with enums UserRole CaseStatus CaseType Priority TaskStatus DocumentStatus EvidenceStatus EvidenceType WorkflowType WorkflowStatus SubjectType SubjectRole NotificationType AuditAction and 31 tables User Session Case CaseSubject Subject CaseRelationship CaseAssignment CaseStatusHistory CaseNote Document DocumentAccessLog DocumentComment EvidenceItem ChainOfCustody EvidenceFile Task WorkflowDefinition WorkflowInstance WorkflowStepAction Notification NotificationPreference AuditLog ReportDefinition ReportRun ReportSchedule SavedSearch SystemSetting ReferenceData Organization Announcement FeatureFlag with proper relations indexes. Run npx prisma migrate dev --name init. Create src/types/index.ts. Do not ask questions.' 'S1-Prisma-Schema'

CC 'Read CLAUDE.md. Create src/lib/prisma.ts Prisma singleton. Create src/lib/auth.ts NextAuth v4 CredentialsProvider bcrypt verify JWT strategy session includes userId role displayName badgeNumber signIn page /login. Create src/lib/rbac.ts permissions map with checkPermission and getCaseAccessFilter. Create src/lib/audit.ts logAudit never throws. Create src/app/api/auth/[...nextauth]/route.ts. Create src/components/providers/AuthProvider.tsx and QueryProvider.tsx. Update src/app/layout.tsx with both providers. Do not ask questions.' 'S2-Auth-RBAC'

CC 'Read CLAUDE.md. Build src/app/(auth)/login/page.tsx split-screen login. Left dark navy gradient shield icon FedRAMP badge title Investigative Tracking System subtitle OPM OIG stats. Right white Sign in form email default sa.johnson@opm.gov password. shadcn. signIn credentials callbackUrl /dashboard. Error toast sonner. Create src/app/(auth)/layout.tsx. Do not ask questions.' 'S2-Login-Page'

CC 'Read CLAUDE.md. Create prisma/seed.ts 25 users bcrypt Demo2026! 15 INVESTIGATOR 4 SENIOR_INVESTIGATOR 3 SUPERVISOR 1 IG_EXECUTIVE 2 SYSTEM_ADMIN with badge numbers divisions. Add prisma seed to package.json. Run npx prisma db seed. Do not ask questions.' 'S2-Seed-Users'

CC 'Read CLAUDE.md. Build src/app/(dashboard)/layout.tsx check session redirect /login. Create Sidebar.tsx 232px nav sections INVESTIGATION MANAGEMENT REPORTS SYSTEM. Create Header.tsx search bar notification bell user pill. Create src/stores/uiStore.ts. Do not ask questions.' 'S3-Layout'

CC 'Read CLAUDE.md. Build src/app/(dashboard)/dashboard/page.tsx with metrics cases deadlines notifications. Create GET /api/cases/route.ts with pagination filtering RBAC. Create src/types/case.ts src/hooks/useCases.ts. Do not ask questions.' 'S3-Dashboard'

CC 'Read CLAUDE.md. Expand seed.ts add 50 cases faker seed 42 mixed types statuses priorities. SA Johnson 12 active. OIG-YYYY-NNN. CaseStatusHistory CaseAssignment. Run npx prisma migrate reset --force then seed. Do not ask questions.' 'S3-Seed-Cases'

CC 'Read CLAUDE.md. Create DataTable.tsx generic with pagination sorting checkboxes skeletons. CaseStatusBadge.tsx PriorityBadge.tsx. Do not ask questions.' 'S4-DataTable'

CC 'Read CLAUDE.md. Build cases/page.tsx with filters DataTable pagination. Do not ask questions.' 'S4-Case-List'

CC 'Read CLAUDE.md. Create GET /api/cases/[id]/route.ts. Build cases/[id]/page.tsx case header tabs overview synopsis timeline subjects dates. Create useCase.ts CaseTimeline.tsx. Do not ask questions.' 'S4-Case-Detail'

CC 'Read CLAUDE.md. Build cases/new/page.tsx multi-step form. POST /api/cases with Zod auto number transaction. src/lib/validators/case.ts. Do not ask questions.' 'S4-Case-Create'

CC 'Read CLAUDE.md. Create src/lib/minio.ts. Document API routes upload list download. useDocuments.ts. DocumentUploader DocumentCard DocumentBrowser components. cases/[id]/documents/page.tsx. Do not ask questions.' 'S5-Documents'

CC 'Read CLAUDE.md. Evidence module API components hooks page. Seed evidence with custody chain. Re-seed. Do not ask questions.' 'S6-Evidence'

CC 'Read CLAUDE.md. Task module API TaskBoard Kanban TaskList TaskForm useTasks. Cases tasks page and global tasks page. Seed tasks. Re-seed. Do not ask questions.' 'S7-Tasks'

CC 'Read CLAUDE.md. Workflow engine notifications. sendNotification with Nodemailer. Workflow API initiate pending action. Notification API. useWorkflows useNotifications. /approvals page. NotificationBell Header Popover. /notifications page. Seed workflows. Re-seed. Do not ask questions.' 'S8-Workflows'

CC 'Read CLAUDE.md. Search with MeiliSearch. search-sync. API search suggest. useSearch. CommandPalette Cmd+K. /search page facets. Update seed sync. Re-seed. Do not ask questions.' 'S9-Search'

CC 'Read CLAUDE.md. Analytics API dashboard cases-by-status monetary-results investigator-load trends. useAnalytics. Executive dashboard KPI Recharts charts. Seed monetaryResults. Re-seed. Do not ask questions.' 'S10-Executive'

CC 'Read CLAUDE.md. Add missing logAudit calls. Audit log API and pages. Admin users settings reference-data pages. Seed defaults. Re-seed. Do not ask questions.' 'S11-Audit-Admin'

CC 'Read CLAUDE.md. Subjects page. Case subjects tab. Timeline tab. Wire dashboard real data. not-found loading error pages. All tabs working. Do not ask questions.' 'S12-Remaining'

CC 'Read CLAUDE.md. Expand seed 200 cases 150 subjects 800 documents evidence tasks notifications 10000 audit logs workflows. Sync MeiliSearch. Reset and re-seed. Do not ask questions.' 'S13-Full-Data'

CC 'Read CLAUDE.md. Fix all integration issues TypeScript errors missing imports. npm run build fix all errors. Do not ask questions.' 'S13-Fix'

CC 'Read CLAUDE.md. Polish empty states breadcrumbs quick actions edge cases print CSS page titles responsive. npm run build zero errors. Do not ask questions.' 'S14-Polish'

Write-Host "=== BUILD COMPLETE ===" -ForegroundColor Green
Write-Host "Run: npm run dev" -ForegroundColor Yellow
Write-Host "Login: sa.johnson@opm.gov / Demo2026!" -ForegroundColor Yellow
"BUILD COMPLETE $(Get-Date)" | Out-File "$HOME\oig-its\build-log.txt" -Append
