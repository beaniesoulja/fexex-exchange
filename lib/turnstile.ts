const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileResponse {
  success?: boolean;
  action?: string;
}

export function isTurnstileEnabled() {
  return process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(token: unknown, expectedAction: "login" | "password_reset") {
  if (!isTurnstileEnabled()) return true;

  const secretKey = process.env.TURNSTILE_SECRET_KEY ?? "";
  if (!secretKey) return false;
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token });
    const response = await fetch(siteverifyUrl, { method: "POST", body, signal: controller.signal });
    const result = await response.json() as TurnstileResponse;
    const actionMatches = process.env.NODE_ENV !== "production" || result.action === expectedAction;
    return response.ok && result.success === true && actionMatches;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
