type NowPaymentsPayoutResponse = {
  id?: string | number;
  batch_id?: string | number;
  [key: string]: unknown;
};

export async function sendCryptoPayout(amount: number, walletAddress: string) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const authToken = process.env.NOWPAYMENTS_JWT_TOKEN;

  if (!apiKey) {
    throw new Error("NOWPayments API key is missing in environment variables.");
  }
  if (!authToken) {
    throw new Error("NOWPayments authorization token is missing in environment variables.");
  }

  const url = "https://api.nowpayments.io/v1/payout";
  const callbackUrl = process.env.NOWPAYMENTS_IPN_CALLBACK_URL;
  const withdrawal = {
    amount,
    address: walletAddress,
    currency: "usdttrc20",
    ...(callbackUrl ? { ipn_callback_url: callbackUrl } : {}),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(callbackUrl ? { ipn_callback_url: callbackUrl } : {}),
        withdrawals: [withdrawal],
      }),
    });

    const data = await response.json() as NowPaymentsPayoutResponse;

    if (!response.ok) {
      console.error("NOWPayments API Error:", data);
      throw new Error(typeof data.message === "string" ? data.message : "Payout failed");
    }

    console.log("✅ Crypto payout initiated successfully:", data);
    return data;

  } catch (error: unknown) {
    console.error("❌ Payout execution failed:", error);
    throw error;
  }
}
