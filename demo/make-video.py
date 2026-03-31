"""Build synced demo video. Each scene: screenshot -> audio -> clip -> verify -> concat."""
import wave, time, subprocess, sys, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import imageio.v2 as imageio
import imageio_ffmpeg
import pyttsx3

BASE = "http://localhost:3000"
DIR = Path("demo/scenes")
OUT = Path("demo")
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 2
DIR.mkdir(exist_ok=True)

# Clean old clips
for f in DIR.glob("*_clip.mp4"):
    f.unlink()

SCENES = [
    ("01", "title", None, "Welcome to the OPM Office of Inspector General Investigative Tracking System. This system manages fraud, waste, abuse, and misconduct investigations.",
     "OIG-ITS\nInvestigative Tracking System\n\nOPM Office of Inspector General\n\nDeveloped by Y Point"),
    ("02", "Login Page", "/login", "The secure login page. Six user roles: Administrator, Supervisor, Investigator, Analyst, Auditor, and Read-Only. Security includes session timeout and account lockout.", None),
    ("03", "Login Credentials", "/login", "Logging in as Special Agent Samuel Johnson from the Fraud and Financial Crimes division.", None,
     [("fill", "input[placeholder*='oig.gov']", "samuel.johnson@oig.gov"), ("fill", "input[type='password']", "Demo2026!")]),
    ("04", "Dashboard", "/dashboard", "The personalized dashboard. Total cases, active investigations, critical cases, and closed cases at top. Overdue tasks, deadlines, and notifications below.", None),
    ("05", "Dashboard Scroll", "/dashboard", "Recent cases with direct links, upcoming deadlines, and latest notifications. The layout is customizable.", None,
     [("scroll", 350)]),
    ("06", "Case List", "/dashboard/cases", "The case queue. Sortable and filterable. Investigators see only their assigned cases through role-based access control.", None),
    ("07", "Create Case", "/dashboard/cases/new", "Creating a new investigation. Three-step wizard for title, classification, and review. Auto-generated case number.", None),
    ("08", "Case Detail", "CLICK_CASE", "Case detail with ten tabs. Overview shows description, team assignments, jurisdiction, dates, and document counts.", None),
    ("09", "Evidence", "/dashboard/evidence", "Evidence management. Eight types with automatic exhibit numbering. Immutable chain of custody.", None),
    ("10", "Documents", "/dashboard/documents", "Document management. Thirty file formats, version control, supervisory approval, and nineteen auto-populated templates.", None),
    ("11", "Subjects", "/dashboard/subjects", "Subject tracking. Individuals, organizations, and vendors linked to cases with specific roles.", None),
    ("12", "Tasks", "/dashboard/tasks", "Task management. Kanban board and table view. Overdue tasks flagged. Task delegation with notifications.", None),
    ("13", "Approvals", "/dashboard/approvals", "Workflow approvals. Five types: case intake, closure, evidence review, document approval, and whistleblower protection.", None),
    ("14", "Hotline", "/hotline", "Public hotline. No login required. Anonymous complaints accepted. Unique inquiry number returned.", None),
    ("15", "Whistleblower", "/whistleblower", "Whistleblower portal. Legal protections under the Whistleblower Protection Act. High priority by default.", None),
    ("16", "Inquiries", "/dashboard/inquiries", "Inquiry management. Review submissions, assign investigators, and convert to full investigation cases.", None),
    ("17", "Search", "/dashboard/search", "Full-text search across cases, evidence, tasks, and documents. Advanced filters and saved searches.", None),
    ("18", "Analytics", "/dashboard/analytics", "Analytics. Cases by status and type, monthly trends, closure rates, workload rankings, and financial ROI.", None),
    ("19", "Analytics Scroll", "/dashboard/analytics", "Task completion metrics, evidence trends, and recent activity. All data is role-filtered.", None,
     [("scroll", 400)]),
    ("20", "Financial", "/dashboard/financial", "Financial tracking. Recoveries, fines, restitution, savings. Return on investment from investigative hours.", None),
    ("21", "Reports", "/dashboard/reports", "Seven standard reports including the Semiannual Report to Congress. CSV, Excel, and PDF export.", None),
    ("22", "Training", "/dashboard/training", "Training management. Course catalog, compliance tracking, expiration alerts, and cost tracking.", None),
    ("23", "Timesheets", "/dashboard/timesheets", "Time tracking. Nine activity types. Availability pay under Title 5. Supervisor approval workflow.", None),
    ("24", "Audit Log", "/dashboard/audit-log", "Complete audit trail. Every action logged with field-level change tracking. Exportable as CSV.", None),
    ("25", "Users", "/dashboard/users", "User management. Six roles with granular permissions. Field-level access control by case status.", None),
    ("26", "Settings", "/dashboard/settings", "System settings. Reference data, routing rules, filing rules, and configurable field labels.", None),
    ("27", "close", None, "The OIG Investigative Tracking System. Complete lifecycle management. Evidence custody. Document versioning. Workflows. Whistleblower protections. Full audit trail. Developed by Y Point. Thank you.",
     "OIG-ITS\nInvestigative Tracking System\n\n95+ API Routes | 20+ Modules\n100/100 Tests Passing\n\nDeveloped by Y Point"),
]

