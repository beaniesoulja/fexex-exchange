import { createHash, randomBytes } from "crypto";

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
      html: `<p>We received a request to reset your FEXEX password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in one hour. If you did not request this, you can safely ignore this email.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Password reset email request failed with status ${response.status}.`);
  }
}
