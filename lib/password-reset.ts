import { createHash, randomBytes } from "crypto";

import { renderEmailLayout } from "@/lib/email-templates";

export const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Password reset email delivery is not configured.");
  }

  const html = renderEmailLayout({
    preheader: "Reset your FEXEX password. This link expires in one hour.",
    heading: "Reset your password",
    bodyHtml: "We received a request to reset the password for this FEXEX account. Choose a new password to regain access.",
    ctaLabel: "Reset password",
    ctaUrl: resetUrl,
    footnoteHtml: "This link expires in one hour and can only be used once. If you did not request this, no action is needed, your password will not change.",
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your FEXEX password",
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Password reset email request failed with status ${response.status}.`);
  }
}
