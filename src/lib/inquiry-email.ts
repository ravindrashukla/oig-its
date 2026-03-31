import nodemailer from "nodemailer";

// ─── Nodemailer transporter (lazy singleton) ──────────────────

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: process.env.SMTP_SECURE === "true",
      ...(process.env.SMTP_USER && {
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
    });
  }
  return _transporter;
}

// ─── Send status update email to inquiry submitter (EF14) ─────

interface SendInquiryStatusEmailParams {
  to: string;
  inquiryNumber: string;
  status: "UNDER_REVIEW" | "CLOSED";
  complainantName: string | null;
}

export async function sendInquiryStatusEmail(
  params: SendInquiryStatusEmailParams,
): Promise<void> {
  const { to, inquiryNumber, status, complainantName } = params;

  const greeting = complainantName ? `Dear ${complainantName}` : "Dear Submitter";
  const statusLabel = status === "UNDER_REVIEW" ? "Under Review" : "Closed";
  const statusMessage =
    status === "UNDER_REVIEW"
      ? `Your inquiry (${inquiryNumber}) is now under review by our team. We will follow up with you as the review progresses.`
      : `Your inquiry (${inquiryNumber}) has been closed. If you have further questions or new information, please submit a new inquiry referencing this number.`;

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || "noreply@oig.gov",
      to,
      subject: `[OIG-ITS] Inquiry ${inquiryNumber} — Status Update: ${statusLabel}`,
      text: `${greeting},\n\n${statusMessage}\n\nThank you,\nOffice of the Inspector General`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #1a1a1a;">Inquiry Status Update</h2>
          <p style="color: #4a4a4a;">${greeting},</p>
          <p style="color: #4a4a4a;">${statusMessage}</p>
          <p style="color: #4a4a4a; margin-top: 24px;">Thank you,<br/>Office of the Inspector General</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p style="color: #9a9a9a; font-size: 12px;">OIG Investigation Tracking System</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[inquiry-email] Email send failed:", err);
  }
}
