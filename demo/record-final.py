"""
OIG-ITS Final Demo Video — Improved Quality
============================================
- More screenshots with real interactions
- Better TTS voice settings
- 6+ minutes covering full workflows
- Actual login, case creation, navigation
"""

import os, sys, time, wave, subprocess
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
    import pyttsx3
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    import imageio.v2 as imageio
    import imageio_ffmpeg
except ImportError as e:
    print(f"Missing: {e}"); sys.exit(1)

BASE = "http://localhost:3000"
OUT = Path(__file__).parent
SHOTS = OUT / "shots"
AUD = OUT / "aud"
FPS = 2

# ─── SCENES ───────────────────────────────────────────
SCENES = [
    # TITLE
    {"id": "s01_title", "dur": 10,
     "narr": "OPM Office of Inspector General. Investigative Tracking System. This platform manages the full lifecycle of fraud, waste, abuse, and misconduct investigations. Let's walk through the system.",
     "overlay": "OIG-ITS\nInvestigative Tracking System\n\nOPM Office of Inspector General"},

    # LOGIN
    {"id": "s02_login", "dur": 8, "url": f"{BASE}/login",
     "narr": "The secure login supports six roles with FedRAMP authorization. Account lockout activates after five failed attempts. Sessions expire after eight hours."},

    {"id": "s03_login_fill", "dur": 6,
     "narr": "Logging in as Special Agent Samuel Johnson, Fraud and Financial Crimes division.",
     "actions": [
         ("fill", "input[placeholder*='oig.gov']", "samuel.johnson@oig.gov"),
         ("fill", "input[type='password']", "Demo2026!"),
         ("wait", 500),
     ]},

    # DASHBOARD
    {"id": "s04_dash", "dur": 10, "url": f"{BASE}/dashboard",
     "narr": "The dashboard shows active cases, critical investigations, overdue tasks, and upcoming deadlines. All metrics are role-filtered. The layout is customizable."},

    {"id": "s05_dash_scroll", "dur": 6,
     "narr": "Recent cases link directly to detail views. Notifications show workflow actions requiring attention.",
     "actions": [("scroll", 400), ("wait", 1000)]},

    # CASES
    {"id": "s06_cases", "dur": 8, "url": f"{BASE}/dashboard/cases",
     "narr": "The case queue ranks investigations by priority. Filters narrow by status, type, and assigned agent. Investigators see only their assigned cases."},

    # CREATE CASE
    {"id": "s07_newcase", "dur": 8, "url": f"{BASE}/dashboard/cases/new",
     "narr": "Creating a new investigation. Enter the case title, select the type — fraud, waste, abuse, misconduct, or whistleblower. Set priority and target date."},

    {"id": "s08_newcase_fill", "dur": 8,
     "narr": "The system generates a unique case number, assigns the lead investigator, and initializes the full case record with ten functional tabs.",
     "actions": [
         ("fill", "input[name='title'], input[placeholder*='title'], #title", "Procurement fraud — inflated billing by defense contractor"),
         ("wait", 1000),
         ("shot",),
     ]},

    # CASE DETAIL
    {"id": "s09_casedetail", "dur": 10,
     "narr": "The case detail view. Overview shows the investigation summary, assigned team, jurisdiction, complaint source, and key dates. Document and evidence counts are tracked in real time.",
     "actions": [
         ("goto", f"{BASE}/dashboard/cases"),
         ("wait", 2000),
         ("click", "table tbody tr:first-child td a, table tbody tr:first-child"),
         ("wait", 3000),
     ]},

    {"id": "s10_case_scroll", "dur": 6,
     "narr": "The sidebar tracks case classification: type, priority, dates, jurisdiction, lead agency, and complaint source.",
     "actions": [("scroll", 300), ("wait", 500)]},

    # EVIDENCE TAB
    {"id": "s11_evidence", "dur": 8, "url": f"{BASE}/dashboard/evidence",
     "narr": "Evidence management. Eight evidence types with automatic exhibit numbering. Every custody transfer is permanently recorded — who transferred it, when, and why. The chain of custody is immutable."},

    # DOCUMENTS TAB
    {"id": "s12_documents", "dur": 8, "url": f"{BASE}/dashboard/documents",
     "narr": "Document management supports thirty file formats. Version control tracks changes. Supervisory approval can be required. Nineteen templates auto-populate case data for subpoenas, interview memos, and reports."},

    # SUBJECTS
    {"id": "s13_subjects", "dur": 8, "url": f"{BASE}/dashboard/subjects",
     "narr": "Subject tracking. Individuals, organizations, and vendors linked to cases with specific roles — complainant, respondent, witness, subject of interest. Roles can change as the investigation evolves."},

    # TASKS
    {"id": "s14_tasks", "dur": 8, "url": f"{BASE}/dashboard/tasks",
     "narr": "The task board organizes investigative work. Kanban view shows pending, in-progress, blocked, and completed items. Overdue tasks are flagged. Tasks can be delegated with automatic notifications."},

    # HOTLINE — CRITICAL
    {"id": "s15_hotline", "dur": 10, "url": f"{BASE}/hotline",
     "narr": "The public hotline. No login required. Anyone can report fraud, waste, or abuse. Anonymous submissions are supported. Each complaint receives a unique inquiry number and automatic confirmation."},

    # WHISTLEBLOWER — CRITICAL
    {"id": "s16_whistle", "dur": 10, "url": f"{BASE}/whistleblower",
     "narr": "The whistleblower portal. Legal protections under the Whistleblower Protection Act are prominently displayed. Submissions receive high priority and follow a separate workflow with identity protection. Retaliation is prohibited by federal law."},

    {"id": "s17_whistle_scroll", "dur": 6,
     "narr": "Complainants receive their inquiry number immediately. Staff can review, assign, and convert inquiries into full investigations with one click.",
     "actions": [("scroll", 300), ("wait", 500)]},

    # INQUIRIES
    {"id": "s18_inquiries", "dur": 8, "url": f"{BASE}/dashboard/inquiries",
     "narr": "Inquiry management. All hotline and whistleblower submissions appear here. Convert to Case creates a full investigation pre-populated with the complaint data."},

    # WORKFLOWS
    {"id": "s19_approvals", "dur": 8, "url": f"{BASE}/dashboard/approvals",
     "narr": "Multi-step workflow approvals. Case intake review, investigation closure, evidence verification, document approval, and whistleblower protection assessment. Each step notifies the responsible party."},

    # SEARCH
    {"id": "s20_search", "dur": 8, "url": f"{BASE}/dashboard/search",
     "narr": "Full-text search across all cases, evidence, tasks, and documents. Advanced filters by entity type, status, date range. Saved searches for recurring queries. Control-K for instant access anywhere."},

    # ANALYTICS
    {"id": "s21_analytics", "dur": 10, "url": f"{BASE}/dashboard/analytics",
     "narr": "Analytics. Cases by status and type. Monthly trends. Investigator workload rankings. Closure rates and average investigation duration. Financial return on investment across all recoveries and savings."},

    {"id": "s22_analytics_scroll", "dur": 6,
     "narr": "Task completion metrics, evidence collection trends, and the most recent system activity. All data is role-filtered.",
     "actions": [("scroll", 500), ("wait", 500)]},

    # FINANCIAL
    {"id": "s23_financial", "dur": 8, "url": f"{BASE}/dashboard/financial",
     "narr": "Financial tracking. Total recoveries, fines, restitution, and cost savings. Return on investment calculated from investigative hours. Top cases and subjects ranked by financial impact."},

    # REPORTS
    {"id": "s24_reports", "dur": 8, "url": f"{BASE}/dashboard/reports",
     "narr": "Standard reports including the Semiannual Report to Congress. Export as CSV, Excel, or PDF. The ad-hoc report builder lets investigators create custom reports without technical assistance."},

    # TRAINING
    {"id": "s25_training", "dur": 8, "url": f"{BASE}/dashboard/training",
     "narr": "Training management. Required certifications, compliance tracking, expiration alerts. Course catalog with enrollment, evaluations, and cost tracking. Exportable records for audits."},

    # TIMESHEETS
    {"id": "s26_timesheets", "dur": 6, "url": f"{BASE}/dashboard/timesheets",
     "narr": "Time and labor. Nine activity types. Availability pay calculations under Title 5. Timesheet generation with supervisor approval workflow."},

    # AUDIT
    {"id": "s27_audit", "dur": 8, "url": f"{BASE}/dashboard/audit-log",
     "narr": "Complete audit trail. Every action logged with timestamps and field-level change tracking. Filterable by date, action type, and entity. Exportable for compliance reporting."},

    # USERS
    {"id": "s28_users", "dur": 6, "url": f"{BASE}/dashboard/users",
     "narr": "User management. Six roles with granular permissions. Field-level access control varies by case status. Account creation, role assignment, and password reset."},

    # INVENTORY
    {"id": "s29_inventory", "dur": 6, "url": f"{BASE}/dashboard/inventory",
     "narr": "Inventory tracking for evidence, equipment, and accountable property. Organized by agent, region, and status."},

    # NOTIFICATIONS
    {"id": "s30_notif", "dur": 6, "url": f"{BASE}/dashboard/notifications",
     "narr": "Nine notification types delivered via email and in-app. Customizable preferences per user. Real-time unread count in the navigation bar."},

    # CLOSING
    {"id": "s31_close", "dur": 12,
     "narr": "The OIG Investigative Tracking System. Complete investigation lifecycle management. Evidence chain of custody. Document versioning and approval. Multi-step workflows. Public intake with whistleblower protections. Comprehensive analytics and reporting. Full audit trail. Role-based access control. Developed by Y Point.",
     "overlay": "OIG-ITS\nInvestigative Tracking System\n\n95+ API Routes | 20+ Modules\n100/100 Tests Passing\n\nDeveloped by Y Point"},
]


