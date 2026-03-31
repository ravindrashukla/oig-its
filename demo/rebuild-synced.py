"""Rebuild demo video with fresh audio, properly synced."""
import pyttsx3, wave, time, subprocess
from pathlib import Path
import imageio.v2 as imageio
import imageio_ffmpeg

AUD = Path("demo/aud2")
SHOTS = Path("demo/shots")
OUT = Path("demo")
FPS = 2
AUD.mkdir(exist_ok=True)

SCENES = [
    ("s01_title", "OPM Office of Inspector General. Investigative Tracking System. This platform manages the full lifecycle of fraud, waste, abuse, and misconduct investigations. Let us walk through the system."),
    ("s02_login", "The secure login supports six roles with FedRAMP authorization. Account lockout activates after five failed attempts. Sessions expire after eight hours."),
    ("s03_login_fill", "Logging in as Special Agent Samuel Johnson, Fraud and Financial Crimes division."),
    ("s04_dash", "After login, the personalized dashboard displays key performance indicators. Total cases, active investigations, critical priority cases, and closed cases."),
    ("s05_dash_scroll", "Recent cases link directly to detail views. Notifications show workflow actions requiring attention."),
    ("s06_cases", "The case queue ranks investigations by priority. Filters narrow by status, type, and assigned agent. Investigators see only their assigned cases."),
    ("s07_newcase", "Creating a new investigation. Enter the case title, select the type, set priority and target date."),
    ("s08_newcase_fill", "The system assigns the lead investigator and initializes the full case record with ten functional tabs."),
    ("s09_casedetail", "The case detail view. Overview shows the investigation summary, assigned team, jurisdiction, and key dates."),
    ("s10_case_scroll", "The sidebar tracks case classification including type, priority, dates, and complaint source."),
    ("s11_evidence", "Evidence management. Eight evidence types with automatic exhibit numbering. The chain of custody is immutable."),
    ("s12_documents", "Document management supports thirty file formats. Version control tracks changes. Nineteen templates auto-populate case data."),
    ("s13_subjects", "Subject tracking. Individuals, organizations, and vendors linked to cases with specific roles."),
    ("s14_tasks", "The task board organizes investigative work. Overdue tasks are flagged. Tasks can be delegated with automatic notifications."),
    ("s15_hotline", "The public hotline. No login required. Anyone can report fraud, waste, or abuse. Anonymous submissions are supported."),
    ("s16_whistle", "The whistleblower portal. Legal protections under the Whistleblower Protection Act are prominently displayed."),
    ("s17_whistle_scroll", "Complainants receive their inquiry number immediately. Staff can convert inquiries into full investigations."),
    ("s18_inquiries", "Inquiry management. All submissions appear here. Convert to Case creates a full investigation."),
    ("s19_approvals", "Multi-step workflow approvals. Case intake, closure, evidence verification, and document approval."),
    ("s20_search", "Full-text search across all cases, evidence, tasks, and documents. Saved searches for recurring queries."),
    ("s21_analytics", "Analytics dashboard. Cases by status and type. Monthly trends. Closure rates and financial return on investment."),
    ("s22_analytics_scroll", "Task completion metrics, evidence trends, and recent activity. All data is role-filtered."),
    ("s23_financial", "Financial tracking. Recoveries, fines, restitution, and cost savings. Return on investment calculated automatically."),
    ("s24_reports", "Standard reports including the Semiannual Report to Congress. The ad-hoc builder creates custom reports."),
    ("s25_training", "Training management. Required certifications, compliance tracking, and expiration alerts."),
    ("s26_timesheets", "Time and labor tracking. Availability pay calculations under Title 5. Supervisor approval workflow."),
    ("s27_audit", "Complete audit trail. Every action logged with timestamps and field-level change tracking."),
    ("s28_users", "User management. Six roles with granular permissions. Field-level access control varies by case status."),
    ("s29_inventory", "Inventory tracking for evidence, equipment, and accountable property."),
    ("s30_notif", "Nine notification types delivered via email and in-app. Customizable preferences per user."),
    ("s31_close", "The OIG Investigative Tracking System. Complete investigation lifecycle. Evidence chain of custody. Document versioning. Workflows. Public intake with whistleblower protections. Analytics. Full audit trail. Developed by Y Point."),
]

