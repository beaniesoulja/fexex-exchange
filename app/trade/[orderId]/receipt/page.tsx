"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { formatNaira } from "@/lib/currency";
import { clearReceiptPreview, readReceiptPreview, type ReceiptPreview } from "@/lib/receipt-cache";

type Receipt = ReceiptPreview;

export default function TradeReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { status } = useSession();
  const router = useRouter();
  // Start with no receipt so the first client render matches the server's HTML
  // exactly (sessionStorage doesn't exist during SSR). The cached preview — if
  // any — is applied in the effect below, right after mount, so it still
  // appears essentially instantly without causing a hydration mismatch.
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [router, status]);

  useEffect(() => {
    if (!orderId) return;
    void Promise.resolve().then(() => {
      const cached = readReceiptPreview(orderId);
      if (cached) setReceipt(cached);
    });
  }, [orderId]);

  useEffect(() => {
    if (!orderId || status !== "authenticated") return;
    let active = true;
    let loadInFlight = false;
    const loadReceipt = () => {
      if (document.visibilityState !== "visible" || loadInFlight) return;
      loadInFlight = true;
      void fetch(`/api/trades/${orderId}/receipt`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "We could not load this receipt.");
          return data as Receipt;
        })
        .then((data) => {
          if (!active) return;
          setReceipt(data);
          setError("");
          clearReceiptPreview(orderId);
        })
        .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We could not load this receipt."); })
        .finally(() => { loadInFlight = false; });
    };
    loadReceipt();
    const timer = window.setInterval(loadReceipt, 30_000);
    document.addEventListener("visibilitychange", loadReceipt);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", loadReceipt); };
  }, [orderId, status]);

  // Only block on the full-screen loader when there is truly nothing to show yet
  // (a direct visit or a refresh) — a receipt we already have, including one
  // restored from the just-submitted trade, renders straight away.
  if (!receipt && !error) {
    return <main className="fexex-surface flex min-h-screen items-center justify-center bg-[#161818] p-4 text-sm text-[#a9afa9]">Generating your trade receipt...</main>;
  }

  if (!receipt) {
    return <main className="fexex-surface flex min-h-screen items-center justify-center bg-[#161818] p-4 text-[#f4f3ee]"><section className="w-full max-w-lg rounded-3xl border border-red-400/25 bg-[#202323] p-7"><h1 className="text-2xl font-bold">Receipt unavailable</h1><p className="mt-3 text-sm text-red-200">{error}</p><Link href="/trade" className="mt-6 inline-flex rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818]">Back to Trade</Link></section></main>;
  }

  const isGiftCard = receipt.trade.type === "SELL_GIFTCARD";
  const itemName = isGiftCard ? receipt.trade.giftCard?.brand : receipt.trade.crypto?.asset;
  return <main className="fexex-surface min-h-screen bg-[#161818] p-4 text-[#f4f3ee] sm:p-8"><div className="mx-auto max-w-2xl"><Link href="/trade" className="text-sm font-semibold text-[#c6f65c]">← Back to Trade</Link><section className="fexex-pop-in mt-5 overflow-hidden rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] shadow-2xl shadow-black/30"><div className="bg-[#c6f65c] p-6 text-[#161818] sm:p-8"><p className="text-xs font-extrabold tracking-[0.14em]">FEXEX TRADE RECEIPT</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-bold">{receipt.status === "COMPLETED" ? "Your trade was successful." : receipt.status === "REJECTED" ? "Your trade was not successful." : "Your trade is submitted."} <span aria-hidden="true">{receipt.status === "COMPLETED" ? "🎉" : receipt.status === "REJECTED" ? "" : "⏳"}</span></h1><p className="mt-3 max-w-lg text-sm font-medium text-[#161818]/75">Keep this Trade Session ID and share it with FEXEX support if you need help with this transaction.</p></div><div className="p-6 sm:p-8"><div className="rounded-2xl border border-[#c6f65c]/30 bg-[#c6f65c]/10 p-5"><p className="text-xs font-bold tracking-[0.12em] text-[#d8ff96]">TRADE SESSION ID</p><p className="mt-2 break-all font-mono text-base font-bold text-[#f4f3ee] sm:text-lg">{receipt.sessionId}</p></div>{receipt.status === "REJECTED" && <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100"><p className="font-bold">Failure reason</p><p className="mt-1">{receipt.resultDescription ?? "Please contact support with your Trade Session ID."}</p></div>}{receipt.status === "COMPLETED" && (receipt.resultDescription ? <div className="mt-5 rounded-2xl border border-[#f5c76a]/30 bg-[#f5c76a]/10 p-4 text-sm"><p className="font-bold text-[#f5c76a]">Trade successful — payout adjusted</p><p className="mt-1 text-[#d7dbd4]">{receipt.resultDescription}</p></div> : <div className="mt-5 rounded-2xl border border-[#c6f65c]/30 bg-[#c6f65c]/10 p-4 text-sm font-semibold text-[#d8ff96]">Successful trade. No further action is needed.</div>)}<dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[#a9afa9]">Submitted</dt><dd className="mt-1 font-semibold">{new Date(receipt.issuedAt).toLocaleString()}</dd></div>{receipt.resolvedAt && <div><dt className="text-[#a9afa9]">Result time</dt><dd className="mt-1 font-semibold">{new Date(receipt.resolvedAt).toLocaleString()}</dd></div>}<div><dt className="text-[#a9afa9]">Status</dt><dd className="mt-1 font-semibold text-[#d8ff96]">{receipt.status}</dd></div><div><dt className="text-[#a9afa9]">Trade type</dt><dd className="mt-1 font-semibold">{isGiftCard ? "Gift card sale" : "Crypto withdrawal"}</dd></div><div><dt className="text-[#a9afa9]">Customer</dt><dd className="mt-1 font-semibold">{receipt.customer}</dd></div><div><dt className="text-[#a9afa9]">Item</dt><dd className="mt-1 font-semibold">{itemName ?? "Trade item"}</dd></div><div><dt className="text-[#a9afa9]">Submitted value</dt><dd className="mt-1 font-semibold">${receipt.trade.amountUsd.toLocaleString()}</dd></div><div><dt className="text-[#a9afa9]">Rate</dt><dd className="mt-1 font-semibold">{formatNaira(receipt.trade.nairaPerUsd)} / $1</dd></div><div><dt className="text-[#a9afa9]">Expected payout</dt><dd className="mt-1 text-lg font-bold text-[#c6f65c]">{formatNaira(receipt.trade.expectedPayoutNaira)}</dd></div></dl>{isGiftCard && receipt.trade.giftCard && <div className="mt-6 rounded-2xl bg-[#1a1d1d] p-4 text-sm"><p className="text-xs font-bold tracking-wide text-[#a9afa9]">GIFTCARD DETAILS</p><p className="mt-2 font-semibold">{receipt.trade.giftCard.subcategory ?? receipt.trade.giftCard.country ?? "Card details submitted"}</p><p className="mt-1 text-[#a9afa9]">{receipt.trade.giftCard.cardDetails}{receipt.trade.giftCard.imageSubmitted ? " · Image attached" : ""}</p></div>}{!isGiftCard && receipt.trade.crypto && <div className="mt-6 rounded-2xl bg-[#1a1d1d] p-4 text-sm"><p className="text-xs font-bold tracking-wide text-[#a9afa9]">PAYOUT ACCOUNT</p><p className="mt-2 font-semibold">{receipt.trade.crypto.payoutBankName ?? "Bank account"}</p><p className="mt-1 text-[#a9afa9]">{receipt.trade.crypto.payoutAccountName} · {receipt.trade.crypto.payoutAccountNumber}</p></div>}<div className="mt-7 flex flex-wrap gap-3"><Link href={`/trade/${orderId}`} className="rounded-xl bg-[#c6f65c] px-5 py-3 text-sm font-bold text-[#161818]">Open trade room</Link><button type="button" onClick={() => window.print()} className="rounded-xl border border-[#f4f3ee]/20 px-5 py-3 text-sm font-bold transition hover:border-[#c6f65c] hover:bg-[#c6f65c]/10">Print receipt</button></div></div></section></div></main>;
}
