// A short-lived, per-tab cache for the receipt a trade just produced.
//
// The receipt page fetches its data fresh from the server, which is correct
// but means the moment right after a customer submits a trade — when we
// already know almost everything the receipt will show — the customer sees
// a blocking "Generating your trade receipt..." screen while that fetch is
// in flight. Stashing a preview here lets the receipt page render instantly
// with the data we already have, then quietly reconcile with the server's
// answer once it arrives.
export type ReceiptPreview = {
  sessionId: string;
  issuedAt: string;
  status: string;
  resultDescription: string | null;
  resolvedAt: string | null;
  customer: string;
  trade: {
    type: "SELL_GIFTCARD" | "SELL_CRYPTO";
    amountUsd: number;
    nairaPerUsd: number;
    expectedPayoutNaira: number;
    giftCard: { brand: string | null; country: string | null; subcategory: string | null; cardDetails: string; imageSubmitted: boolean } | null;
    crypto: { asset: string | null; payoutBankName: string | null; payoutAccountName: string | null; payoutAccountNumber: string | null } | null;
  };
};

function storageKey(orderId: string) {
  return `fexex-receipt-preview:${orderId}`;
}

export function stashReceiptPreview(orderId: string, receipt: ReceiptPreview) {
  try {
    sessionStorage.setItem(storageKey(orderId), JSON.stringify(receipt));
  } catch {
    // Best-effort only — a full fetch on the receipt page still works without this.
  }
}

export function readReceiptPreview(orderId: string): ReceiptPreview | null {
  try {
    const cached = sessionStorage.getItem(storageKey(orderId));
    return cached ? (JSON.parse(cached) as ReceiptPreview) : null;
  } catch {
    return null;
  }
}

export function clearReceiptPreview(orderId: string) {
  try {
    sessionStorage.removeItem(storageKey(orderId));
  } catch {
    // Ignore — this is just tidying up a cache entry.
  }
}