# 1. Generate fresh TTS audio
print("[1/4] Generating fresh audio...")
engine = pyttsx3.init()
engine.setProperty("rate", 165)
engine.setProperty("volume", 1.0)
# Pick best voice
for v in engine.getProperty("voices"):
    if "david" in v.name.lower():
        engine.setProperty("voice", v.id)
        print(f"  Voice: {v.name}")
        break

for sid, text in SCENES:
    ap = AUD / f"{sid}.wav"
    engine.save_to_file(text, str(ap))
    engine.runAndWait()
    time.sleep(0.1)
print(f"  {len(SCENES)} clips generated")

# 2. Measure actual durations
print("\n[2/4] Measuring durations...")
durations = []
for sid, _ in SCENES:
    wp = AUD / f"{sid}.wav"
    w = wave.open(str(wp), "rb")
    dur = w.getnframes() / w.getframerate() + 1.0
    w.close()
    durations.append(dur)
    print(f"  {sid}: {dur:.1f}s")

total = sum(durations)
print(f"  Total: {int(total)//60}:{int(total)%60:02d}")

# 3. Build video matched to audio durations
print("\n[3/4] Building synced video...")
vp = OUT / "synced-video.mp4"
writer = imageio.get_writer(str(vp), fps=FPS, codec="libx264", quality=8, pixelformat="yuv420p")
for (sid, _), dur in zip(SCENES, durations):
    cp = SHOTS / f"{sid}_c.png"
    rp = SHOTS / f"{sid}.png"
    ip = cp if cp.exists() else rp
    if not ip.exists():
        print(f"  SKIP: {sid}")
        continue
    img = imageio.imread(str(ip))
    frames = int(dur * FPS)
    for _ in range(frames):
        writer.append_data(img)
writer.close()
print(f"  Video: {vp}")

# 4. Combine audio clips with matching padding
print("\n[4/4] Combining audio + merging...")
w0 = wave.open(str(AUD / f"{SCENES[0][0]}.wav"), "rb")
params = w0.getparams()
sr, sw, ch = params.framerate, params.sampwidth, params.nchannels
w0.close()

combo_path = AUD / "combo.wav"
combo = wave.open(str(combo_path), "wb")
combo.setparams(params)

for (sid, _), dur in zip(SCENES, durations):
    wp = AUD / f"{sid}.wav"
    w = wave.open(str(wp), "rb")
    audio_data = w.readframes(w.getnframes())
    audio_dur = w.getnframes() / sr
    w.close()

    combo.writeframes(audio_data)

    # Add silence padding to match scene duration
    pad_seconds = max(0, dur - audio_dur)
    if pad_seconds > 0:
        silence_bytes = int(pad_seconds * sr * sw * ch)
        combo.writeframes(b"\x00" * silence_bytes)

combo.close()

# Verify combo
wv = wave.open(str(combo_path), "rb")
combo_dur = wv.getnframes() / wv.getframerate()
wv.close()
print(f"  Audio: {combo_dur:.1f}s")

# Merge with ffmpeg
ff = imageio_ffmpeg.get_ffmpeg_exe()
final = OUT / "oig-its-demo-synced.mp4"
r = subprocess.run(
    [ff, "-y", "-i", str(vp), "-i", str(combo_path),
     "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
     str(final)],
    capture_output=True, text=True
)

if r.returncode == 0:
    sz = final.stat().st_size / 1024 / 1024
    print(f"\n{'='*50}")
    print(f"  DONE: {final}")
    print(f"  Size: {sz:.1f} MB")
    print(f"  Duration: {int(total)//60}:{int(total)%60:02d}")
    print(f"  Voice + screen SYNCED")
    print(f"{'='*50}")
else:
    print(f"  FFMPEG ERROR: {r.stderr[-300:]}")
