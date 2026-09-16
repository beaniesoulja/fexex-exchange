import { createHash, randomBytes } from "crypto";

import { renderEmailLayout } from "@/lib/email-templates";

export const EMAIL_VERIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function createEmailVerificationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashEmailVerificationToken(token) };
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendVerificationEmail(email: string, verifyUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Verification email delivery is not configured.");
  }

  const html = renderEmailLayout({
    preheader: "Confirm your email address to finish activating your FEXEX account.",
    heading: "Verify your email address",
    bodyHtml: "Welcome to FEXEX. Confirm this is your email address to finish activating your account and start trading.",
    ctaLabel: "Verify email address",
    ctaUrl: verifyUrl,
    footnoteHtml: "This link expires in 24 hours. If you did not create a FEXEX account, you can safely ignore this email.",
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
      subject: "Verify your FEXEX email address",
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Verification email request failed with status ${response.status}.`);
  }
}
