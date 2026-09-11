type AdminNotification = {
  userEmail: string;
  referenceId: string | null;
  brand: string;
  country: string;
  amount: number;
  totalValue: number;
};

export async function notifyAdmin({
  userEmail,
  referenceId,
  brand,
  country,
  amount,
  totalValue,
}: AdminNotification) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Admin notification skipped: Telegram is not configured.");
    return;
  }

  const text = [
    "New gift card order",
    `Trade session ID: ${referenceId ?? "Pending"}`,
    `Customer: ${userEmail}`,
    `Card: ${brand} (${country})`,
    `Card value: ${formatNaira(amount)}`,
    `Expected payout: ${formatNaira(totalValue)}`,
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    throw new Error(`Telegram notification failed with status ${response.status}`);
  }
}

type AdminChatNotification = {
  userEmail: string;
  referenceId: string | null;
  orderId: string;
  message: string;
};

export async function notifyAdminOfTradeMessage({
  userEmail,
  referenceId,
  orderId,
  message,
}: AdminChatNotification) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Admin notification skipped: Telegram is not configured.");
    return;
  }

  const text = [
    "New trade room message — needs your attention",
    `Trade session ID: ${referenceId ?? orderId}`,
    `Customer: ${userEmail}`,
    "",
    message.slice(0, 500) || "(sent an image)",
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    throw new Error(`Telegram notification failed with status ${response.status}`);
  }
}

type AdminContactNotification = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export async function notifyAdminOfContactMessage({ name, email, subject, message }: AdminContactNotification) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Admin notification skipped: Telegram is not configured.");
    return;
  }

  const text = [
    "New Contact Us message",
    `From: ${name} <${email}>`,
    `Subject: ${subject}`,
    "",
    message.slice(0, 500),
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    throw new Error(`Telegram notification failed with status ${response.status}`);
  }
}
import { formatNaira } from "@/lib/currency";

type AdminKycNotification = {
  userEmail: string;
  documentType: string;
  submissionId: string;
};

export async function notifyAdminOfKycSubmission({ userEmail, documentType, submissionId }: AdminKycNotification) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Admin notification skipped: Telegram is not configured.");
    return;
  }

  const text = [
    "New KYC verification submission — needs review",
    `Customer: ${userEmail}`,
    `Document type: ${documentType}`,
    `Submission ID: ${submissionId}`,
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    throw new Error(`Telegram notification failed with status ${response.status}`);
  }
}
