# OIG-ITS Demo Auto-Launcher
# ================================
# 1. Start screen recording (Windows: Win+G > Record, or use OBS/Loom)
# 2. Run this script: .\demo\demo-script.ps1
# 3. Follow the voiceover prompts in the console
# 4. Stop recording when done (~8 minutes)

$base = "http://localhost:3000"

function Show-Step($time, $title, $narration, $url) {
    Write-Host ""
    Write-Host "[$time] $title" -ForegroundColor Cyan
    Write-Host "  NARRATION: $narration" -ForegroundColor Yellow
    if ($url) {
        Write-Host "  URL: $url" -ForegroundColor Green
        Start-Process $url
    }
    Write-Host "  Press ENTER when ready for next step..." -ForegroundColor Gray
    Read-Host
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " OIG-ITS DEMO RECORDING GUIDE" -ForegroundColor Cyan
Write-Host " Total Time: ~7-8 minutes" -ForegroundColor Cyan
Write-Host " Start your screen recorder NOW" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press ENTER to begin..." -ForegroundColor Yellow
Read-Host

# ─── SECTION 1: Login (0:00 - 0:45) ───
Show-Step "0:00" "SECTION 1: LOGIN PAGE" `
    "Welcome to the OPM Office of Inspector General Investigative Tracking System. This system manages criminal, civil, and administrative investigations for the OPM OIG. Let's start by logging in." `
    "$base/login"

Show-Step "0:20" "LOGIN" `
    "The login page shows the OPM OIG seal and FedRAMP authorization badge. We'll log in as Samuel Johnson, a Senior Investigator. The system supports six roles: Admin, Supervisor, Investigator, Analyst, Auditor, and Read-Only. Security features include 8-hour session timeout and account lockout after 5 failed attempts." `
    $null

# ─── SECTION 2: Dashboard (0:45 - 1:30) ───
Show-Step "0:45" "SECTION 2: DASHBOARD" `
    "After login, we see the personalized dashboard. The top row shows key metrics: total cases, active investigations, critical cases, and closed cases. Below that, overdue tasks, upcoming deadlines, and unread notifications. The dashboard is customizable — click the gear icon to show, hide, or reorder widgets." `
    "$base/dashboard"

Show-Step "1:15" "DASHBOARD DETAILS" `
    "We can see the cases-by-status breakdown, recent cases with priority and status badges, upcoming deadlines, and the latest notifications. Everything is filtered by role — investigators see only their assigned cases." `
    $null

# ─── SECTION 3: Case Management (1:30 - 3:00) ───
Show-Step "1:30" "SECTION 3: CASE LIST" `
    "The Cases page shows all assigned cases in a sortable, filterable data table. We can filter by status, type, and priority. The search bar filters by case number or title. Samuel Johnson has 12 active cases across fraud, waste, abuse, and whistleblower investigations." `
    "$base/dashboard/cases"

Show-Step "2:00" "CREATE NEW CASE" `
    "Let's create a new case. Click New Case to open the 3-step wizard. Step 1: enter the title and description. Step 2: classify the case type, set priority and due date. Step 3: review and submit. The system auto-generates the case number in OIG-2026 format and assigns you as lead investigator." `
    "$base/dashboard/cases/new"

Show-Step "2:30" "CASE DETAIL VIEW" `
    "Opening a case shows 10 tabs: Overview, Documents, Evidence, Tasks, Subjects, Timeline, Violations, Financial, Techniques, and Referrals. The overview shows the description, document and evidence counts, recent notes, case details like type and opened date, and the assigned team. Notice the jurisdiction, complaint source, and investigation approach fields." `
    $null

Show-Step "2:50" "CASE DETAIL - CLICK A CASE" `
    "Click on any case from the list to see its detail page with all 10 tabs." `
    "$base/dashboard/cases"

# ─── SECTION 4: Evidence & Documents (3:00 - 3:45) ───
Show-Step "3:00" "SECTION 4: EVIDENCE TAB" `
    "The Evidence tab shows all evidence items with type badges, status, and exhibit numbers. Each item is auto-labeled as EX-001, EX-002. The chain of custody is tracked — every transfer is recorded with from-user, to-user, action, and timestamp. This is immutable and cannot be modified." `
    $null

Show-Step "3:20" "DOCUMENTS TAB" `
    "The Documents tab supports uploading 30 file formats including PDF, Word, Excel, PowerPoint, images, audio, and video. Documents have version control — upload a new version and the system tracks v1, v2, v3. Supervisory approval can be required for sensitive documents. All downloads are logged in the access audit trail." `
    $null

# ─── SECTION 5: Tasks & Workflows (3:45 - 4:30) ───
Show-Step "3:45" "SECTION 5: TASKS" `
    "The Tasks page offers two views: a Kanban board with columns for Pending, In Progress, Blocked, and Completed; and a table view with sorting and filtering. Overdue tasks show red badges with the number of days overdue. Tasks can be delegated to other team members with automatic notifications." `
    "$base/dashboard/tasks"

Show-Step "4:10" "APPROVALS & WORKFLOWS" `
    "The Approvals page shows workflow steps awaiting your action. The system includes five workflow types: Case Intake Review, Investigation Closure, Evidence Review, Document Approval, and Whistleblower Protection Assessment. Each workflow has multi-step approval chains. Supervisors and admins can skip or revert steps." `
    "$base/dashboard/approvals"

# ─── SECTION 6: Hotline & Whistleblower (4:30 - 5:15) ───
Show-Step "4:30" "SECTION 6: PUBLIC HOTLINE" `
    "The system includes public-facing intake forms that require no login. The Hotline page lets anyone submit a complaint — anonymous or with contact information. Each submission gets an inquiry number. The Whistleblower page includes additional legal protections under the Whistleblower Protection Act." `
    "$base/hotline"

Show-Step "4:50" "WHISTLEBLOWER PAGE" `
    "The whistleblower form prominently displays legal protections. Submissions are automatically set to high priority and follow a separate workflow with identity protection measures." `
    "$base/whistleblower"

Show-Step "5:00" "INQUIRY MANAGEMENT" `
    "Staff manage inquiries from the Inquiries page. Each inquiry can be assigned, reviewed, and converted directly into a full investigation case. The Convert to Case button creates a new case with all the inquiry data pre-populated." `
    "$base/dashboard/inquiries"

# ─── SECTION 7: Search (5:15 - 5:45) ───
Show-Step "5:15" "SECTION 7: SEARCH" `
    "Press Control-K anywhere to open the quick search command palette. Results appear instantly across cases, evidence, tasks, and documents. The full search page offers tabbed results, faceted filtering, date range filters, and an Advanced Search panel with per-field criteria. Searches can be saved for reuse." `
    "$base/dashboard/search"

# ─── SECTION 8: Reports & Analytics (5:45 - 6:30) ───
Show-Step "5:45" "SECTION 8: ANALYTICS" `
    "The Analytics dashboard shows interactive charts: cases by status and type, monthly case trends, task completion breakdown, investigator workload, and financial summary. Key metrics include closure rate, average days to close, and overdue tasks. The Financial dashboard shows total recoveries, fines, restitution, savings, and return on investment." `
    "$base/dashboard/analytics"

Show-Step "6:00" "FINANCIAL DASHBOARD" `
    "The Financial dashboard tracks monetary results across all cases — total recoveries, fines, restitution, and cost savings. It calculates investigative costs from time entries and ROI. Top cases and subjects are ranked by financial impact with monthly trend analysis." `
    "$base/dashboard/financial"

Show-Step "6:15" "REPORTS" `
    "Seven standard report templates are available including the Semiannual Report to Congress. Reports can be exported as CSV, Excel, or printable PDF. The ad-hoc Report Builder lets users create custom reports without any programming — select the entity type, pick columns, add filters, preview, and save for reuse." `
    "$base/dashboard/reports"

# ─── SECTION 9: Training & Time (6:30 - 7:00) ───
Show-Step "6:30" "SECTION 9: TRAINING" `
    "The Training module tracks courses, certifications, and compliance. The My Training tab shows completion status, expiration warnings, and scores. Required courses can be assigned by role or group. Course evaluations capture feedback, and costs are tracked per course and per user." `
    "$base/dashboard/training"

Show-Step "6:45" "TIMESHEETS" `
    "Time and Labor tracking supports 9 activity types including case work, overtime, and undercover operations. The system calculates Law Enforcement Availability Pay under Title 5 and tracks substantial hours requirements. Timesheets go through a submit-and-approve workflow." `
    "$base/dashboard/timesheets"

# ─── SECTION 10: Admin & Audit (7:00 - 7:45) ───
Show-Step "7:00" "SECTION 10: AUDIT LOG" `
    "The Audit Log captures every action in the system — over 10,000 entries with timestamps, user names, action types, entity types, and IP addresses. Field-level changes show old and new values. The log can be filtered by date range, action, and entity type, and exported as CSV." `
    "$base/dashboard/audit-log"

Show-Step "7:15" "USER MANAGEMENT" `
    "Admins manage user accounts from the Users page — create new users, change roles, disable accounts. The system supports six roles with granular permissions. Field-level access control restricts which fields each role can edit based on the case status." `
    "$base/dashboard/users"

Show-Step "7:30" "SETTINGS & INVENTORY" `
    "System Settings manage reference data, routing rules, and filing rules. The Inventory module tracks evidence items, technical equipment, and law enforcement property by agent and region. The Calendar provides monthly and list views with recurring reminders." `
    "$base/dashboard/settings"

# ─── CLOSING ───
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " [7:45] CLOSING" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NARRATION:" -ForegroundColor Yellow
Write-Host "  That concludes our demo of the OIG Investigative Tracking System." -ForegroundColor Yellow
Write-Host "  The system covers case management, evidence chain of custody," -ForegroundColor Yellow
Write-Host "  document management, workflow approvals, public intake portals," -ForegroundColor Yellow
Write-Host "  comprehensive reporting, training management, time tracking," -ForegroundColor Yellow
Write-Host "  and full audit capabilities. All backed by role-based access" -ForegroundColor Yellow
Write-Host "  control with 6 roles and 35 permissions. Thank you." -ForegroundColor Yellow
Write-Host ""
Write-Host "Stop your screen recorder now." -ForegroundColor Red
Write-Host ""
