"""
OIG-ITS Automated Demo Video Recorder
======================================
Creates a demo video with browser automation + voiceover.

Usage:
  1. Make sure the app is running: npm run dev
  2. Run: python demo/record-demo.py
  3. Output: demo/oig-its-demo.webm

Requirements (auto-installed):
  pip install playwright pyttsx3 Pillow imageio imageio-ffmpeg
  playwright install chromium
"""

import os
import sys
import time
import json
import wave
import struct
import tempfile
import shutil
from pathlib import Path

# Verify imports
try:
    from playwright.sync_api import sync_playwright
    import pyttsx3
    from PIL import Image, ImageDraw, ImageFont
    import imageio
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip install playwright pyttsx3 Pillow imageio imageio-ffmpeg")
    sys.exit(1)

BASE_URL = "http://localhost:3000"
OUTPUT_DIR = Path(__file__).parent
SCREENSHOTS_DIR = OUTPUT_DIR / "screenshots"
AUDIO_DIR = OUTPUT_DIR / "audio"
FPS = 2  # frames per second for the video (lower = smaller file, fine for demo)
SCREENSHOT_PAUSE = 1.5  # seconds to wait after navigation before screenshot

# ─── Demo Script: each scene = { url, actions, narration, duration } ───

DEMO_SCENES = [
    {
        "id": "title",
        "title": "OIG-ITS Demo",
        "url": None,
        "narration": "Welcome to the OPM Office of Inspector General Investigative Tracking System demo. This system manages criminal, civil, and administrative investigations. Let's walk through the key features.",
        "duration": 8,
        "overlay": "OIG-ITS\nInvestigative Tracking System\nDemo Walkthrough"
    },
    {
        "id": "login",
        "title": "Login Page",
        "url": f"{BASE_URL}/login",
        "narration": "The login page features OPM OIG branding with a FedRAMP authorization badge. The system supports 6 roles: Admin, Supervisor, Investigator, Analyst, Auditor, and Read-Only. Security includes 8-hour session timeout and account lockout after 5 failed attempts.",
        "duration": 10,
        "actions": []
    },
    {
        "id": "login-fill",
        "title": "Logging In",
        "url": None,
        "narration": "We log in as Samuel Johnson, a Senior Investigator with 12 active cases. The password is secured with bcrypt hashing.",
        "duration": 6,
        "actions": [
            {"type": "fill", "selector": "input[type='email'], input[placeholder*='email'], input[name='email']", "value": "samuel.johnson@oig.gov"},
            {"type": "fill", "selector": "input[type='password']", "value": "Demo2026!"},
            {"type": "click", "selector": "button[type='submit'], button:has-text('Sign in')"},
            {"type": "wait", "ms": 3000}
        ]
    },
    {
        "id": "dashboard",
        "title": "Dashboard",
        "url": f"{BASE_URL}/dashboard",
        "narration": "The dashboard shows personalized metrics: total cases, active investigations, critical cases, and closed cases. Below are overdue tasks, upcoming deadlines, and unread notifications. The layout is customizable with the gear icon.",
        "duration": 10,
        "actions": []
    },
    {
        "id": "cases",
        "title": "Case List",
        "url": f"{BASE_URL}/dashboard/cases",
        "narration": "The Cases page displays all assigned cases in a sortable, filterable data table. Investigators see only their assigned cases through role-based access control. We can filter by status, type, and priority, or search by case number.",
        "duration": 10,
        "actions": []
    },
    {
        "id": "case-new",
        "title": "Create New Case",
        "url": f"{BASE_URL}/dashboard/cases/new",
        "narration": "Creating a case uses a 3-step wizard. Step 1: enter title and description. Step 2: select case type from 9 options, set priority and due date. Step 3: review and submit. The system auto-generates the case number in OIG-2026 format.",
        "duration": 10,
        "actions": []
    },
    {
        "id": "case-detail",
        "title": "Case Detail",
        "url": None,
        "narration": "Each case has 10 tabs: Overview, Documents, Evidence, Tasks, Subjects, Timeline, Violations, Financial, Techniques, and Referrals. The overview shows description, assignment team, case details, and document counts.",
        "duration": 10,
        "actions": [
            {"type": "goto", "url": f"{BASE_URL}/dashboard/cases"},
            {"type": "wait", "ms": 2000},
            {"type": "click", "selector": "table tbody tr:first-child td:first-child a, table tbody tr:first-child"},
            {"type": "wait", "ms": 2000}
        ]
    },
    {
        "id": "tasks",
        "title": "Task Management",
        "url": f"{BASE_URL}/dashboard/tasks",
        "narration": "Tasks can be viewed as a Kanban board with columns for Pending, In Progress, Blocked, and Completed, or as a sortable table. Overdue tasks show red badges. Tasks can be delegated to other team members with automatic notifications.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "search",
        "title": "Search",
        "url": f"{BASE_URL}/dashboard/search",
        "narration": "The search page powered by MeiliSearch provides full-text search across cases, evidence, tasks, and documents. The advanced panel offers per-field criteria. Press Control-K anywhere for quick search. Searches can be saved for reuse.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "hotline",
        "title": "Public Hotline",
        "url": f"{BASE_URL}/hotline",
        "narration": "The public hotline page requires no login. Anyone can submit a complaint, anonymously or with contact information. Each submission receives an inquiry number. Staff can review and convert inquiries into full investigations.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "whistleblower",
        "title": "Whistleblower Portal",
        "url": f"{BASE_URL}/whistleblower",
        "narration": "The whistleblower form displays legal protections under the Whistleblower Protection Act. Submissions are automatically set to high priority and follow a separate workflow with identity protection measures.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "inquiries",
        "title": "Inquiry Management",
        "url": f"{BASE_URL}/dashboard/inquiries",
        "narration": "Staff manage all incoming inquiries from this page. Each inquiry can be assigned, reviewed, and converted directly into a case with the Convert to Case button, which pre-populates the new case with inquiry data.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "analytics",
        "title": "Analytics Dashboard",
        "url": f"{BASE_URL}/dashboard/analytics",
        "narration": "The analytics dashboard shows interactive charts: cases by status and type, monthly trends, task completion, investigator workload, and financial summary. Key metrics include closure rate, average days to close, and return on investment.",
        "duration": 10,
        "actions": [{"type": "scroll", "y": 400}]
    },
    {
        "id": "financial",
        "title": "Financial Dashboard",
        "url": f"{BASE_URL}/dashboard/financial",
        "narration": "The financial dashboard tracks monetary results: total recoveries, fines, restitution, and cost savings. It calculates investigative costs from time entries and computes return on investment across all cases.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "reports",
        "title": "Reports",
        "url": f"{BASE_URL}/dashboard/reports",
        "narration": "Seven standard report templates are available, including the Semiannual Report to Congress. Reports export as CSV, Excel, or printable PDF. The ad-hoc Report Builder lets users create custom reports without programming.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "training",
        "title": "Training Management",
        "url": f"{BASE_URL}/dashboard/training",
        "narration": "The training module tracks courses, certifications, and compliance. My Training shows completion status and expiration warnings. Courses can be assigned by role, and costs are tracked per user. Annual recurring training is supported.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "timesheets",
        "title": "Time & Labor",
        "url": f"{BASE_URL}/dashboard/timesheets",
        "narration": "Time tracking supports 9 activity types including case work, overtime, and undercover operations. The system calculates Law Enforcement Availability Pay under Title 5. Timesheets go through a submit and approve workflow.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "approvals",
        "title": "Workflow Approvals",
        "url": f"{BASE_URL}/dashboard/approvals",
        "narration": "The approvals page shows workflow steps awaiting action. Five workflow types are supported: Case Intake, Investigation Closure, Evidence Review, Document Approval, and Whistleblower Protection. Supervisors and admins can skip or revert steps.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "audit",
        "title": "Audit Log",
        "url": f"{BASE_URL}/dashboard/audit-log",
        "narration": "The audit log captures every action with timestamps, user names, and field-level change tracking showing old and new values. Over 10,000 entries can be filtered by date, action, and entity type, and exported as CSV.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "users",
        "title": "User Management",
        "url": f"{BASE_URL}/dashboard/users",
        "narration": "Admins manage user accounts: create users, change roles, and disable accounts. The system supports six roles with granular permissions. Field-level access control restricts which fields each role can edit based on case status.",
        "duration": 8,
        "actions": []
    },
    {
        "id": "inventory",
        "title": "Inventory",
        "url": f"{BASE_URL}/dashboard/inventory",
        "narration": "The inventory module tracks evidence items, technical equipment, and law enforcement property. Items are organized by type, status, and assigned agent.",
        "duration": 6,
        "actions": []
    },
    {
        "id": "settings",
        "title": "System Settings",
        "url": f"{BASE_URL}/dashboard/settings",
        "narration": "System settings manage reference data, routing rules, and filing rules. Configurable categories include allegation types, case closure reasons, and investigation techniques.",
        "duration": 6,
        "actions": []
    },
    {
        "id": "closing",
        "title": "Thank You",
        "url": None,
        "narration": "That concludes our demo of the OIG Investigative Tracking System. The system covers case management, evidence chain of custody, document management, workflow approvals, public intake, reporting, training, time tracking, and full audit capabilities. Built by Y Point. Thank you for watching.",
        "duration": 10,
        "overlay": "OIG-ITS Demo Complete\n\nDeveloped by Y Point\n\n95+ API Routes | 20+ Modules\n100/100 Tests Passing"
    },
]


