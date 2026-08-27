type AdminNotification = {
  userEmail: string;
  brand: string;
  country: string;
  amount: number;
  totalValue: number;
};

export async function notifyAdmin({
  userEmail,
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
    `Customer: ${userEmail}`,
    `Card: ${brand} (${country})`,
    `Amount: $${amount}`,
    `Expected payout: $${totalValue.toFixed(2)}`,
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
