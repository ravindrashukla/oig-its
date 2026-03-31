"""
OIG-ITS Extended Demo Video Recorder (5-6 minutes)
===================================================
Creates a detailed demo with more scenes, longer narrations, and actual interactions.

Usage:
  1. Make sure the app is running: npm run dev
  2. Run: python demo/record-demo-extended.py
  3. Output: demo/oig-its-demo-extended.mp4
"""

import os
import sys
import time
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
    import pyttsx3
    from PIL import Image, ImageDraw, ImageFont
    import imageio.v2 as imageio
    import imageio_ffmpeg
except ImportError as e:
    print(f"Missing dependency: {e}")
    sys.exit(1)

BASE_URL = "http://localhost:3000"
OUTPUT_DIR = Path(__file__).parent
SCREENSHOTS_DIR = OUTPUT_DIR / "screenshots_ext"
AUDIO_DIR = OUTPUT_DIR / "audio_ext"
FPS = 2

DEMO_SCENES = [
    # ─── INTRO (0:00 - 0:15) ───
    {
        "id": "intro-title",
        "title": "OIG-ITS Demo",
        "narration": "Welcome to the OPM Office of Inspector General Investigative Tracking System. This comprehensive platform manages the full lifecycle of criminal, civil, and administrative investigations for the OPM OIG. In the next few minutes, we will walk through every major module of the system.",
        "duration": 15,
        "overlay": "OIG-ITS\nInvestigative Tracking System\n\nComprehensive Demo\n\nDeveloped by Y Point"
    },

    # ─── LOGIN & AUTH (0:15 - 0:50) ───
    {
        "id": "login-page",
        "title": "Login & Authentication",
        "url": f"{BASE_URL}/login",
        "narration": "The system starts with a secure login page featuring OPM OIG branding and a FedRAMP authorization badge. The system supports six distinct roles: Administrator, Supervisor, Investigator, Analyst, Auditor, and Read-Only. Each role has different access levels and permissions.",
        "duration": 12,
    },
    {
        "id": "login-credentials",
        "title": "Login Credentials",
        "narration": "We will log in as Samuel Johnson, a Senior Special Agent with the Fraud and Financial Crimes division. Security features include 8-hour session timeout, account lockout after 5 failed password attempts with a 15-minute cooling period, and IP address whitelisting.",
        "duration": 10,
        "actions": [
            {"type": "fill", "selector": "input[placeholder*='oig.gov']", "value": "samuel.johnson@oig.gov"},
            {"type": "fill", "selector": "input[type='password']", "value": "Demo2026!"},
            {"type": "screenshot"},
            {"type": "click", "selector": "button[type='submit'], button:has-text('Sign in')"},
            {"type": "wait", "ms": 4000}
        ]
    },

    # ─── DASHBOARD (0:50 - 1:30) ───
    {
        "id": "dashboard-metrics",
        "title": "Dashboard — Metrics",
        "url": f"{BASE_URL}/dashboard",
        "narration": "After login, the personalized dashboard displays key performance indicators. The top row shows four primary metrics: total cases, active investigations, critical priority cases, and closed cases. The secondary row shows overdue tasks, upcoming deadlines this week, and unread notifications.",
        "duration": 12,
    },
    {
        "id": "dashboard-widgets",
        "title": "Dashboard — Widgets",
        "narration": "Below the metrics, we see the cases-by-status breakdown with color-coded badges, recent cases with priority and status indicators linking directly to case details, upcoming deadlines for both cases and tasks, and the latest notifications. The dashboard layout is fully customizable — users can reorder or hide widgets using the gear icon.",
        "duration": 14,
        "actions": [{"type": "scroll", "y": 350}]
    },

    # ─── CASE MANAGEMENT (1:30 - 3:00) ───
    {
        "id": "cases-list",
        "title": "Case List",
        "url": f"{BASE_URL}/dashboard/cases",
        "narration": "The Cases page shows all investigations in a sortable, filterable data table. Columns include case number, title, status, priority, type, assigned investigator, and due date. Role-based access control ensures investigators see only their assigned cases, while supervisors and administrators see all cases.",
        "duration": 12,
    },
    {
        "id": "cases-filters",
        "title": "Case Filters",
        "narration": "Powerful filtering options let users narrow results by status, case type, and priority level. The search bar filters by case number or title in real time. The system supports nine case types: Fraud, Waste, Abuse, Misconduct, Whistleblower, Compliance, Outreach, Briefing, and Other.",
        "duration": 10,
    },
    {
        "id": "case-create",
        "title": "Create New Case",
        "url": f"{BASE_URL}/dashboard/cases/new",
        "narration": "Creating a new case uses a guided 3-step wizard. Step 1 captures the title and description. Step 2 classifies the case type, sets the priority level, and optionally assigns a due date. Step 3 provides a review before submission. The system automatically generates a unique case number in the OIG-2026 format and assigns the creator as lead investigator.",
        "duration": 14,
    },
    {
        "id": "case-detail",
        "title": "Case Detail — Overview",
        "narration": "Each case opens to a comprehensive detail view with 10 tabs. The Overview tab shows the case description, document and evidence counts, recent chronology notes, case classification details in the sidebar including type, dates, jurisdiction, complaint source, and the assigned investigation team.",
        "duration": 14,
        "actions": [
            {"type": "goto", "url": f"{BASE_URL}/dashboard/cases"},
            {"type": "wait", "ms": 2000},
            {"type": "click", "selector": "table tbody tr:first-child td:first-child a, table tbody tr:first-child a"},
            {"type": "wait", "ms": 3000}
        ]
    },
    {
        "id": "case-tabs",
        "title": "Case Detail — Tabs",
        "narration": "The tab bar provides access to Documents for file management, Evidence with chain of custody tracking, Tasks for investigation work items, Subjects for people and organizations involved, Timeline showing the complete case chronology, Violations per subject, Financial results tracking recoveries and fines, Investigative Techniques used, and Referrals to other agencies.",
        "duration": 14,
    },

    # ─── EVIDENCE & DOCUMENTS (3:00 - 3:50) ───
    {
        "id": "evidence",
        "title": "Evidence Management",
        "url": f"{BASE_URL}/dashboard/evidence",
        "narration": "The Evidence module supports 8 evidence types: Document, Photo, Video, Audio, Digital, Physical, Testimony, and Other. Each item is automatically assigned a sequential exhibit number like EX-001. The chain of custody is immutable — every transfer between agents is permanently recorded with timestamps, action descriptions, and notes.",
        "duration": 14,
    },
    {
        "id": "documents",
        "title": "Document Management",
        "url": f"{BASE_URL}/dashboard/documents",
        "narration": "Document management supports uploading 30 file formats including PDF, Word, Excel, PowerPoint, images, audio, and video files up to 50 megabytes. The system provides document versioning with version numbers and history chains. Supervisory approval can be required for sensitive documents, and 19 predefined templates auto-populate case data for subpoenas, interview memos, and reports. All downloads are audit-logged.",
        "duration": 14,
    },

    # ─── TASKS & WORKFLOWS (3:50 - 4:30) ───
    {
        "id": "tasks-board",
        "title": "Task Management — Board",
        "url": f"{BASE_URL}/dashboard/tasks",
        "narration": "Task management offers two views. The Kanban board organizes tasks into four columns: Pending, In Progress, Blocked, and Completed. Overdue tasks display red badges showing the number of days overdue. Tasks can be delegated to other team members with automatic notifications sent to the new assignee.",
        "duration": 12,
    },
    {
        "id": "approvals",
        "title": "Workflow Approvals",
        "url": f"{BASE_URL}/dashboard/approvals",
        "narration": "The workflow engine supports five types: Case Intake Review, Investigation Closure, Evidence Review, Document Approval, and Whistleblower Protection Assessment. Each workflow has multi-step approval chains. Actions include Approve, Reject, and for supervisors, the ability to Skip or Revert steps. Every action triggers notifications to relevant team members.",
        "duration": 14,
    },
    {
        "id": "notifications",
        "title": "Notifications",
        "url": f"{BASE_URL}/dashboard/notifications",
        "narration": "Nine notification types keep users informed: Case Assigned, Case Updated, Task Assigned, Task Due, Document Uploaded, Evidence Added, Workflow Action, System Alert, and Announcements. Notifications are delivered both via email and in-app. Users can customize their preferences per notification type. The bell icon provides quick access with an unread count badge.",
        "duration": 12,
    },

    # ─── HOTLINE & WHISTLEBLOWER (4:30 - 5:10) ───
    {
        "id": "hotline",
        "title": "Public Hotline",
        "url": f"{BASE_URL}/hotline",
        "narration": "The public hotline page requires no authentication. Anyone can submit a complaint with a subject and description. Anonymous submissions are supported. Contact information is optional. Each submission receives a unique inquiry number. The system sends automatic confirmation emails when an email address is provided.",
        "duration": 12,
    },
    {
        "id": "whistleblower",
        "title": "Whistleblower Portal",
        "url": f"{BASE_URL}/whistleblower",
        "narration": "The whistleblower form prominently displays legal protections under the Whistleblower Protection Act, 5 U.S.C. Section 2302(b)(8). Whistleblower submissions are automatically classified as high priority and follow a separate workflow with enhanced identity protection measures.",
        "duration": 12,
    },
    {
        "id": "inquiries",
        "title": "Inquiry Management",
        "url": f"{BASE_URL}/dashboard/inquiries",
        "narration": "Staff review all incoming inquiries from this dashboard. Each inquiry can be assigned to an investigator, moved to Under Review status, and ultimately converted into a full investigation case. The Convert to Case feature creates a new case pre-populated with all inquiry data.",
        "duration": 10,
    },

    # ─── SEARCH (5:10 - 5:30) ───
    {
        "id": "search",
        "title": "Search",
        "url": f"{BASE_URL}/dashboard/search",
        "narration": "Full-text search powered by MeiliSearch indexes cases, evidence, tasks, and documents. Press Control-K anywhere for instant search. The search page provides tabbed results, faceted filtering, date range filters, and an Advanced Search panel with per-field criteria. Searches can be saved and reused.",
        "duration": 12,
    },

    # ─── REPORTS & ANALYTICS (5:30 - 6:10) ───
    {
        "id": "analytics",
        "title": "Analytics Dashboard",
        "url": f"{BASE_URL}/dashboard/analytics",
        "narration": "The analytics dashboard provides interactive visualizations: cases by status bar chart, cases by type pie chart, monthly case trends, and task completion breakdown. Key metrics include the closure rate, average days to close an investigation, investigator workload rankings, and financial return on investment calculations.",
        "duration": 14,
        "actions": [{"type": "scroll", "y": 300}]
    },
    {
        "id": "financial",
        "title": "Financial Dashboard",
        "url": f"{BASE_URL}/dashboard/financial",
        "narration": "The financial dashboard tracks all monetary outcomes: recoveries, fines, penalties, restitution, and cost savings. It calculates investigative costs from logged time entries and computes overall return on investment. Cases and subjects are ranked by total financial impact, with monthly trend analysis.",
        "duration": 10,
    },
    {
        "id": "reports",
        "title": "Reports & Builder",
        "url": f"{BASE_URL}/dashboard/reports",
        "narration": "Seven standard report templates are available including the Semiannual Report to Congress and CIGIE report. Reports export as CSV, Excel, or printable PDF. The no-code Report Builder lets users create custom ad-hoc reports by selecting entity types, choosing columns, adding filters, previewing results, and saving for future reuse.",
        "duration": 12,
    },

    # ─── TRAINING & TIME (6:10 - 6:40) ───
    {
        "id": "training",
        "title": "Training Management",
        "url": f"{BASE_URL}/dashboard/training",
        "narration": "The Training module manages courses, certifications, and compliance requirements. Three tabs organize the experience: My Training shows personal records with expiration warnings, the Course Catalog lists available courses filterable by category and requirement status, and the Assignments tab lets supervisors assign training by user, role, or group. Course evaluations, cost tracking, and CSV export are included.",
        "duration": 14,
    },
    {
        "id": "timesheets",
        "title": "Time & Labor Tracking",
        "url": f"{BASE_URL}/dashboard/timesheets",
        "narration": "Time and labor tracking supports nine activity types including case work, training, travel, overtime, and undercover operations. The system calculates Law Enforcement Availability Pay under Title 5 and verifies the substantial hours requirement. Timesheets are generated for pay periods and go through a submit, review, and approve workflow.",
        "duration": 12,
    },

    # ─── ADMIN (6:40 - 7:10) ───
    {
        "id": "audit-log",
        "title": "Audit Log",
        "url": f"{BASE_URL}/dashboard/audit-log",
        "narration": "The audit log provides a complete trail of every system action with over 10,000 entries. Each entry records the timestamp, user, action type, entity affected, and field-level changes showing old and new values. Filters narrow by date range, action type, and entity. The entire log can be exported as CSV for compliance reporting.",
        "duration": 12,
    },
    {
        "id": "users",
        "title": "User Management",
        "url": f"{BASE_URL}/dashboard/users",
        "narration": "Administrators manage user accounts from this page: create new users, assign and change roles, disable accounts, and reset passwords. The six roles have granular permissions, and field-level access control restricts which case fields each role can edit based on the current case status.",
        "duration": 10,
    },
    {
        "id": "inventory",
        "title": "Inventory & Calendar",
        "url": f"{BASE_URL}/dashboard/inventory",
        "narration": "The inventory module tracks evidence items, technical equipment, and law enforcement property. Items are categorized by type and status, with assignment tracking by agent and region. The calendar module provides monthly grid and list views with support for recurring reminders.",
        "duration": 10,
    },

    # ─── CLOSING (7:10 - 7:30) ───
    {
        "id": "closing",
        "title": "Thank You",
        "narration": "That concludes our comprehensive demo of the OIG Investigative Tracking System. The system covers the complete investigation lifecycle: case management, evidence chain of custody, document management with versioning, multi-step workflow approvals, public hotline and whistleblower intake, advanced search, comprehensive reporting and analytics, training management, time and labor tracking, and full audit capabilities. All backed by role-based access control with 6 roles and over 35 permissions. Developed by Y Point. Thank you for watching.",
        "duration": 18,
        "overlay": "OIG-ITS\nInvestigative Tracking System\n\nDemo Complete\n\n95+ API Routes | 20+ Modules | 100% Tests Passing\n\nDeveloped by Y Point"
    },
]