def make_title(text):
    img = Image.new("RGB", (1280, 720), (15, 23, 42))
    d = ImageDraw.Draw(img)
    try: fl = ImageFont.truetype("arial.ttf", 42); fs = ImageFont.truetype("arial.ttf", 22)
    except: fl = fs = ImageFont.load_default()
    lines = text.split("\n")
    y = 360 - len(lines) * 24
    for i, ln in enumerate(lines):
        f = fl if i == 0 else fs
        bb = d.textbbox((0, 0), ln, font=f)
        d.text(((1280 - bb[2] + bb[0]) // 2, y + i * 48), ln,
               fill=(219, 234, 254) if i == 0 else (148, 163, 184), font=f)
    try:
        logo = ImageOps.invert(Image.open("Logo/Logo_YPoint_black.png").convert("RGB"))
        img.paste(logo.resize((70, 52)), (605, 660))
    except: pass
    return img

def add_bar(path, title, voice):
    img = Image.open(path).convert("RGBA")
    try: ft = ImageFont.truetype("arial.ttf", 16); fc = ImageFont.truetype("arial.ttf", 11)
    except: ft = fc = ImageFont.load_default()
    ov = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rectangle([(0, 0), (1280, 36)], fill=(15, 23, 42, 220))
    d.rectangle([(0, 684), (1280, 720)], fill=(15, 23, 42, 210))
    img = Image.alpha_composite(img, ov)
    d2 = ImageDraw.Draw(img)
    d2.text((12, 8), f"OIG-ITS  |  {title}", fill=(219, 234, 254), font=ft)
    d2.text((12, 696), voice[:160] + ("..." if len(voice) > 160 else ""), fill=(148, 163, 184), font=fc)
    return img.convert("RGB")

def gen_audio(text, path):
    e = pyttsx3.init()
    e.setProperty("rate", 165)
    e.setProperty("volume", 1.0)
    for v in e.getProperty("voices"):
        if "david" in v.name.lower():
            e.setProperty("voice", v.id); break
    e.save_to_file(text, str(path))
    e.runAndWait()
    del e

def get_dur(path):
    w = wave.open(str(path), "rb")
    d = w.getnframes() / w.getframerate()
    w.close()
    return d

def make_clip(sid, img_path, wav_path, clip_path):
    dur = get_dur(wav_path) + 1.0
    # Write video frames
    tv = DIR / f"{sid}_tv.mp4"
    wr = imageio.get_writer(str(tv), fps=FPS, codec="libx264", quality=8, pixelformat="yuv420p")
    img = imageio.imread(str(img_path))
    for _ in range(max(int(dur * FPS), 2)):
        wr.append_data(img)
    wr.close()
    # Pad audio
    w = wave.open(str(wav_path), "rb")
    pr = w.getparams(); sr, sw, ch = pr.framerate, pr.sampwidth, pr.nchannels
    data = w.readframes(w.getnframes()); adur = w.getnframes() / sr; w.close()
    ta = DIR / f"{sid}_ta.wav"
    ww = wave.open(str(ta), "wb"); ww.setparams(pr)
    ww.writeframes(data)
    pad = max(0, dur - adur)
    if pad > 0: ww.writeframes(b"\x00" * int(pad * sr * sw * ch))
    ww.close()
    # Merge
    subprocess.run([FF, "-y", "-i", str(tv), "-i", str(ta), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(clip_path)], capture_output=True)
    tv.unlink(missing_ok=True); ta.unlink(missing_ok=True)
    return dur

print("=" * 50)
print("  OIG-ITS Demo Builder")
print(f"  {len(SCENES)} scenes")
print("=" * 50)

# STEP 1: Screenshots
print("\n[1/4] Screenshots...")
from playwright.sync_api import sync_playwright
pw = sync_playwright().start()
br = pw.chromium.launch(headless=True)
ctx = br.new_context(viewport={"width": 1280, "height": 720})
pg = ctx.new_page()

# Login
pg.goto(f"{BASE}/login", timeout=15000); time.sleep(3)
pg.fill('input[placeholder*="oig.gov"]', "samuel.johnson@oig.gov")
pg.fill('input[type="password"]', "Demo2026!")
pg.click('button[type="submit"]'); time.sleep(5)

for scene in SCENES:
    sid = scene[0]
    title = scene[1]
    url = scene[2]
    voice = scene[3]
    overlay = scene[4] if len(scene) > 4 else None
    actions = scene[5] if len(scene) > 5 else []

    img_path = DIR / f"{sid}.png"
    print(f"  {sid} {title}")

    if overlay:
        make_title(overlay).save(str(img_path))
        continue

    if url == "CLICK_CASE":
        pg.goto(f"{BASE}/dashboard/cases", timeout=15000); time.sleep(2)
        try: pg.click("table tbody tr:first-child td a", timeout=5000)
        except:
            try: pg.click("table tbody tr:first-child", timeout=3000)
            except: pass
        time.sleep(3)
    elif url:
        try: pg.goto(f"{BASE}{url}", wait_until="networkidle", timeout=15000)
        except:
            try: pg.goto(f"{BASE}{url}", timeout=10000)
            except: pass
        time.sleep(2)

    for act in actions:
        try:
            if act[0] == "fill": pg.fill(act[1], act[2])
            elif act[0] == "scroll": pg.evaluate(f"window.scrollBy(0,{act[1]})")
            time.sleep(0.3)
        except: pass

    time.sleep(1)
    try: pg.screenshot(path=str(img_path), timeout=30000)
    except: make_title(title).save(str(img_path))

    # Add caption bar (not for overlays)
    if not overlay:
        captioned = add_bar(img_path, title, voice)
        captioned.save(str(img_path))

br.close(); pw.stop()

# VERIFY: Check each screenshot is different
print("\n  Verifying screenshots...")
from PIL import Image as PILImage
prev_hash = None
ok = 0
for scene in SCENES:
    img_path = DIR / f"{scene[0]}.png"
    if img_path.exists():
        img = PILImage.open(img_path)
        h = hash(img.tobytes()[:10000])
        if h == prev_hash:
            print(f"    WARNING: {scene[0]} same as previous!")
        else:
            ok += 1
        prev_hash = h
print(f"  {ok}/{len(SCENES)} unique screenshots")

# STEP 2: Audio
print("\n[2/4] Audio...")
for scene in SCENES:
    sid = scene[0]
    voice = scene[3]
    wav = DIR / f"{sid}.wav"
    if not wav.exists():
        print(f"  {sid}")
        gen_audio(voice, wav)
        time.sleep(0.2)
print("  Done")

# STEP 3: Clips
print("\n[3/4] Building clips...")
clips = []
total = 0
for scene in SCENES:
    sid = scene[0]
    clip = DIR / f"{sid}_clip.mp4"
    dur = make_clip(sid, DIR / f"{sid}.png", DIR / f"{sid}.wav", clip)
    clips.append(clip)
    total += dur
    print(f"  {sid}: {dur:.1f}s")
print(f"  Total: {int(total)//60}:{int(total)%60:02d}")

# STEP 4: Concat
print("\n[4/4] Concatenating...")
cl = DIR / "list.txt"
with open(cl, "w") as f:
    for c in clips:
        f.write(f"file '{c.resolve()}'\n")

final = OUT / "oig-its-demo-final.mp4"
r = subprocess.run([FF, "-y", "-f", "concat", "-safe", "0", "-i", str(cl),
                    "-c:v", "libx264", "-preset", "fast", "-c:a", "aac", "-b:a", "192k",
                    str(final)], capture_output=True)

if final.exists():
    sz = final.stat().st_size / 1024 / 1024
    print(f"\n{'='*50}")
    print(f"  DONE: {final}")
    print(f"  Size: {sz:.1f} MB")
    print(f"  Duration: {int(total)//60}:{int(total)%60:02d}")
    print(f"  Scenes: {len(SCENES)}")
    print(f"{'='*50}")
else:
    print(f"  ERROR: {r.stderr.decode()[-200:]}")

# Cleanup
for f in DIR.glob("*_clip.mp4"): f.unlink(missing_ok=True)
for f in DIR.glob("list.txt"): f.unlink(missing_ok=True)
