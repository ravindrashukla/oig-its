"""
Build 3 focused demo videos:
  1. Case Lifecycle — complaint to closure
  2. AI Insights — how AI helps investigations
  3. Case Resolution — using AI to close a case

Each video: capture real screenshots → generate matching TTS → build synced clips → merge.
"""
import wave, time, struct, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import imageio.v2 as imageio
import imageio_ffmpeg
import pyttsx3

BASE = "http://localhost:3000"
OUT = Path("demo")
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 2
TARGET_SR = 44100  # AAC-friendly sample rate


def make_title(text, w=1280, h=720):
    img = Image.new("RGB", (w, h), (15, 23, 42))
    d = ImageDraw.Draw(img)
    try: fl = ImageFont.truetype("arial.ttf", 40); fs = ImageFont.truetype("arial.ttf", 20)
    except: fl = fs = ImageFont.load_default()
    lines = text.split("\n")
    y = h // 2 - len(lines) * 44 // 2
    for i, ln in enumerate(lines):
        f = fl if i == 0 else fs
        bb = d.textbbox((0, 0), ln, font=f)
        d.text(((w - bb[2] + bb[0]) // 2, y + i * 44), ln, fill=(219, 234, 254) if i == 0 else (148, 163, 184), font=f)
    try:
        logo = ImageOps.invert(Image.open("Logo/Logo_YPoint_black.png").convert("RGB")).resize((60, 45))
        img.paste(logo, (w // 2 - 30, h - 60))
    except: pass
    return img


def add_bar(img_path, title, caption):
    img = Image.open(img_path).convert("RGBA")
    try: ft = ImageFont.truetype("arial.ttf", 16); fc = ImageFont.truetype("arial.ttf", 11)
    except: ft = fc = ImageFont.load_default()
    ov = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rectangle([(0, 0), (1280, 36)], fill=(15, 23, 42, 220))
    d.rectangle([(0, 684), (1280, 720)], fill=(15, 23, 42, 210))
    img = Image.alpha_composite(img, ov)
    d2 = ImageDraw.Draw(img)
    d2.text((12, 8), f"OIG-ITS  |  {title}", fill=(219, 234, 254), font=ft)
    d2.text((12, 696), caption[:160] + ("..." if len(caption) > 160 else ""), fill=(148, 163, 184), font=fc)
    return img.convert("RGB")


def tts(text, path):
    e = pyttsx3.init()
    e.setProperty("rate", 160)
    e.setProperty("volume", 1.0)
    for v in e.getProperty("voices"):
        if "david" in v.name.lower(): e.setProperty("voice", v.id); break
    e.save_to_file(text, str(path))
    e.runAndWait()
    del e


def audio_dur(path):
    w = wave.open(str(path), "rb")
    d = w.getnframes() / w.getframerate()
    w.close()
    return d


def build_video(name, scenes, screenshot_func):
    """Build one video from scenes list."""
    vdir = OUT / f"v_{name}"
    vdir.mkdir(exist_ok=True)

    print(f"\n{'='*50}")
    print(f"  VIDEO: {name}")
    print(f"  {len(scenes)} scenes")
    print(f"{'='*50}")

    # 1. Screenshots
    print("\n  [1/4] Screenshots...")
    screenshot_func(scenes, vdir)

    # 2. Audio
    print("\n  [2/4] Audio...")
    for s in scenes:
        wp = vdir / f"{s['id']}.wav"
        if not wp.exists():
            print(f"    {s['id']}")
            tts(s["voice"], wp)
            time.sleep(0.1)

    # 3. Measure durations
    durations = []
    for s in scenes:
        wp = vdir / f"{s['id']}.wav"
        durations.append(audio_dur(wp) + 1.0)

    total = sum(durations)
    print(f"\n  [3/4] Building video ({int(total)//60}:{int(total)%60:02d})...")

    # Build single video track
    vp = vdir / "v.mp4"
    wr = imageio.get_writer(str(vp), fps=FPS, codec="libx264", quality=8, pixelformat="yuv420p")
    for s, dur in zip(scenes, durations):
        ip = vdir / f"{s['id']}.png"
        if not ip.exists(): continue
        img = imageio.imread(str(ip))
        for _ in range(max(int(dur * FPS), 2)):
            wr.append_data(img)
    wr.close()

    # Build single audio track at 44100Hz
    first_wav = vdir / f"{scenes[0]['id']}.wav"
    w0 = wave.open(str(first_wav), "rb")
    orig_sr = w0.getframerate()
    sw, ch = w0.getsampwidth(), w0.getnchannels()
    w0.close()

    ap = vdir / "a.wav"
    combo = wave.open(str(ap), "wb")
    combo.setnchannels(ch)
    combo.setsampwidth(sw)
    combo.setframerate(TARGET_SR)

    for s, target_dur in zip(scenes, durations):
        wp = vdir / f"{s['id']}.wav"
        w = wave.open(str(wp), "rb")
        data = w.readframes(w.getnframes())
        adur = w.getnframes() / w.getframerate()
        w.close()

        # Upsample if needed
        if orig_sr != TARGET_SR and orig_sr == 22050:
            samples = struct.unpack(f"<{len(data)//2}h", data)
            up = []
            for sample in samples:
                up.append(sample)
                up.append(sample)
            data = struct.pack(f"<{len(up)}h", *up)

        combo.writeframes(data)
        pad = max(0, target_dur - adur)
        if pad > 0:
            combo.writeframes(b"\x00" * int(pad * TARGET_SR * sw * ch))
    combo.close()

    # 4. Merge
    print("  [4/4] Merging...")
    fp = OUT / f"{name}.mp4"
    subprocess.run([FF, "-y", "-i", str(vp), "-i", str(ap),
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-map", "0:v:0", "-map", "1:a:0", str(fp)], capture_output=True)

    # Cleanup
    vp.unlink(missing_ok=True)
    ap.unlink(missing_ok=True)

    if fp.exists():
        sz = fp.stat().st_size / 1024 / 1024
        print(f"\n  DONE: {fp} ({sz:.1f} MB, {int(total)//60}:{int(total)%60:02d})")
    else:
        print("  ERROR: Video not created")
    return fp


# ═══════════════════════════════════════════════════
# VIDEO 1: Case Lifecycle
# ═══════════════════════════════════════════════════

VIDEO1_SCENES = [
    {"id": "v1_01", "overlay": "Case Lifecycle\n\nFrom Complaint to Closure\n\nOIG-ITS", "voice": "Case Lifecycle. From complaint to closure. OIG Investigative Tracking System."},
    {"id": "v1_02", "url": "/hotline", "voice": "A fraud complaint arrives through the public hotline. The complainant reports procurement fraud involving inflated invoices. No login is required."},
    {"id": "v1_03", "url": "/dashboard/inquiries", "voice": "Staff review the inquiry. The system auto-calculated a risk score of 65, flagging it as high priority. The investigator clicks Convert to Case."},
    {"id": "v1_04", "url": "/dashboard/cases", "voice": "The new case appears in the case queue with an auto-generated case number. The investigator is assigned as lead."},
    {"id": "v1_05", "url": "/dashboard/cases/new", "voice": "Cases can also be created directly through the three-step wizard: title, classification, and review."},
    {"id": "v1_06", "url": None, "voice": "The case detail view shows ten tabs: overview, documents, evidence, tasks, subjects, timeline, violations, financial results, techniques, and referrals.", "click_case": True},
    {"id": "v1_07", "url": "/dashboard/subjects", "voice": "Subjects are linked to the case with roles: respondent, complainant, witness, or subject of interest. The system warns about potential duplicates."},
    {"id": "v1_08", "url": "/dashboard/evidence", "voice": "Evidence is collected with eight different types. Each item receives an automatic exhibit number. The chain of custody is immutable."},
    {"id": "v1_09", "url": "/dashboard/tasks", "voice": "Investigation tasks are tracked on a Kanban board. Overdue tasks are flagged in red. Tasks can be delegated to team members."},
    {"id": "v1_10", "url": "/dashboard/approvals", "voice": "Workflow approvals move through multi-step chains. The case progresses from intake to open, active, under review, and finally to closure."},
    {"id": "v1_11", "overlay": "Case Lifecycle Complete\n\nIntake → Open → Active → Review → Close\n\nFull audit trail preserved", "voice": "Case lifecycle complete. From intake through open, active, review, and closure. Every action recorded in the audit trail."},
]

# ═══════════════════════════════════════════════════
# VIDEO 2: AI Insights
# ═══════════════════════════════════════════════════

VIDEO2_SCENES = [
    {"id": "v2_01", "overlay": "AI-Powered Investigation\n\n22 Algorithms\n18 Statistical + 4 Claude AI", "voice": "AI-Powered Investigation. Twenty-two algorithms. Eighteen statistical plus four Claude AI powered."},
    {"id": "v2_02", "url": "/dashboard/ai", "voice": "The AI Insights dashboard. The Alerts tab shows anomaly detection results. Financial outliers are flagged with severity badges. Cases needing priority escalation are identified automatically."},
    {"id": "v2_03", "url": "/dashboard/ai", "voice": "Auto-escalation scans all active cases. It recommends upgrading priority when financial amounts exceed thresholds, deadlines approach, or cases go stale with no activity.",
     "actions": [("wait", 1000)]},
    {"id": "v2_04", "url": "/dashboard/analytics", "voice": "The analytics dashboard shows investigation trends. Cases by status and type, monthly trends, closure rates, and investigator workload rankings. All powered by real-time data analysis."},
    {"id": "v2_05", "url": "/dashboard/analytics", "voice": "Predictive analytics forecast case duration, identify at-risk cases, and predict monthly caseload. Linear regression on historical data drives these predictions.",
     "actions": [("scroll", 400)]},
    {"id": "v2_06", "url": "/dashboard/financial", "voice": "Financial pattern mining detects suspicious patterns: round-number amounts, just-below-threshold billing, sequential invoices from the same vendor. Return on investment is calculated automatically."},
    {"id": "v2_07", "url": "/dashboard/subjects", "voice": "Subject risk profiling scores each individual zero to one hundred. Factors include case count, violations, financial impact, network connections, and repeat offender patterns."},
    {"id": "v2_08", "url": "/dashboard/ai", "voice": "Network analysis builds a graph of all subjects and cases. It identifies hub entities with many connections and detects fraud rings — groups of subjects appearing together across multiple investigations.",
     "scroll_to_tab": True},
    {"id": "v2_09", "url": "/dashboard/ai", "voice": "The Claude AI tab provides natural language search. Type a question like: show me all fraud cases with recoveries over five hundred thousand dollars. Claude translates it to structured filters and returns matching results."},
    {"id": "v2_10", "overlay": "22 AI Algorithms\n\nAnomalies • Risk Scoring • Predictions\nSimilarity • Clustering • Network Analysis\nDocument Classification • Fraud Detection\nNatural Language Search • Report Generation", "voice": "Twenty-two AI algorithms. Anomaly detection, risk scoring, predictive analytics, case similarity, clustering, network analysis, document classification, fraud detection, natural language search, and AI report generation."},
]

# ═══════════════════════════════════════════════════
# VIDEO 3: Case Resolution with AI
# ═══════════════════════════════════════════════════

VIDEO3_SCENES = [
    {"id": "v3_01", "overlay": "Resolving Cases with AI\n\nFrom Evidence to Closure\n\nAI-Assisted Investigation", "voice": "Resolving cases with AI. From evidence collection to closure. AI-assisted investigation."},
    {"id": "v3_02", "url": "/dashboard/cases", "voice": "We start with an active fraud investigation. The AI recommender suggested the best investigator based on expertise match, workload balance, and success rate."},
    {"id": "v3_03", "url": None, "voice": "The case detail shows the full investigation status. Evidence strength scoring rates the portfolio as a B grade: good type diversity, complete custody chains, but needs more corroboration.", "click_case": True},
    {"id": "v3_04", "url": "/dashboard/ai", "voice": "Evidence strength analysis. The scoring examines evidence types, custody chain completeness, source diversity, and timeline coverage. Each factor contributes to the zero to one hundred score."},
    {"id": "v3_05", "url": "/dashboard/ai", "voice": "Timeline anomaly detection identifies gaps in the investigation. It flags periods with no activity, post-review evidence collection, and unusual patterns that may need attention."},
    {"id": "v3_06", "url": "/dashboard/ai", "voice": "Closure readiness checks thirteen criteria: subjects documented, violations recorded, evidence collected, tasks completed, financial results, referrals resolved, and checklist items done. Score must reach eighty to close."},
    {"id": "v3_07", "url": "/dashboard/ai", "voice": "The AI generates a case narrative automatically. It produces a structured summary covering subjects, investigative techniques, violations, financial impact, and referrals — ready for the final report."},
    {"id": "v3_08", "url": "/dashboard/ai", "voice": "Claude AI generates a professional investigation report. Select the report type — summary, narrative, findings, or recommendation — and the AI produces a complete document from case data."},
    {"id": "v3_09", "url": "/dashboard/ai", "voice": "Interview questions are generated based on the case type and subject role. Opening questions, substantive probes, and closing questions help investigators prepare for formal interviews."},
    {"id": "v3_10", "url": "/dashboard/reports", "voice": "The investigation report is exported for review. Seven standard templates are available including the Semiannual Report to Congress. Export as CSV, Excel, or PDF."},
    {"id": "v3_11", "overlay": "AI-Assisted Resolution\n\nEvidence Scoring • Closure Readiness\nNarrative Generation • Report Writing\nInterview Preparation • Pattern Detection\n\nDeveloped by Y Point", "voice": "AI-assisted case resolution. Evidence scoring, closure readiness, narrative generation, report writing, interview preparation, and pattern detection. Developed by Y Point."},
]


def take_screenshots(scenes, vdir):
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    br = pw.chromium.launch(headless=True)
    ctx = br.new_context(viewport={"width": 1280, "height": 720})
    pg = ctx.new_page()

    # Login
    pg.goto(f"{BASE}/login", timeout=15000)
    time.sleep(2)
    pg.fill('input[placeholder*="oig.gov"]', "samuel.johnson@oig.gov")
    pg.fill('input[type="password"]', "Demo2026!")
    pg.click('button[type="submit"]')
    time.sleep(5)

    for s in scenes:
        ip = vdir / f"{s['id']}.png"

        if s.get("overlay"):
            make_title(s["overlay"]).save(str(ip))
            print(f"    {s['id']} (title)")
            continue

        if s.get("click_case"):
            pg.goto(f"{BASE}/dashboard/cases", timeout=15000)
            time.sleep(2)
            try:
                pg.click("table tbody tr:first-child td a", timeout=5000)
            except:
                try: pg.click("table tbody tr:first-child", timeout=3000)
                except: pass
            time.sleep(3)
        elif s.get("url"):
            try: pg.goto(f"{BASE}{s['url']}", wait_until="networkidle", timeout=15000)
            except:
                try: pg.goto(f"{BASE}{s['url']}", timeout=10000)
                except: pass
            time.sleep(2)

        for act in s.get("actions", []):
            try:
                if act[0] == "scroll": pg.evaluate(f"window.scrollBy(0,{act[1]})")
                elif act[0] == "wait": time.sleep(act[1] / 1000)
                time.sleep(0.3)
            except: pass

        time.sleep(1)
        try:
            pg.screenshot(path=str(ip), timeout=30000)
        except:
            make_title(s.get("voice", s["id"])[:60]).save(str(ip))

        # Add caption bar
        if not s.get("overlay"):
            captioned = add_bar(ip, "Case Lifecycle" if "v1" in s["id"] else "AI Insights" if "v2" in s["id"] else "Case Resolution", s["voice"])
            captioned.save(str(ip))

        print(f"    {s['id']} OK")

    br.close()
    pw.stop()


# ═══ BUILD ALL 3 VIDEOS ═══
if __name__ == "__main__":
    build_video("1-case-lifecycle", VIDEO1_SCENES, take_screenshots)
    build_video("2-ai-insights", VIDEO2_SCENES, take_screenshots)
    build_video("3-case-resolution-ai", VIDEO3_SCENES, take_screenshots)

    print("\n" + "=" * 50)
    print("  ALL 3 VIDEOS COMPLETE")
    for name in ["1-case-lifecycle", "2-ai-insights", "3-case-resolution-ai"]:
        fp = OUT / f"{name}.mp4"
        if fp.exists():
            sz = fp.stat().st_size / 1024 / 1024
            print(f"  {fp.name} ({sz:.1f} MB)")
    print("=" * 50)