def create_title_frame(text, width=1280, height=720):
    img = Image.new("RGB", (width, height), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)
    try:
        font_large = ImageFont.truetype("arial.ttf", 44)
        font_small = ImageFont.truetype("arial.ttf", 22)
    except (OSError, IOError):
        font_large = ImageFont.load_default()
        font_small = font_large

    lines = text.split("\n")
    y_start = height // 2 - (len(lines) * 52) // 2
    for i, line in enumerate(lines):
        font = font_large if i == 0 else font_small
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        x = (width - tw) // 2
        y = y_start + i * 52
        color = (219, 234, 254) if i == 0 else (148, 163, 184)
        draw.text((x, y), line, fill=color, font=font)

    # Try to add logo
    try:
        logo = Image.open("Logo/Logo_YPoint_black.png").convert("RGBA")
        logo = logo.resize((80, 60), Image.LANCZOS)
        # Invert for dark background
        from PIL import ImageOps
        logo_rgb = logo.convert("RGB")
        logo_inv = ImageOps.invert(logo_rgb)
        logo_inv.putalpha(logo.split()[3] if logo.mode == "RGBA" else 180)
        img = img.convert("RGBA")
        img.paste(logo_inv, (width // 2 - 40, height - 80), logo_inv)
        img = img.convert("RGB")
    except Exception:
        pass

    return img


def add_caption(img_path, title, narration):
    img = Image.open(img_path).convert("RGBA")
    try:
        font_title = ImageFont.truetype("arial.ttf", 20)
        font_caption = ImageFont.truetype("arial.ttf", 13)
    except (OSError, IOError):
        font_title = ImageFont.load_default()
        font_caption = font_title

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rectangle([(0, 0), (1280, 42)], fill=(15, 23, 42, 210))
    d.rectangle([(0, 675), (1280, 720)], fill=(15, 23, 42, 200))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    draw.text((15, 11), f"OIG-ITS  |  {title}", fill=(219, 234, 254), font=font_title)
    caption = narration[:140] + ("..." if len(narration) > 140 else "")
    draw.text((15, 692), caption, fill=(148, 163, 184), font=font_caption)
    return img.convert("RGB")


def generate_audio(text, filename):
    engine = pyttsx3.init()
    engine.setProperty("rate", 150)
    engine.setProperty("volume", 0.9)
    voices = engine.getProperty("voices")
    for voice in voices:
        if "zira" in voice.name.lower() or "female" in voice.name.lower():
            engine.setProperty("voice", voice.id)
            break
    engine.save_to_file(text, str(filename))
    engine.runAndWait()


def main():
    print("=" * 60)
    print("  OIG-ITS Extended Demo Recorder (5-6 min)")
    print("=" * 60)

    SCREENSHOTS_DIR.mkdir(exist_ok=True)
    AUDIO_DIR.mkdir(exist_ok=True)

    total_duration = sum(s["duration"] for s in DEMO_SCENES)
    print(f"  Planned duration: {total_duration // 60}:{total_duration % 60:02d}")
    print(f"  Scenes: {len(DEMO_SCENES)}")
    print()

    # Step 1: Audio
    print("[1/4] Generating voiceover...")
    for scene in DEMO_SCENES:
        audio_path = AUDIO_DIR / f"{scene['id']}.wav"
        if not audio_path.exists():
            print(f"  {scene['id']}...")
            generate_audio(scene["narration"], audio_path)
            time.sleep(0.3)
    print("  Done")

    # Step 2: Screenshots
    print("\n[2/4] Capturing screenshots...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        page = ctx.new_page()

        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)

        for i, scene in enumerate(DEMO_SCENES):
            sid = scene["id"]
            print(f"  [{i+1}/{len(DEMO_SCENES)}] {scene['title']}")

            if scene.get("overlay"):
                create_title_frame(scene["overlay"]).save(str(SCREENSHOTS_DIR / f"{sid}.png"))
                continue

            if scene.get("url"):
                try:
                    page.goto(scene["url"], wait_until="networkidle", timeout=15000)
                except Exception:
                    try:
                        page.goto(scene["url"], timeout=15000)
                    except Exception:
                        pass
                time.sleep(1.5)

            for action in scene.get("actions", []):
                try:
                    if action["type"] == "fill":
                        page.fill(action["selector"], action["value"])
                    elif action["type"] == "click":
                        page.click(action["selector"], timeout=5000)
                    elif action["type"] == "wait":
                        time.sleep(action["ms"] / 1000)
                    elif action["type"] == "goto":
                        page.goto(action["url"], wait_until="networkidle", timeout=15000)
                    elif action["type"] == "scroll":
                        page.evaluate(f"window.scrollBy(0, {action['y']})")
                    elif action["type"] == "screenshot":
                        pass  # will screenshot at end
                    time.sleep(0.3)
                except Exception as e:
                    print(f"    Action warning: {e}")

            time.sleep(1)
            page.screenshot(path=str(SCREENSHOTS_DIR / f"{sid}.png"))

        browser.close()
    print("  Done")

    # Step 3: Caption overlays
    print("\n[3/4] Adding captions...")
    for scene in DEMO_SCENES:
        sid = scene["id"]
        img_path = SCREENSHOTS_DIR / f"{sid}.png"
        if not img_path.exists():
            continue
        if scene.get("overlay"):
            continue  # title frames already done
        captioned = add_caption(img_path, scene["title"], scene["narration"])
        captioned.save(str(SCREENSHOTS_DIR / f"{sid}_cap.png"))
    print("  Done")

    # Step 4: Assemble video
    print("\n[4/4] Assembling video...")
    video_path = OUTPUT_DIR / "oig-its-demo-extended.mp4"
    writer = imageio.get_writer(str(video_path), fps=FPS, codec="libx264", quality=8, pixelformat="yuv420p")

    for scene in DEMO_SCENES:
        sid = scene["id"]
        cap_path = SCREENSHOTS_DIR / f"{sid}_cap.png"
        raw_path = SCREENSHOTS_DIR / f"{sid}.png"
        img_path = cap_path if cap_path.exists() else raw_path
        if not img_path.exists():
            continue
        img = imageio.imread(str(img_path))
        for _ in range(int(scene["duration"] * FPS)):
            writer.append_data(img)
    writer.close()
    print(f"  Video: {video_path}")

    # Step 5: Combine audio
    print("\n[5/5] Combining audio + video...")
    import wave
    durations = [s["duration"] for s in DEMO_SCENES]
    scene_ids = [s["id"] for s in DEMO_SCENES]

    first_wav = None
    for sid in scene_ids:
        wp = AUDIO_DIR / f"{sid}.wav"
        if wp.exists():
            first_wav = wp
            break

    if first_wav:
        w = wave.open(str(first_wav), "rb")
        params = w.getparams()
        w.close()
        sr, sw, ch = params.framerate, params.sampwidth, params.nchannels

        combined_path = AUDIO_DIR / "combined.wav"
        combined = wave.open(str(combined_path), "wb")
        combined.setparams(params)

        for sid, dur in zip(scene_ids, durations):
            wp = AUDIO_DIR / f"{sid}.wav"
            if wp.exists():
                w = wave.open(str(wp), "rb")
                data = w.readframes(w.getnframes())
                adur = w.getnframes() / sr
                w.close()
                combined.writeframes(data)
                silence = max(0, dur - adur)
                if silence > 0:
                    combined.writeframes(b"\x00" * int(silence * sr * sw * ch))
            else:
                combined.writeframes(b"\x00" * int(dur * sr * sw * ch))
        combined.close()

        # Merge with ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        final_path = OUTPUT_DIR / "oig-its-demo-extended-final.mp4"
        import subprocess
        r = subprocess.run([
            ffmpeg, "-y",
            "-i", str(video_path),
            "-i", str(combined_path),
            "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest",
            str(final_path)
        ], capture_output=True, text=True)

        if r.returncode == 0:
            print(f"  Final: {final_path}")
        else:
            print(f"  ffmpeg error: {r.stderr[-200:]}")
            final_path = video_path

    print(f"\n{'=' * 60}")
    print(f"  Video: {OUTPUT_DIR / 'oig-its-demo-extended-final.mp4'}")
    print(f"  Duration: {total_duration // 60}:{total_duration % 60:02d}")
    print(f"  Scenes: {len(DEMO_SCENES)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