def create_title_frame(text, width=1280, height=720):
    """Create a title card image."""
    img = Image.new("RGB", (width, height), color=(15, 23, 42))  # navy
    draw = ImageDraw.Draw(img)

    # Try to use a nice font, fall back to default
    try:
        font_large = ImageFont.truetype("arial.ttf", 42)
        font_small = ImageFont.truetype("arial.ttf", 22)
    except (OSError, IOError):
        font_large = ImageFont.load_default()
        font_small = font_large

    lines = text.split("\n")
    y_start = height // 2 - (len(lines) * 50) // 2

    for i, line in enumerate(lines):
        font = font_large if i == 0 else font_small
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        x = (width - tw) // 2
        y = y_start + i * 55
        color = (219, 234, 254) if i == 0 else (148, 163, 184)
        draw.text((x, y), line, fill=color, font=font)

    return img


def generate_audio(text, filename):
    """Generate TTS audio file."""
    engine = pyttsx3.init()
    engine.setProperty("rate", 155)  # slightly slower for clarity
    engine.setProperty("volume", 0.9)

    # Try to use a female voice if available
    voices = engine.getProperty("voices")
    for voice in voices:
        if "female" in voice.name.lower() or "zira" in voice.name.lower():
            engine.setProperty("voice", voice.id)
            break

    engine.save_to_file(text, str(filename))
    engine.runAndWait()


