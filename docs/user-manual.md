# OIG Investigation Tracking System (OIG-ITS) User Manual

Version 1.0 | Last Updated: March 31, 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Case Management](#3-case-management)
4. [Subjects](#4-subjects)
5. [Evidence](#5-evidence)
6. [Documents](#6-documents)
7. [Tasks](#7-tasks)
8. [Workflows and Approvals](#8-workflows-and-approvals)
9. [Hotline and Whistleblower (Inquiries)](#9-hotline-and-whistleblower-inquiries)
10. [Search](#10-search)
11. [Reports and Analytics](#11-reports-and-analytics)
12. [Training](#12-training)
13. [Time and Labor](#13-time-and-labor)
14. [AI Insights](#14-ai-insights)
15. [Administration](#15-administration)
16. [Appendix](#16-appendix)

---

## 1. Getting Started

### 1.1 System Requirements

OIG-ITS is a web-based application. You do not need to install any software or browser plugins. The following requirements apply:

- A modern web browser: Google Chrome (version 100 or later), Mozilla Firefox (version 100 or later), Microsoft Edge (version 100 or later), or Apple Safari (version 16 or later).
- A stable internet connection.
- Screen resolution of 1280 x 720 pixels or higher is recommended. The application is responsive and will adapt to tablet-sized screens as well.
- JavaScript must be enabled in your browser.

### 1.2 Logging In

1. Open your web browser and navigate to the OIG-ITS URL provided by your administrator.
2. On the login page, enter your credentials:
   - **Email address** -- use your official government email address in the format `firstname.lastname@oig.gov`.
   - **Password** -- enter the password assigned to you or the one you created during your first login.
3. Select the **Sign In** button.

### 1.3 First Login and Password Reset

1. When you log in for the first time, the system may prompt you to change your temporary password.
2. Create a new password that meets the following requirements:
   - At least 12 characters in length.
   - Contains at least one uppercase letter, one lowercase letter, one number, and one special character.
3. If you forget your password, select the **Forgot Password** link on the login page. Enter your email address and follow the instructions sent to your inbox.

### 1.4 Session Timeout

For security purposes, your session will automatically expire after **8 hours** of continuous use. If your session expires, you will be redirected to the login page. Save your work regularly to avoid losing unsaved changes.

---

## 2. Dashboard

The Dashboard is the first screen you see after logging in. It provides an at-a-glance overview of your investigative workload.

### 2.1 Metric Cards

At the top of the Dashboard, you will see a row of summary cards displaying key performance indicators:

- **Open Cases** -- the total number of cases currently in an active state.
- **High Priority** -- cases flagged as High or Critical priority requiring immediate attention.
- **Closed This Month** -- cases resolved and closed during the current calendar month.
- **Pending Tasks** -- tasks assigned to you or your team that are not yet completed.

Each card shows a count and may include a trend indicator (up or down arrow) comparing the current period to the previous one.

### 2.2 Widgets

Below the metric cards, the Dashboard displays several information widgets:

- **Cases by Status** -- a bar chart breaking down all cases by their current status (Intake, Open, Active, Under Review, Pending Action, Closed, Archived).
- **Recent Cases** -- a list of the most recently created or updated cases, with links to open each case directly.
- **Upcoming Deadlines** -- tasks and case milestones with approaching due dates, sorted by urgency.
- **Recent Notifications** -- the latest system notifications such as new case assignments, approval requests, and status changes.
- **Cases by Type** -- a breakdown of cases by investigation type (Fraud, Waste, Abuse, Misconduct, and others).

### 2.3 Customization

You can customize which widgets appear on your Dashboard and their order:

1. Select the **gear icon** in the upper-right area of the Dashboard.
2. A configuration panel will appear showing all available widgets with checkboxes.
3. Check or uncheck widgets to show or hide them.
4. Use the up and down arrows to reorder widgets.
5. Select **Save** to apply your changes. Your layout preferences are saved to your browser and will persist between sessions.
6. To restore the default layout, select the **Reset to Default** option in the configuration panel.

---

## 3. Case Management

Cases are the central records in OIG-ITS. Each case represents an investigation, inquiry, or compliance matter.

### 3.1 Browsing Cases

1. Select **Cases** from the left sidebar under the Investigation section.
2. The case list displays all cases you have permission to view, organized in a sortable table.
3. **Filtering**: Use the filter bar at the top to narrow results:
   - **Search** -- type a keyword to search by case number or title.
   - **Status** -- filter by case status (Intake, Open, Active, Under Review, Pending Action, Closed, Archived).
   - **Type** -- filter by case type (Fraud, Waste, Abuse, Misconduct, Whistleblower, Compliance, Outreach, Briefing, Other).
   - **Priority** -- filter by priority level (Low, Medium, High, Critical).
   - Select the **filter icon** to expand or collapse the advanced filter panel.
4. **Sorting**: Select any column header to sort by that field. Select again to reverse the sort order.
5. **Pagination**: Use the page controls at the bottom to navigate through large result sets.

### 3.2 Creating a New Case

To create a new investigation case:

1. From the Cases page, select the **New Case** button in the upper-right corner.
2. The system presents a **3-step wizard**:

   **Step 1 -- Details**:
   - Enter the **Title** of the investigation (required).
   - Provide a **Description** summarizing the matter.
   - Set a **Due Date** if applicable.

   **Step 2 -- Classification**:
   - Select the **Case Type** from the dropdown (Fraud, Waste, Abuse, Misconduct, Whistleblower, Compliance, Outreach, Briefing, or Other).
   - Set the **Priority** level (Low, Medium, High, or Critical). The default is Medium.

   **Step 3 -- Review**:
   - Review all entered information for accuracy.
   - Select **Create Case** to submit. The system will generate a unique case number automatically.

3. After creation, you will be redirected to the new case's detail page.

### 3.3 Case Detail View

Selecting a case from the list opens the Case Detail view, which is organized into **10 tabs**:

1. **Overview** -- displays the case summary including case number, status, priority, description, creation date, assigned investigators, and key dates.
2. **Documents** -- lists all documents attached to the case with options to upload, download, review, and approve.
3. **Evidence** -- shows all evidence items linked to the case with chain-of-custody tracking.
4. **Tasks** -- displays tasks assigned for this case, their status, priority, assignees, and due dates.
5. **Subjects** -- lists individuals and organizations involved in the case, with their roles and relationships.
6. **Violations** -- records alleged violations, statutes, and regulatory references associated with the case.
7. **Financial** -- tracks monetary amounts including estimated losses, recoveries, fines, and cost savings.
8. **Techniques** -- documents investigative techniques and methods employed during the investigation.
9. **Referrals** -- manages referrals to other agencies, departments, or law enforcement organizations.
10. **Timeline** -- provides a chronological view of all activities, status changes, and milestones for the case.

### 3.4 Case Status Progression

Every case follows a defined status lifecycle:

1. **Intake** -- the case has been received and is awaiting initial review.
2. **Open** -- the case has been accepted and assigned for investigation.
3. **Active** -- investigative work is currently underway.
4. **Under Review** -- the investigation is complete and the case is being reviewed by a supervisor.
5. **Pending Action** -- the case requires an external action or decision before it can proceed.
6. **Closed** -- the investigation has been completed and all required actions are finalized.
7. **Archived** -- the case has been moved to long-term storage after the retention period.

Status changes are recorded in the case timeline and audit log.

### 3.5 Case Locking and Unlocking

When a case is under active editing by one user, it may be locked to prevent conflicting changes. Locked cases display a lock icon and the name of the user who holds the lock. If you need to edit a locked case, contact the user who holds the lock or ask your supervisor to unlock it. Cases are automatically unlocked when the editing user navigates away or their session expires.

### 3.6 Draft Cases

Cases in Intake status that have not yet been formally opened are considered drafts. Draft cases can be freely edited, deleted, or merged with other intake records. Once a case is moved to Open status, it becomes an official record and deletion is no longer permitted.

### 3.7 Close Checklist

Before a case can be moved to Closed status, the system requires that a close checklist be completed. The checklist verifies that:

- All tasks are completed or cancelled.
- All evidence items have a final disposition.
- Required supervisory review has been performed.
- All documents have been approved or archived.
- Financial figures are finalized.
- The closing summary has been written.

---

## 4. Subjects

Subjects are the individuals and organizations connected to an investigation.

### 4.1 Creating Subjects

Subjects can be added from a case's **Subjects** tab. The system supports 5 subject types:

1. **Individual** -- a natural person.
2. **Organization** -- a company, agency, or other entity.
3. **Government Employee** -- a current or former government worker.
4. **Contractor** -- a contractor or subcontractor personnel.
5. **Other** -- any subject that does not fit the above categories.

To create a subject:

1. Navigate to the case's Subjects tab.
2. Select **Add Subject**.
3. Fill in the required fields (name, type).
4. Provide optional details such as contact information, address, and identifiers.
5. Select **Save**.

### 4.2 Linking Subjects to Cases

Each subject linked to a case is assigned one of 6 possible roles:

1. **Complainant** -- the person or entity that reported the matter.
2. **Respondent** -- the person or entity that is the target of the investigation.
3. **Witness** -- a person who has relevant information or testimony.
4. **Victim** -- a person or entity harmed by the alleged conduct.
5. **Subject of Interest** -- a person connected to the investigation but not a primary target.
6. **Other** -- any other relevant role.

### 4.3 Role Changes

To change a subject's role within a case:

1. Open the case's Subjects tab.
2. Locate the subject in the list.
3. Select the **Edit** button next to their entry.
4. Change the Role dropdown to the new role.
5. Select **Save**. The change is logged in the audit trail.

### 4.4 Subject Hierarchies

Subjects can be linked to one another to represent organizational structures or personal relationships. For example, a contractor subject can be linked as a subsidiary of an organization subject.

### 4.5 Duplicate Detection

The AI Insights module automatically scans for potential duplicate subjects across the system by comparing names, identifiers, and contact information. When potential duplicates are found, they appear on the AI Insights page under the Duplicate Subjects section, along with a confidence score and the reasons for the match.

---

## 5. Evidence

Evidence items represent physical, digital, and testimonial evidence collected during an investigation.

### 5.1 Creating Evidence Items

Evidence is managed from the **Evidence** tab within a case, or from the global Evidence page in the sidebar.

To add an evidence item:

1. Open the relevant case and select the **Evidence** tab.
2. Select **Add Evidence**.
3. Choose the **Evidence Type** from the 8 available types:
   - Document
   - Photo
   - Video
   - Audio
   - Digital (electronic files, data extracts)
   - Physical (tangible objects)
   - Testimony (interview recordings, depositions)
   - Other
4. Provide a title and description.
5. Record the collection details: who collected it, when, and where.
6. Select **Save**.

### 5.2 Chain of Custody

OIG-ITS maintains a complete chain-of-custody record for every evidence item. Each time evidence changes hands or location, a new custody entry is logged with:

- The name of the person transferring and receiving the item.
- The date and time of the transfer.
- The reason for the transfer.
- The storage location.

This chain is immutable; entries cannot be edited or deleted once recorded.

### 5.3 Exhibit Numbering

Each evidence item is assigned a unique exhibit number within its case, following the format established by your organization. The system auto-generates exhibit numbers sequentially, but they can be overridden by authorized users when following a specific numbering convention.

### 5.4 Evidence Status

Evidence items progress through the following statuses:

- **Collected** -- the item has been obtained.
- **In Review** -- the item is being examined or analyzed.
- **Verified** -- the item has been authenticated and validated.
- **Disputed** -- the authenticity or relevance of the item is being challenged.
- **Archived** -- the item has been placed in long-term storage.

---

## 6. Documents

Documents are files attached to cases, such as reports, memos, correspondence, and supporting materials.

### 6.1 Uploading Documents

1. Open a case and select the **Documents** tab.
2. Select **Upload Document**.
3. Choose a file from your computer. The system supports **30 common file formats** including PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), images (JPG, PNG, TIFF, BMP), plain text (.txt), CSV, HTML, XML, and email formats (.eml, .msg).
4. The maximum file size is **50 MB** per upload.
5. Add a title, description, and any relevant tags.
6. Select **Upload**. The document will be scanned and indexed automatically.

### 6.2 Version Control

When you upload a revised version of an existing document:

1. Open the document's detail page.
2. Select **Upload New Version**.
3. The system retains all previous versions with timestamps and the name of the user who uploaded each one.
4. You can view or download any previous version at any time.

### 6.3 Document Status and Supervisory Approval

Documents progress through the following statuses:

- **Draft** -- the document is being prepared and is not yet finalized.
- **Uploaded** -- the document has been uploaded but not yet reviewed.
- **Reviewed** -- a reviewer has examined the document.
- **Approved** -- a supervisor has approved the document for official use.
- **Redacted** -- the document has had sensitive information removed.
- **Archived** -- the document has been moved to long-term storage.

To submit a document for supervisory approval, change its status to Reviewed and it will appear in your supervisor's Approvals queue.

### 6.4 Templates

OIG-ITS provides **19 pre-built document templates** covering common investigative documents such as:

- Investigative memoranda
- Subpoena requests
- Interview summaries
- Case closure reports
- Referral letters
- Evidence receipts

To use a template, select **New from Template** on the Documents tab and choose the appropriate template.

### 6.5 ZIP Download

To download multiple documents at once:

1. Select the checkboxes next to each document you want to download.
2. Select **Download as ZIP**.
3. The system will package the selected documents into a single ZIP file for download.

---

## 7. Tasks

Tasks track the individual work items and action steps within an investigation.

### 7.1 Viewing Tasks

Select **Tasks** from the left sidebar to view all tasks across all cases. The Tasks page offers two viewing modes:

- **Table View** (default) -- a sortable, filterable data table showing task title, case number, status, priority, assignee, and due date. Select the **list icon** to switch to this view.
- **Kanban Board View** -- a drag-and-drop board organized into columns by status (Pending, In Progress, Completed, Cancelled, Blocked). Select the **grid icon** to switch to this view. Drag task cards between columns to update their status.

### 7.2 Creating and Assigning Tasks

1. Select the **New Task** button, or navigate to a case's Tasks tab and add a task there.
2. Enter the **Title** (required) and **Description**.
3. Set the **Priority** (Low, Medium, High, or Critical).
4. Assign the task to a user by selecting from the **Assignee** dropdown.
5. Set a **Due Date**.
6. Select **Save**.

### 7.3 Task Status

Tasks move through these statuses:

- **Pending** -- the task has been created but work has not begun.
- **In Progress** -- work is actively underway.
- **Completed** -- the task has been finished.
- **Cancelled** -- the task is no longer needed.
- **Blocked** -- the task cannot proceed due to an external dependency.

### 7.4 Delegation

To reassign a task to another user:

1. Open the task.
2. Select the **Reassign** button.
3. Choose the new assignee from the user list.
4. Optionally add a note explaining the reassignment.
5. Select **Confirm**. Both the original and new assignees are notified.

### 7.5 Overdue Indicators

Tasks that are past their due date are highlighted with a red overdue badge in both table and Kanban views. The number of days overdue is displayed alongside the badge. Overdue tasks also appear in the Dashboard's Upcoming Deadlines widget.

---

## 8. Workflows and Approvals

Workflows automate multi-step review and approval processes.

### 8.1 Workflow Types

OIG-ITS supports 5 workflow types:

1. **Case Intake** -- routes new cases through initial screening and assignment.
2. **Investigation** -- manages the progression of investigative steps.
3. **Review** -- handles supervisory and quality-control reviews.
4. **Closure** -- ensures all requirements are met before closing a case.
5. **Custom** -- user-defined workflows for specialized processes.

### 8.2 Viewing Workflows

Select **Workflows** from the left sidebar under the Management section. The workflow list shows all active workflow instances with their associated case, current step, status, and age.

Workflow statuses include:

- **Pending** -- the workflow has not yet started.
- **In Progress** -- the workflow is actively moving through its steps.
- **Completed** -- all steps have been finished.
- **Cancelled** -- the workflow was terminated before completion.

### 8.3 Approving or Rejecting Steps

1. Select **Approvals** from the left sidebar to see all workflow steps awaiting your action.
2. Each pending approval shows the workflow name, case number, step description, priority, and how long it has been waiting.
3. Review the details of the step.
4. Enter any comments in the text area provided.
5. Select **Approve** to advance the workflow to the next step, or select **Reject** to send it back to the previous step with your comments.

### 8.4 Notification Preferences

Select **Notifications** from the left sidebar to view all system notifications. Notifications are generated automatically when:

- A case is assigned to you.
- A task is assigned to you or is approaching its due date.
- A workflow step requires your approval.
- A document is submitted for your review.
- A case status changes.

---

## 9. Hotline and Whistleblower (Inquiries)

The Inquiries module manages complaints, tips, and reports received through various intake channels.

### 9.1 Viewing Inquiries

Select **Inquiries** from the left sidebar. The inquiry list displays all received complaints with columns for inquiry number, source, status, priority, description, and date received.

### 9.2 Inquiry Sources

Inquiries can originate from 7 intake channels:

- **Hotline** -- phone calls to the OIG complaint hotline.
- **Whistleblower** -- reports filed under whistleblower protection statutes.
- **Carrier** -- referrals from carriers or providers.
- **Congressional** -- inquiries from members of Congress or their staff.
- **Walk-In** -- in-person complaints at OIG offices.
- **Email** -- complaints received via email.
- **Other** -- complaints from any other source.

### 9.3 Public Complaint Submission

Members of the public can submit complaints through a public-facing web form. These submissions are automatically created as inquiries with a status of New. Personally identifiable information is protected and access is restricted to authorized staff.

### 9.4 Anonymous Reporting

The system supports anonymous complaint submission. When a complainant does not provide identifying information, the inquiry is flagged as anonymous. Investigators can communicate with anonymous complainants through the system's secure messaging feature without revealing identity.

### 9.5 Whistleblower Protections

Inquiries marked with the Whistleblower source receive enhanced protections:

- The complainant's identity is restricted to a limited set of authorized users.
- An audit trail records every access to whistleblower identity information.
- Confidentiality warnings are displayed when viewing these records.

### 9.6 Inquiry Management

Inquiries move through the following statuses:

- **New** -- just received and not yet reviewed.
- **Under Review** -- an analyst is evaluating the complaint.
- **Converted** -- the inquiry has been converted to a full investigation case.
- **Closed** -- the inquiry was reviewed and closed without further action.

### 9.7 Converting an Inquiry to a Case

When an inquiry warrants a formal investigation:

1. Open the inquiry from the list.
2. Select the **Convert to Case** button.
3. A dialog will appear asking you to confirm the conversion and select a case type and priority.
4. Select **Convert**. The system will:
   - Create a new case pre-populated with information from the inquiry.
   - Link the inquiry record to the new case.
   - Update the inquiry status to Converted.
   - Display the new case number and provide a link to open it.

---

## 10. Search

OIG-ITS provides multiple ways to find information across the system.

### 10.1 Quick Search

Press **Ctrl+K** (or **Cmd+K** on Mac) from any page to open the quick search dialog. Type a keyword and press Enter to search across all cases, evidence, tasks, and documents. Select a result to navigate directly to that record.

### 10.2 Full Search Page

Select **Search** from the left sidebar to access the full search page. This page provides more comprehensive search capabilities than quick search.

1. Enter your search query in the search bar.
2. Results are displayed in categorized tabs: **All**, **Cases**, **Evidence**, **Tasks**, and **Documents**.
3. Select a tab to filter results to that record type.
4. Each result shows the record title, type, status, and a brief excerpt highlighting the matching text.
5. Select a result to navigate to its detail page.

### 10.3 Advanced Search

Select the **filter icon** on the search page to open the advanced search panel. Advanced search allows you to combine multiple criteria:

- **Entity Type** -- limit results to Cases, Evidence, Tasks, or Documents.
- **Status** -- filter by specific status values.
- **Case Type** -- filter by investigation type (for case searches).
- **Priority** -- filter by priority level.
- **Evidence Type** -- filter by evidence category (for evidence searches).
- **Title Contains** -- search within titles only.
- **Description Contains** -- search within description fields only.
- **Date Range** -- filter by creation date with From and To date pickers.

### 10.4 Saved Searches

To save a search for reuse:

1. Perform a search with your desired criteria.
2. Select the **Save Search** button (bookmark icon).
3. Enter a name for the saved search.
4. Select **Save**.

Saved searches appear in the sidebar of the search page. Select a saved search to re-run it instantly. To delete a saved search, select the trash icon next to its name.

### 10.5 Natural Language Search (AI)

On the **AI Insights** page, the Natural Language Search feature allows you to search using plain English questions. For example:

- "Show me all fraud cases opened this year"
- "Find high-priority cases assigned to John Smith"
- "Which cases involve contractors in Region 5?"

The AI translates your question into structured filters and returns matching results.

---

## 11. Reports and Analytics

### 11.1 Dashboard Analytics

Select **Analytics** from the left sidebar under the Reports section. The Analytics page provides interactive charts and visualizations:

- **Cases by Status** -- bar chart showing the distribution of cases across all statuses.
- **Cases by Type** -- pie chart showing the proportion of each case type.
- **Task Completion** -- bar chart showing completed, pending, in-progress, and blocked tasks.
- **Investigation Trends** -- trend lines showing case volumes over time.
- **Financial Summary** -- aggregate dollar amounts for recoveries, fines, and savings.
- **Workload Distribution** -- charts showing case and task assignments per investigator.

### 11.2 Financial Dashboard

Select **Financial** from the left sidebar. This dedicated dashboard provides five summary cards:

- **Total Recoveries** -- money recovered as a result of investigations.
- **Total Fines** -- fines and penalties assessed.
- **Total Savings** -- cost savings identified through audits and investigations.
- **Cost per Case** -- average cost of conducting an investigation.
- **Recovery Rate** -- the percentage of identified losses that have been recovered.

### 11.3 Standard Reports

Select **Reports** from the left sidebar. OIG-ITS includes **7 standard report types**:

1. **Case Summary** -- overview of all cases with current status, type, and priority.
2. **Investigation Activity** -- detailed log of investigative actions taken.
3. **Task Completion** -- report on task statuses, completion rates, and overdue items.
4. **Evidence Chain** -- chain-of-custody report for evidence items.
5. **Audit Trail** -- comprehensive log of all system actions.
6. **Financial** -- financial impact summary across investigations.
7. **Semiannual** -- congressional semiannual report data compilation.

To run a report:

1. On the Reports page, locate the report you want to run.
2. Select the **Run** button (play icon). The report will execute and download as a JSON file.
3. To download in CSV format, select the **Download CSV** button (download icon).

### 11.4 Ad-Hoc Report Builder

Administrators can create custom report definitions:

1. Select the **New Report** button on the Reports page.
2. Define the report name, description, and data query.
3. Save the report definition. It will appear in the report list for all authorized users.

### 11.5 Export Formats

Reports can be exported in the following formats:

- **CSV** -- comma-separated values, suitable for spreadsheet analysis.
- **Excel** -- formatted Excel workbook (.xlsx).
- **PDF** -- portable document format for printing and distribution.
- **JSON** -- structured data format for integration with other systems.

---

## 12. Training

The Training module tracks mandatory and elective training courses for OIG staff.

### 12.1 My Training Tab

The default view on the Training page shows your personal training records:

- Courses you are enrolled in or have completed.
- Completion status (Enrolled, In Progress, Completed, Failed, Expired).
- Completion dates and expiration dates for certifications.
- Hours credited.

### 12.2 Course Catalog

Select the **Course Catalog** tab to browse all available training courses. Courses are organized by category:

- **Ethics** -- government ethics and standards of conduct.
- **Firearms** -- weapons qualification and safety.
- **Legal** -- legal updates and regulatory training.
- **Technical** -- investigative tools and technology.
- **Leadership** -- supervisory and management development.
- **Safety** -- workplace safety and security.
- **Other** -- miscellaneous training topics.

Each course listing shows the title, description, category, delivery method (Classroom, Online, In-Person, or Blended), required hours, and whether a passing score is required.

### 12.3 Enrolling in Courses

1. From the Course Catalog, locate the desired course.
2. Select the **Enroll** button.
3. Confirm your enrollment. The course will appear in your My Training tab with a status of Enrolled.

### 12.4 Tracking Completion and Expiration

- When you complete a course, update your training record with the completion date and score (if applicable).
- Courses with expiration periods will display a warning badge when the expiration date is approaching (within 30 days) or has passed.
- Expired certifications are highlighted in red and require re-enrollment.

### 12.5 Training Assignments

Supervisors and administrators can assign mandatory training to individual users. Assigned courses appear automatically in the user's My Training tab and generate a notification.

---

## 13. Time and Labor

The Timesheets module allows investigators and analysts to log time spent on cases and other activities.

### 13.1 Logging Time Entries

1. Select **Timesheets** from the left sidebar.
2. Select the **New Time Entry** button.
3. Fill in the required fields:
   - **Date** -- the date the work was performed.
   - **Hours** -- the number of hours worked (in decimal format, e.g., 1.5 for one hour and thirty minutes).
   - **Activity Type** -- select from the following categories:
     - Case Work
     - Training
     - Admin (administrative duties)
     - Travel
     - Overtime
     - Undercover
     - Court
     - Leave
     - Other
   - **Case** -- if the activity is case-related, select the associated case.
   - **Description** -- a brief note describing the work performed.
4. Select **Save**.

### 13.2 Timesheet Generation

Time entries are grouped into timesheets by pay period. To generate or view a timesheet:

1. Select the **Timesheets** tab on the Timesheets page.
2. Select the pay period you want to view.
3. The system displays all time entries for that period, grouped by date.
4. Review totals for regular hours, overtime, and special pay categories (availability pay, substantial hours).

### 13.3 Timesheet Submission and Approval

1. Once all entries for a pay period are complete, select **Submit** to send the timesheet for supervisory approval.
2. Your supervisor will receive a notification and can review the timesheet from their Approvals page.
3. The supervisor can **Approve** or **Reject** the timesheet with comments.
4. If rejected, correct the entries and resubmit.

Timesheet statuses include: Draft, Submitted, Approved, and Rejected.

---

## 14. AI Insights

The AI Insights module uses artificial intelligence to analyze investigation data and surface actionable intelligence.

Select **AI Insights** from the left sidebar under the Reports section.

### 14.1 Duplicate Subject Detection

The system automatically identifies potential duplicate subjects across all cases by comparing names, addresses, and identifiers. Each potential duplicate pair shows:

- The two subjects in question.
- A confidence score (percentage).
- The reasons for the match (name similarity, shared identifiers, etc.).

### 14.2 Network Analysis

The network analysis feature maps relationships between subjects and cases:

- **Network Hubs** -- identifies subjects who are connected to the most cases, sorted by degree of connectivity.
- **Fraud Rings** -- detects clusters of subjects who appear together across multiple cases, which may indicate coordinated activity.

### 14.3 Case Clustering

The AI groups similar cases into clusters based on case type, source, description patterns, and other attributes. Each cluster shows the number of cases, the predominant type, and the top source.

### 14.4 Document Classification

Recently uploaded documents are automatically classified by the AI into categories and tagged with relevant keywords. The most recent classifications are displayed on the AI Insights page.

### 14.5 Natural Language Search

Type a plain-English question or description to search for cases without needing to know the exact filters. The AI interprets your query and returns matching cases. See Section 10.5 for details.

### 14.6 Interview Question Generator

This tool generates suggested interview questions tailored to your investigation:

1. Select the **Interview Questions** tab on the AI Insights page.
2. Choose the **Case Type** (e.g., Fraud, Misconduct).
3. Select the **Subject Role** (e.g., Respondent, Witness).
4. Optionally provide a brief **Case Description** for more targeted questions.
5. Select **Generate Questions**.

The AI produces four categories of questions:

- **Opening Questions** -- rapport-building and introductory questions.
- **Substantive Questions** -- questions addressing the core issues.
- **Probe Questions** -- follow-up questions to explore inconsistencies or details.
- **Closing Questions** -- wrap-up and confirmation questions.

Additionally, the system provides interview tips specific to the case type and subject role.

### 14.7 AI Report Generation

The AI can draft investigation reports based on case data:

1. Select the **Report Generation** tab on the AI Insights page.
2. Enter the **Case ID** of the case you want a report for.
3. Choose the **Report Type** (summary, detailed, or closing).
4. Select **Generate Report**.
5. The AI produces a draft report that you can review, edit, and incorporate into your case documents.

---

## 15. Administration

The following features are available only to users with the **Admin** role.

### 15.1 User Management

Select **Users** from the left sidebar.

- View all system users with their name, email, role, division, and active status.
- **Search** users by name or email.
- **Filter** by role (Admin, Investigator, Supervisor, Analyst, Auditor, Read Only).
- Add new users, edit user profiles, activate or deactivate accounts, and assign roles.

### 15.2 Audit Log

Select **Audit Log** from the left sidebar under the Reports section. The audit log provides a tamper-proof record of every action performed in the system:

- **Timestamp** -- the exact date and time of the action.
- **User** -- the person who performed the action (or "System" for automated actions).
- **Action** -- the type of action (create, update, delete, login, etc.).
- **Entity Type** -- what type of record was affected (case, document, user, etc.).
- **Details** -- additional context about the change, including old and new values.

Use the search bar and filters to narrow the audit log by user, action type, entity type, or date range.

### 15.3 System Settings

Select **Settings** from the left sidebar. The Settings page allows administrators to configure system-wide parameters such as:

- Case number format and sequence.
- Session timeout duration.
- Email notification settings.
- File upload size limits.
- Password policy requirements.

Each setting can be edited inline. Select **Save** to apply changes.

### 15.4 Reference Data

On the Settings page, the Reference Data section allows administrators to manage lookup values used throughout the system, organized by category. Examples include:

- Violation codes and descriptions.
- Organizational units and divisions.
- Source categories for inquiries.
- Jurisdictions and regions.

### 15.5 Retention Policy

Administrators define how long different types of records are retained before they are eligible for archival or deletion. Retention policies are applied automatically based on case close date and record type.

### 15.6 Routing and Filing Rules

Administrators can configure automatic routing rules that control:

- Which supervisor or team receives new cases based on type, source, or jurisdiction.
- How inquiries are assigned for initial review.
- Workflow triggers based on case events.

---

## 16. Appendix

### 16.1 Role Permissions Matrix

| Feature | Admin | Supervisor | Investigator | Analyst | Auditor | Read Only |
|---|---|---|---|---|---|---|
| View cases | Yes | Yes | Yes | Yes | Yes | Yes |
| Create cases | Yes | Yes | Yes | No | No | No |
| Edit cases | Yes | Yes | Own only | No | No | No |
| Delete cases | Yes | No | No | No | No | No |
| Approve documents | Yes | Yes | No | No | No | No |
| Manage users | Yes | No | No | No | No | No |
| View audit log | Yes | Yes | No | No | Yes | No |
| Run reports | Yes | Yes | Yes | Yes | Yes | No |
| Manage settings | Yes | No | No | No | No | No |
| Approve workflows | Yes | Yes | No | No | No | No |
| View AI insights | Yes | Yes | Yes | Yes | No | No |
| Manage training | Yes | Yes | No | No | No | No |
| Approve timesheets | Yes | Yes | No | No | No | No |

### 16.2 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+K (Cmd+K on Mac) | Open quick search |
| Escape | Close modal dialogs and search overlay |

### 16.3 Supported File Formats for Upload

The following file formats are accepted for document uploads (maximum 50 MB per file):

- **Documents**: PDF, DOC, DOCX, ODT, RTF, TXT
- **Spreadsheets**: XLS, XLSX, ODS, CSV
- **Presentations**: PPT, PPTX, ODP
- **Images**: JPG, JPEG, PNG, GIF, TIFF, BMP, SVG, WEBP
- **Email**: EML, MSG
- **Archives**: ZIP, 7Z
- **Web**: HTML, HTM, XML
- **Audio/Video**: MP3, MP4, WAV, AVI, MOV

### 16.4 Glossary

| Term | Definition |
|---|---|
| Case | A formal investigation record tracking an allegation of fraud, waste, abuse, or misconduct. |
| Case Number | A system-generated unique identifier assigned to each case (e.g., OIG-2026-00142). |
| Chain of Custody | The documented trail of who possessed a piece of evidence, when, and for what purpose. |
| Complainant | The person or entity that files a complaint or reports an allegation. |
| Evidence Item | A piece of physical, digital, or testimonial evidence linked to a case. |
| Exhibit Number | A sequential identifier assigned to each evidence item within a case. |
| Inquiry | A complaint or tip received through the hotline, email, or other intake channel that has not yet been converted to a case. |
| OIG | Office of Inspector General. |
| Priority | The urgency level assigned to a case or task: Low, Medium, High, or Critical. |
| Referral | A formal transfer of a matter or information to another agency or law enforcement body. |
| Respondent | The individual or entity that is the subject (target) of an investigation. |
| Retention Policy | Rules governing how long records are kept before archival or destruction. |
| Semiannual Report | A report required by the Inspector General Act, submitted to Congress twice per year. |
| Subject | An individual or organization connected to an investigation in any capacity. |
| Violation | An alleged breach of law, regulation, or policy associated with a case. |
| Whistleblower | A person who reports misconduct, waste, or fraud, and is protected from retaliation under federal law. |
| Workflow | An automated multi-step process that routes a case or document through defined review and approval stages. |

---

*This document is Section 508 compliant. It uses structured headings, descriptive link text, and tabular data with headers to support assistive technologies. If you require this manual in an alternative format, contact your system administrator.*

*OIG-ITS is developed by Y Point Technologies.*
