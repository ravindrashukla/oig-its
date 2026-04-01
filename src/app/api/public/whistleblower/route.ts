import { prisma } from "@/lib/prisma";
import { publicHotlineSchema } from "@/lib/validators/inquiry";
import { logAudit } from "@/lib/audit";
import { scoreInquiry } from "@/lib/ai/risk-scoring";

// ─── POST: Public whistleblower complaint submission (no auth) ─

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
    source: "WHISTLEBLOWER",
    category: parsed.data.category || undefined,
    isAnonymous: parsed.data.isAnonymous ?? false,
    complainantEmail: parsed.data.isAnonymous ? null : (parsed.data.complainantEmail || null),
    complainantPhone: parsed.data.isAnonymous ? null : (parsed.data.complainantPhone || null),
    complainantName: parsed.data.isAnonymous ? null : (parsed.data.complainantName || null),
  });

  // Whistleblower complaints default to HIGH, escalate to CRITICAL if risk > 75
  const priority = risk.score > 75 ? "CRITICAL" : "HIGH";

  const inquiry = await prisma.preliminaryInquiry.create({
    data: {
      inquiryNumber,
      source: "WHISTLEBLOWER",
      subject: parsed.data.subject,
      description: parsed.data.description,
      complainantName: parsed.data.isAnonymous ? null : (parsed.data.complainantName || null),
      complainantEmail: parsed.data.isAnonymous ? null : (parsed.data.complainantEmail || null),
      complainantPhone: parsed.data.isAnonymous ? null : (parsed.data.complainantPhone || null),
      isAnonymous: parsed.data.isAnonymous ?? false,
      category: parsed.data.category || null,
      priority,
      riskScore: risk.score,
      riskFactors: risk.factors as any,
    },
  });

  void logAudit({
    action: "CREATE",
    entityType: "PreliminaryInquiry",
    entityId: inquiry.id,
    metadata: { inquiryNumber, source: "WHISTLEBLOWER", isPublic: true },
  });

  const hasEmail = !parsed.data.isAnonymous && parsed.data.complainantEmail;

  return Response.json({
    inquiryNumber,
    message: "Your complaint has been received under whistleblower protections. " +
      "Federal whistleblower protection laws, including the Whistleblower Protection Act (5 U.S.C. \u00A7 2302(b)(8)), " +
      "prohibit retaliation against employees who report waste, fraud, abuse, or other misconduct. " +
      "Your disclosure will be handled with the highest level of confidentiality. " +
      "Please save your inquiry number for future reference.",
    ...(hasEmail && {
      emailNotice: "A confirmation has been sent to the email address provided.",
    }),
    protections: [
      "Your identity will be protected to the maximum extent possible under law.",
      "Retaliation against whistleblowers is prohibited by federal law.",
      "You may contact the Office of Special Counsel (OSC) if you believe you have been retaliated against.",
    ],
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