def main():
    print("=" * 60)
    print("  OIG-ITS Automated Demo Video Recorder")
    print("=" * 60)
    print()

    # Create directories
    SCREENSHOTS_DIR.mkdir(exist_ok=True)
    AUDIO_DIR.mkdir(exist_ok=True)

    # Step 1: Generate all audio narrations
    print("[1/4] Generating voiceover audio...")
    audio_files = []
    for scene in DEMO_SCENES:
        audio_path = AUDIO_DIR / f"{scene['id']}.wav"
        if not audio_path.exists():
            print(f"  Generating: {scene['id']}...")
            generate_audio(scene["narration"], audio_path)
            time.sleep(0.5)
        audio_files.append(audio_path)
    print(f"  Done: {len(audio_files)} audio clips")

    # Step 2: Capture screenshots with Playwright
    print("\n[2/4] Capturing browser screenshots...")
    print("  Make sure the app is running at http://localhost:3000")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            device_scale_factor=1,
        )
        page = context.new_page()

        # Login first
        print("  Logging in...")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(2)

        for i, scene in enumerate(DEMO_SCENES):
            scene_id = scene["id"]
            print(f"  [{i+1}/{len(DEMO_SCENES)}] {scene['title']}...")

            # Title/overlay frames - create programmatically
            if scene.get("overlay"):
                img = create_title_frame(scene["overlay"])
                img.save(str(SCREENSHOTS_DIR / f"{scene_id}.png"))
                continue

            # Navigate if URL provided
            if scene.get("url"):
                try:
                    page.goto(scene["url"], wait_until="networkidle", timeout=15000)
                except Exception:
                    page.goto(scene["url"], timeout=15000)
                time.sleep(SCREENSHOT_PAUSE)

            # Execute actions
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
                    time.sleep(0.5)
                except Exception as e:
                    print(f"    Action failed: {e}")

            # Take screenshot
            time.sleep(SCREENSHOT_PAUSE)
            page.screenshot(path=str(SCREENSHOTS_DIR / f"{scene_id}.png"))

        browser.close()

    print(f"  Done: {len(DEMO_SCENES)} screenshots")

    # Step 3: Add caption overlay to screenshots
    print("\n[3/4] Adding captions to screenshots...")
    for scene in DEMO_SCENES:
        scene_id = scene["id"]
        img_path = SCREENSHOTS_DIR / f"{scene_id}.png"
        if not img_path.exists():
            continue

        img = Image.open(img_path)
        draw = ImageDraw.Draw(img)

        # Add title bar at top
        try:
            font_title = ImageFont.truetype("arial.ttf", 20)
            font_caption = ImageFont.truetype("arial.ttf", 14)
        except (OSError, IOError):
            font_title = ImageFont.load_default()
            font_caption = font_title

        # Semi-transparent top bar
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle([(0, 0), (1280, 40)], fill=(15, 23, 42, 200))
        overlay_draw.rectangle([(0, 680), (1280, 720)], fill=(15, 23, 42, 180))
        img = img.convert("RGBA")
        img = Image.alpha_composite(img, overlay)

        draw = ImageDraw.Draw(img)
        draw.text((15, 10), f"OIG-ITS Demo — {scene['title']}", fill=(219, 234, 254), font=font_title)

        # Bottom caption (truncated narration)
        caption = scene["narration"][:120] + ("..." if len(scene["narration"]) > 120 else "")
        draw.text((15, 692), caption, fill=(148, 163, 184), font=font_caption)

        img = img.convert("RGB")
        img.save(str(SCREENSHOTS_DIR / f"{scene_id}_captioned.png"))

    print("  Done")

    # Step 4: Assemble video
    print("\n[4/4] Assembling video...")
    output_path = OUTPUT_DIR / "oig-its-demo.mp4"

    writer = imageio.get_writer(str(output_path), fps=FPS, codec="libx264",
                                 quality=8, pixelformat="yuv420p")

    for scene in DEMO_SCENES:
        scene_id = scene["id"]
        img_path = SCREENSHOTS_DIR / f"{scene_id}_captioned.png"
        if not img_path.exists():
            img_path = SCREENSHOTS_DIR / f"{scene_id}.png"
        if not img_path.exists():
            continue

        img = imageio.imread(str(img_path))
        num_frames = int(scene["duration"] * FPS)
        for _ in range(num_frames):
            writer.append_data(img)

    writer.close()

    total_duration = sum(s["duration"] for s in DEMO_SCENES)
    print(f"\n{'=' * 60}")
    print(f"  Video created: {output_path}")
    print(f"  Duration: {total_duration // 60}:{total_duration % 60:02d}")
    print(f"  Scenes: {len(DEMO_SCENES)}")
    print(f"  Audio clips: {len(audio_files)} (in demo/audio/)")
    print(f"{'=' * 60}")
    print(f"\nTo play: open {output_path}")
    print(f"\nNote: Audio narration is in demo/audio/ as separate WAV files.")
    print(f"To combine video + audio, use:")
    print(f"  ffmpeg -i demo/oig-its-demo.mp4 -i demo/audio/combined.wav -c:v copy -c:a aac -shortest demo/oig-its-demo-final.mp4")


if __name__ == "__main__":
    main()
