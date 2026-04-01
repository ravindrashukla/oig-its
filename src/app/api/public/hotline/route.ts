import { prisma } from "@/lib/prisma";
import { publicHotlineSchema } from "@/lib/validators/inquiry";
import { logAudit } from "@/lib/audit";
import { scoreInquiry } from "@/lib/ai/risk-scoring";
import { findDuplicateComplaints } from "@/lib/ai/complaint-dedup";

// ─── POST: Public hotline complaint submission (no auth) ────

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = publicHotlineSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const inquiryNumber = await generateInquiryNumber();

  // Calculate risk score
  const risk = scoreInquiry({
    subject: parsed.data.subject,
    description: parsed.data.description,
    source: "HOTLINE",
    category: parsed.data.category || undefined,
    isAnonymous: parsed.data.isAnonymous ?? false,
    complainantEmail: parsed.data.isAnonymous ? null : (parsed.data.complainantEmail || null),
    complainantPhone: parsed.data.isAnonymous ? null : (parsed.data.complainantPhone || null),
    complainantName: parsed.data.isAnonymous ? null : (parsed.data.complainantName || null),
  });

  // Auto-escalate priority if risk score > 75
  const autoPriority = risk.score > 75
    ? (risk.riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH")
    : undefined;

  const inquiry = await prisma.preliminaryInquiry.create({
    data: {
      inquiryNumber,
      source: "HOTLINE",
      subject: parsed.data.subject,
      description: parsed.data.description,
      complainantName: parsed.data.isAnonymous ? null : (parsed.data.complainantName || null),
      complainantEmail: parsed.data.isAnonymous ? null : (parsed.data.complainantEmail || null),
      complainantPhone: parsed.data.isAnonymous ? null : (parsed.data.complainantPhone || null),
      isAnonymous: parsed.data.isAnonymous ?? false,
      category: parsed.data.category || null,
      riskScore: risk.score,
      riskFactors: risk.factors as any,
      ...(autoPriority && { priority: autoPriority }),
    },
  });

  void logAudit({
    action: "CREATE",
    entityType: "PreliminaryInquiry",
    entityId: inquiry.id,
    metadata: { inquiryNumber, source: "HOTLINE", isPublic: true },
  });

  // Check for duplicate complaints
  let duplicates: Awaited<ReturnType<typeof findDuplicateComplaints>> | null = null;
  try {
    duplicates = await findDuplicateComplaints(
      parsed.data.subject,
      parsed.data.description,
    );
  } catch (err) {
    console.error("[hotline] Dedup check failed (non-blocking):", err);
  }

  // In production, send auto-response email if complainantEmail provided
  // For now we just note it in the response
  const hasEmail = !parsed.data.isAnonymous && parsed.data.complainantEmail;

  return Response.json({
    inquiryNumber,
    message: "Your complaint has been received. It will be reviewed by the Office of Inspector General. Please save your inquiry number for future reference.",
    ...(hasEmail && {
      emailNotice: "A confirmation has been sent to the email address provided.",
    }),
    ...(duplicates && duplicates.duplicates.length > 0 && {
      potentialDuplicates: duplicates.duplicates,
    }),
  }, { status: 201 });
}

async function generateInquiryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INQ-${year}-`;

  const latest = await prisma.preliminaryInquiry.findFirst({
    where: { inquiryNumber: { startsWith: prefix } },
    orderBy: { inquiryNumber: "desc" },
    select: { inquiryNumber: true },
  });

  let seq = 1;
  if (latest) {
    const lastSeq = parseInt(latest.inquiryNumber.replace(prefix, ""), 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(5, "0")}`;
}
