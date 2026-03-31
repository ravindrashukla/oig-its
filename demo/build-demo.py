"""
OIG-ITS Demo — Per-Scene Synced Build
Each scene: take screenshot -> generate audio -> combine at exact audio length.
"""
import wave, time, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import imageio.v2 as imageio
import imageio_ffmpeg

BASE = "http://localhost:3000"
OUT = Path("demo")
DIR = OUT / "scenes"
DIR.mkdir(exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 2

CATEGORIES = [
    # Category 1: Introduction & Login
    {"category": "Introduction & Login", "scenes": [
        {"id": "01_title", "overlay": "OIG-ITS\nInvestigative Tracking System\n\nOPM Office of Inspector General\n\nDeveloped by Y Point",
         "voice": "Welcome to the OPM Office of Inspector General Investigative Tracking System. This system manages fraud, waste, abuse, and misconduct investigations."},
        {"id": "02_login", "url": f"{BASE}/login",
         "voice": "The login page. Six user roles are supported: Administrator, Supervisor, Investigator, Analyst, Auditor, and Read-Only. Security includes session timeout and account lockout."},
        {"id": "03_login_creds", "url": f"{BASE}/login",
         "voice": "Logging in as Special Agent Samuel Johnson. The system uses bcrypt password hashing and eight-hour session expiry.",
         "actions": [("fill", "input[placeholder*='oig.gov']", "samuel.johnson@oig.gov"), ("fill", "input[type='password']", "Demo2026!")]},
    ]},
    # Category 2: Dashboard
    {"category": "Dashboard", "scenes": [
        {"id": "04_dashboard", "url": f"{BASE}/dashboard",
         "voice": "The dashboard. Four primary metrics at top: total cases, active, critical, and closed. Below: overdue tasks, deadlines, and notifications."},
        {"id": "05_dash_lower", "url": f"{BASE}/dashboard",
         "voice": "Cases by status, recent cases with direct links, upcoming deadlines, and latest notifications. The layout is user-customizable.",
         "actions": [("scroll", 350)]},
    ]},
    # Category 3: Case Management
    {"category": "Case Management", "scenes": [
        {"id": "06_cases", "url": f"{BASE}/dashboard/cases",
         "voice": "The case list. Sortable, filterable data table. Investigators see only assigned cases. Filter by status, type, and priority."},
        {"id": "07_newcase", "url": f"{BASE}/dashboard/cases/new",
         "voice": "Creating a new case. Three-step wizard: title, classification, and review. The system auto-generates the case number."},
        {"id": "08_casedetail", "url": None,
         "voice": "Case detail view with ten tabs. Overview shows description, team assignments, jurisdiction, dates, and document counts.",
         "nav_to_case": True},
        {"id": "09_case_lower", "url": None,
         "voice": "The sidebar shows case type, priority, opened date, due date, complaint source, and lead agency.",
         "actions": [("scroll", 300)]},
    ]},
    # Category 4: Evidence & Documents
    {"category": "Evidence & Documents", "scenes": [
        {"id": "10_evidence", "url": f"{BASE}/dashboard/evidence",
         "voice": "Evidence management. Eight types with automatic exhibit numbering. Chain of custody is immutable — every transfer is permanently recorded."},
        {"id": "11_documents", "url": f"{BASE}/dashboard/documents",
         "voice": "Document management. Thirty file formats, version control, supervisory approval, and nineteen auto-populated templates."},
    ]},
    # Category 5: Subjects & Violations
    {"category": "Subjects & Violations", "scenes": [
        {"id": "12_subjects", "url": f"{BASE}/dashboard/subjects",
         "voice": "Subject tracking. Individuals, organizations, and vendors linked to cases. Roles include complainant, respondent, witness, and subject of interest."},
    ]},
    # Category 6: Tasks & Workflows
    {"category": "Tasks & Workflows", "scenes": [
        {"id": "13_tasks", "url": f"{BASE}/dashboard/tasks",
         "voice": "Task management. Kanban board and table view. Overdue tasks flagged in red. Tasks can be delegated with automatic notifications."},
        {"id": "14_approvals", "url": f"{BASE}/dashboard/approvals",
         "voice": "Workflow approvals. Five workflow types: case intake, closure, evidence review, document approval, and whistleblower protection."},
    ]},
    # Category 7: Hotline & Whistleblower
    {"category": "Hotline & Whistleblower", "scenes": [
        {"id": "15_hotline", "url": f"{BASE}/hotline",
         "voice": "The public hotline. No login required. Anonymous complaints accepted. Each submission gets a unique inquiry number."},
        {"id": "16_whistle", "url": f"{BASE}/whistleblower",
         "voice": "Whistleblower portal. Legal protections under the Whistleblower Protection Act displayed prominently. High priority by default."},
        {"id": "17_inquiries", "url": f"{BASE}/dashboard/inquiries",
         "voice": "Inquiry management. Staff review submissions, assign investigators, and convert inquiries into full investigation cases."},
    ]},
    # Category 8: Search
    {"category": "Search", "scenes": [
        {"id": "18_search", "url": f"{BASE}/dashboard/search",
         "voice": "Full-text search. Cases, evidence, tasks, and documents indexed. Advanced filters, date ranges, and saved searches."},
    ]},
    # Category 9: Analytics & Reports
    {"category": "Analytics & Reports", "scenes": [
        {"id": "19_analytics", "url": f"{BASE}/dashboard/analytics",
         "voice": "Analytics. Cases by status and type, monthly trends, closure rate, investigator workload, and financial return on investment."},
        {"id": "20_financial", "url": f"{BASE}/dashboard/financial",
         "voice": "Financial dashboard. Recoveries, fines, restitution, and savings. ROI calculated from investigative hours."},
        {"id": "21_reports", "url": f"{BASE}/dashboard/reports",
         "voice": "Seven standard reports including the Semiannual Report to Congress. Export as CSV, Excel, or PDF. Ad-hoc report builder included."},
    ]},
    # Category 10: Training & Time
    {"category": "Training & Time", "scenes": [
        {"id": "22_training", "url": f"{BASE}/dashboard/training",
         "voice": "Training management. Course catalog, compliance tracking, expiration alerts, evaluations, and cost tracking."},
        {"id": "23_timesheets", "url": f"{BASE}/dashboard/timesheets",
         "voice": "Time tracking. Nine activity types. Availability pay under Title 5. Timesheet approval workflow."},
    ]},
    # Category 11: Admin & Audit
    {"category": "Administration", "scenes": [
        {"id": "24_audit", "url": f"{BASE}/dashboard/audit-log",
         "voice": "Audit log. Every action recorded with field-level change tracking. Filterable and exportable as CSV."},
        {"id": "25_users", "url": f"{BASE}/dashboard/users",
         "voice": "User management. Six roles, granular permissions, field-level access control by case status."},
        {"id": "26_settings", "url": f"{BASE}/dashboard/settings",
         "voice": "System settings. Reference data, routing rules, filing rules, and configurable field labels."},
    ]},
    # Category 12: Closing
    {"category": "Closing", "scenes": [
        {"id": "27_close", "overlay": "OIG-ITS\nInvestigative Tracking System\n\n95+ API Routes | 20+ Modules\n100/100 Tests Passing\n\nDeveloped by Y Point",
         "voice": "The OIG Investigative Tracking System. Complete investigation lifecycle management with full audit trail. Developed by Y Point. Thank you."},
    ]},
]

def make_title(text, w=1280, h=720):
    img = Image.new("RGB", (w, h), (15, 23, 42))
    d = ImageDraw.Draw(img)
    try: fl = ImageFont.truetype("arial.ttf", 42); fs = ImageFont.truetype("arial.ttf", 22)
    except: fl = fs = ImageFont.load_default()
    lines = text.split("\n")
    y = h//2 - len(lines)*48//2
    for i, ln in enumerate(lines):
        f = fl if i == 0 else fs
        bb = d.textbbox((0,0), ln, font=f); tw = bb[2]-bb[0]
        d.text(((w-tw)//2, y+i*48), ln, fill=(219,234,254) if i==0 else (148,163,184), font=f)
    try:
        logo = Image.open("Logo/Logo_YPoint_black.png").convert("RGB")
        logo = ImageOps.invert(logo).resize((70,52), Image.LANCZOS)
        img.paste(logo, (w//2-35, h-70))
    except: pass
    return img

def add_bar(img_path, cat, voice):
    img = Image.open(img_path).convert("RGBA")
    try: ft = ImageFont.truetype("arial.ttf", 16); fc = ImageFont.truetype("arial.ttf", 11)
    except: ft = fc = ImageFont.load_default()
    ov = Image.new("RGBA", img.size, (0,0,0,0))
    d = ImageDraw.Draw(ov)
    d.rectangle([(0,0),(1280,36)], fill=(15,23,42,220))
    d.rectangle([(0,682),(1280,720)], fill=(15,23,42,210))
    img = Image.alpha_composite(img, ov)
    d2 = ImageDraw.Draw(img)
    d2.text((12,8), f"OIG-ITS  |  {cat}", fill=(219,234,254), font=ft)
    d2.text((12,695), voice[:160]+("..." if len(voice)>160 else ""), fill=(148,163,184), font=fc)
    return img.convert("RGB")

def tts_to_file(text, path):
    """Generate TTS audio. Uses a fresh engine each time to avoid hangs."""
    import pyttsx3
    e = pyttsx3.init()
    e.setProperty("rate", 165)
    e.setProperty("volume", 1.0)
    for v in e.getProperty("voices"):
        if "david" in v.name.lower():
            e.setProperty("voice", v.id); break
    e.save_to_file(text, str(path))
    e.runAndWait()
    del e

def audio_duration(path):
    w = wave.open(str(path), "rb")
    d = w.getnframes() / w.getframerate()
    w.close()
    return d

def scene_to_clip(scene_id, img_path, wav_path, clip_path):
    """Create a single synced clip: image shown for exactly audio duration + 1s."""
    dur = audio_duration(wav_path) + 1.0
    frames = max(int(dur * FPS), 2)

    # Write video
    tmp_v = DIR / f"{scene_id}_v.mp4"
    w = imageio.get_writer(str(tmp_v), fps=FPS, codec="libx264", quality=8, pixelformat="yuv420p")
    img = imageio.imread(str(img_path))
    for _ in range(frames):
        w.append_data(img)
    w.close()

    # Pad audio to match video duration
    orig = wave.open(str(wav_path), "rb")
    params = orig.getparams()
    sr, sw, ch = params.framerate, params.sampwidth, params.nchannels
    data = orig.readframes(orig.getnframes())
    adur = orig.getnframes() / sr
    orig.close()

    tmp_a = DIR / f"{scene_id}_a.wav"
    padded = wave.open(str(tmp_a), "wb")
    padded.setparams(params)
    padded.writeframes(data)
    pad = max(0, dur - adur)
    if pad > 0:
        padded.writeframes(b"\x00" * int(pad * sr * sw * ch))
    padded.close()

    # Merge with ffmpeg
    subprocess.run([FF, "-y", "-i", str(tmp_v), "-i", str(tmp_a),
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    str(clip_path)], capture_output=True)

    # Cleanup temp
    tmp_v.unlink(missing_ok=True)
    tmp_a.unlink(missing_ok=True)

    return dur

def main():
    from playwright.sync_api import sync_playwright

    print("="*55)
    print("  OIG-ITS Demo — Per-Scene Synced Build")
    print("="*55)

    # Step 1: Take screenshots + generate audio per scene
    all_scenes = []
    for cat in CATEGORIES:
        for s in cat["scenes"]:
            all_scenes.append((cat["category"], s))

    print(f"\n  {len(all_scenes)} scenes across {len(CATEGORIES)} categories\n")

    # Launch browser
    print("[1] Capturing screenshots...")
    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 720})
    page = ctx.new_page()

    # Navigate to login first
    page.goto(f"{BASE}/login", timeout=30000)
    time.sleep(2)

    for i, (cat, scene) in enumerate(all_scenes):
        sid = scene["id"]
        img_path = DIR / f"{sid}.png"

        print(f"  [{i+1}/{len(all_scenes)}] {sid} ({cat})")

        if scene.get("overlay"):
            make_title(scene["overlay"]).save(str(img_path))
        else:
            if scene.get("nav_to_case"):
                page.goto(f"{BASE}/dashboard/cases", timeout=15000)
                time.sleep(2)
                try:
                    page.click("table tbody tr:first-child td a", timeout=5000)
                except:
                    try: page.click("table tbody tr:first-child", timeout=3000)
                    except: pass
                time.sleep(2)
            elif scene.get("url"):
                try: page.goto(scene["url"], wait_until="networkidle", timeout=15000)
                except:
                    try: page.goto(scene["url"], timeout=10000)
                    except: pass
                time.sleep(2)

            for act in scene.get("actions", []):
                try:
                    if act[0] == "fill": page.fill(act[1], act[2])
                    elif act[0] == "scroll": page.evaluate(f"window.scrollBy(0,{act[1]})")
                    elif act[0] == "wait": time.sleep(act[1]/1000)
                    time.sleep(0.3)
                except: pass

            time.sleep(1)
            try: page.screenshot(path=str(img_path), timeout=60000)
            except:
                make_title(f"{cat}\n{sid}").save(str(img_path))

        # Add caption bar
        if not scene.get("overlay"):
            captioned = add_bar(img_path, cat, scene["voice"])
            captioned.save(str(img_path))

    browser.close()
    pw.stop()
    print("  Screenshots done\n")

    # Step 2: Generate audio per scene
    print("[2] Generating audio...")
    for i, (cat, scene) in enumerate(all_scenes):
        sid = scene["id"]
        wav_path = DIR / f"{sid}.wav"
        if not wav_path.exists():
            print(f"  [{i+1}/{len(all_scenes)}] {sid}")
            tts_to_file(scene["voice"], wav_path)
            time.sleep(0.2)
    print("  Audio done\n")

    # Step 3: Build per-scene clips
    print("[3] Building per-scene clips...")
    clip_paths = []
    total_dur = 0
    for i, (cat, scene) in enumerate(all_scenes):
        sid = scene["id"]
        img_path = DIR / f"{sid}.png"
        wav_path = DIR / f"{sid}.wav"
        clip_path = DIR / f"{sid}_clip.mp4"

        dur = scene_to_clip(sid, img_path, wav_path, clip_path)
        clip_paths.append(clip_path)
        total_dur += dur
        print(f"  [{i+1}/{len(all_scenes)}] {sid}: {dur:.1f}s")

    print(f"  Total: {int(total_dur)//60}:{int(total_dur)%60:02d}\n")

    # Step 4: Concatenate all clips
    print("[4] Concatenating...")
    concat_list = DIR / "concat.txt"
    with open(concat_list, "w") as f:
        for cp in clip_paths:
            f.write(f"file '{cp.name}'\n")

    final = OUT / "oig-its-demo-final.mp4"
    r = subprocess.run([FF, "-y", "-f", "concat", "-safe", "0",
                        "-i", str(concat_list), "-c", "copy", str(final)],
                       capture_output=True, cwd=str(DIR))

    if r.returncode != 0:
        print(f"  Concat failed, trying re-encode...")
        # Re-encode approach
        r = subprocess.run([FF, "-y", "-f", "concat", "-safe", "0",
                            "-i", str(concat_list),
                            "-c:v", "libx264", "-c:a", "aac",
                            "-b:a", "192k", str(final)],
                           capture_output=True, cwd=str(DIR))

    if final.exists():
        sz = final.stat().st_size / 1024 / 1024
        print(f"\n{'='*55}")
        print(f"  DONE: {final}")
        print(f"  Size: {sz:.1f} MB")
        print(f"  Duration: {int(total_dur)//60}:{int(total_dur)%60:02d}")
        print(f"  Scenes: {len(all_scenes)}")
        print(f"  Audio synced per-scene")
        print(f"{'='*55}")
    else:
        print("  ERROR: Final video not created")

if __name__ == "__main__":
    main()