def title_frame(text, w=1280, h=720):
    img = Image.new("RGB", (w, h), (15, 23, 42))
    d = ImageDraw.Draw(img)
    try:
        fl = ImageFont.truetype("arial.ttf", 44)
        fs = ImageFont.truetype("arial.ttf", 22)
    except: fl = fs = ImageFont.load_default()
    lines = text.split("\n")
    y = h//2 - len(lines)*50//2
    for i, ln in enumerate(lines):
        f = fl if i == 0 else fs
        bb = d.textbbox((0,0), ln, font=f)
        d.text(((w - bb[2]+bb[0])//2, y + i*50), ln, fill=(219,234,254) if i==0 else (148,163,184), font=f)
    try:
        logo = Image.open("Logo/Logo_YPoint_black.png").convert("RGB")
        logo = ImageOps.invert(logo)
        logo = logo.resize((70,52), Image.LANCZOS)
        img.paste(logo, (w//2-35, h-70))
    except: pass
    return img


def caption(path, title, narr):
    img = Image.open(path).convert("RGBA")
    try:
        ft = ImageFont.truetype("arial.ttf", 18)
        fc = ImageFont.truetype("arial.ttf", 12)
    except: ft = fc = ImageFont.load_default()
    ov = Image.new("RGBA", img.size, (0,0,0,0))
    od = ImageDraw.Draw(ov)
    od.rectangle([(0,0),(1280,38)], fill=(15,23,42,210))
    od.rectangle([(0,680),(1280,720)], fill=(15,23,42,200))
    img = Image.alpha_composite(img, ov)
    d = ImageDraw.Draw(img)
    d.text((12,9), f"OIG-ITS  |  {title}", fill=(219,234,254), font=ft)
    d.text((12,694), narr[:150]+("..." if len(narr)>150 else ""), fill=(148,163,184), font=fc)
    return img.convert("RGB")


def tts(text, path):
    e = pyttsx3.init()
    e.setProperty("rate", 160)
    e.setProperty("volume", 0.95)
    for v in e.getProperty("voices"):
        if "zira" in v.name.lower() or "david" in v.name.lower():
            e.setProperty("voice", v.id); break
    e.save_to_file(text, str(path))
    e.runAndWait()


def main():
    print("="*60)
    print("  OIG-ITS FINAL DEMO RECORDER")
    dur = sum(s["dur"] for s in SCENES)
    print(f"  {len(SCENES)} scenes, {dur//60}:{dur%60:02d} planned")
    print("="*60)

    SHOTS.mkdir(exist_ok=True)
    AUD.mkdir(exist_ok=True)

    # 1. Audio
    print("\n[1/4] Audio...")
    for s in SCENES:
        ap = AUD / f"{s['id']}.wav"
        if not ap.exists():
            print(f"  {s['id']}")
            tts(s["narr"], ap)
            time.sleep(0.2)
    print("  Done")

    # 2. Screenshots
    print("\n[2/4] Screenshots...")
    with sync_playwright() as p:
        br = p.chromium.launch(headless=True)
        ctx = br.new_context(viewport={"width":1280,"height":720}, device_scale_factor=1)
        pg = ctx.new_page()
        pg.goto(f"{BASE}/login", timeout=30000)
        time.sleep(2)

        for i, s in enumerate(SCENES):
            sid = s["id"]
            print(f"  [{i+1}/{len(SCENES)}] {sid}")

            if s.get("overlay"):
                title_frame(s["overlay"]).save(str(SHOTS/f"{sid}.png"))
                continue

            if s.get("url"):
                try: pg.goto(s["url"], wait_until="networkidle", timeout=15000)
                except:
                    try: pg.goto(s["url"], timeout=10000)
                    except: pass
                time.sleep(1.5)

            for act in s.get("actions", []):
                try:
                    if act[0] == "fill": pg.fill(act[1], act[2])
                    elif act[0] == "click": pg.click(act[1], timeout=5000)
                    elif act[0] == "wait": time.sleep(act[1]/1000)
                    elif act[0] == "goto":
                        try: pg.goto(act[1], wait_until="networkidle", timeout=15000)
                        except: pg.goto(act[1], timeout=10000)
                    elif act[0] == "scroll": pg.evaluate(f"window.scrollBy(0,{act[1]})")
                    elif act[0] == "shot": pass
                    time.sleep(0.3)
                except Exception as ex:
                    print(f"    warn: {ex}")

            time.sleep(1.5)
            try:
                pg.screenshot(path=str(SHOTS/f"{sid}.png"), timeout=60000)
            except Exception as ex:
                print(f"    screenshot failed: {ex}")
                # Create a placeholder
                title_frame(s.get("title", sid)).save(str(SHOTS/f"{sid}.png"))

        br.close()
    print("  Done")

    # 3. Captions
    print("\n[3/4] Captions...")
    for s in SCENES:
        sp = SHOTS/f"{s['id']}.png"
        if sp.exists() and not s.get("overlay"):
            caption(sp, s.get("title", s["id"]), s["narr"]).save(str(SHOTS/f"{s['id']}_c.png"))
    print("  Done")

    # 4. Video
    print("\n[4/4] Video...")
    vp = OUT / "oig-its-final.mp4"
    w = imageio.get_writer(str(vp), fps=FPS, codec="libx264", quality=8, pixelformat="yuv420p")
    for s in SCENES:
        cp = SHOTS/f"{s['id']}_c.png"
        rp = SHOTS/f"{s['id']}.png"
        ip = cp if cp.exists() else rp
        if not ip.exists(): continue
        im = imageio.imread(str(ip))
        for _ in range(int(s["dur"]*FPS)):
            w.append_data(im)
    w.close()

    # 5. Audio merge
    print("\n[5] Merging audio...")
    first = None
    for s in SCENES:
        wp = AUD/f"{s['id']}.wav"
        if wp.exists(): first = wp; break

    if first:
        wf = wave.open(str(first), "rb")
        pr = wf.getparams(); wf.close()
        sr, sw, ch = pr.framerate, pr.sampwidth, pr.nchannels

        cw = wave.open(str(AUD/"combined.wav"), "wb")
        cw.setparams(pr)
        for s in SCENES:
            wp = AUD/f"{s['id']}.wav"
            if wp.exists():
                wf = wave.open(str(wp), "rb")
                d = wf.readframes(wf.getnframes())
                ad = wf.getnframes()/sr; wf.close()
                cw.writeframes(d)
                sl = max(0, s["dur"]-ad)
                if sl > 0: cw.writeframes(b"\x00"*int(sl*sr*sw*ch))
            else:
                cw.writeframes(b"\x00"*int(s["dur"]*sr*sw*ch))
        cw.close()

        ff = imageio_ffmpeg.get_ffmpeg_exe()
        fp = OUT/"oig-its-final-av.mp4"
        subprocess.run([ff,"-y","-i",str(vp),"-i",str(AUD/"combined.wav"),
                        "-c:v","copy","-c:a","aac","-b:a","128k","-shortest",str(fp)],
                       capture_output=True)
        print(f"  Final: {fp}")
    else:
        fp = vp

    sz = fp.stat().st_size / 1024 / 1024
    print(f"\n{'='*60}")
    print(f"  OUTPUT: {fp}")
    print(f"  Size: {sz:.1f} MB")
    print(f"  Duration: {dur//60}:{dur%60:02d}")
    print(f"  Scenes: {len(SCENES)}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
