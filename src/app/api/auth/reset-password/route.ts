import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
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

// ─── POST: Request a password reset ──────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, firstName: true },
    });

    if (!user) {
      return successResponse;
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate a new reset token
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send reset email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/login?reset=${token}`;

    try {
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM || "noreply@oig.gov",
        to: user.email,
        subject: "[OIG-ITS] Password Reset Request",
        text: `Hello ${user.firstName},\n\nA password reset was requested for your account. Use the following link to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this reset, you can safely ignore this email.\n\nOIG Investigation Tracking System`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px;">
            <h2 style="color: #1a1a1a;">Password Reset Request</h2>
            <p style="color: #4a4a4a;">Hello ${user.firstName},</p>
            <p style="color: #4a4a4a;">A password reset was requested for your account. Click the link below to reset your password:</p>
            <p><a href="${resetLink}" style="color: #2563eb;">Reset your password &rarr;</a></p>
            <p style="color: #4a4a4a;">This link expires in 1 hour. If you did not request this reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
            <p style="color: #9a9a9a; font-size: 12px;">OIG Investigation Tracking System</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[reset-password] Email send failed:", err);
    }

    return successResponse;
  } catch (err) {
    console.error("[reset-password] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT: Reset password with token ──────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 },
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { id: true } } },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    if (resetToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    // Hash new password and update user
    const passwordHash = await hash(newPassword, 12);

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Delete the used token
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    return NextResponse.json({
      message: "Password has been reset successfully.",
    });
  } catch (err) {
    console.error("[reset-password] PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
