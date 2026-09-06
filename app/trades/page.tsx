"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AppHeader } from "@/components/app-header";
import { formatNaira } from "@/lib/currency";

type PendingTrade = {
  id: string;
  referenceId: string | null;
  type: "SELL_GIFTCARD" | "SELL_CRYPTO";
  status: "PENDING" | "PROCESSING";
  amount: number;
  totalValue: number;
  giftCardBrand: string | null;
  giftCardSubcategory: string | null;
  cryptoAsset: string | null;
  createdAt: string;
};

export default function PendingTradesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trades, setTrades] = useState<PendingTrade[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    let loadInFlight = false;
    const load = () => {
      if (document.visibilityState !== "visible" || loadInFlight) return;
      loadInFlight = true;
      void fetch("/api/user/trades", { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error ?? "We could not load your pending trades.");
          return data as { trades: PendingTrade[] };
        })
        .then((data) => { if (active) { setTrades(data.trades); setError(""); } })
        .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We could not load your pending trades."); })
        .finally(() => { loadInFlight = false; });
    };
    load();
    const timer = window.setInterval(load, 15_000);
    document.addEventListener("visibilitychange", load);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, [status]);

  if (status !== "authenticated") {
    return <main className="fexex-surface flex min-h-screen items-center justify-center bg-[#161818] text-sm text-[#a9afa9]">Loading your trade sessions...</main>;
  }

  return <main className="fexex-surface min-h-screen bg-[#161818] text-[#f4f3ee]"><AppHeader username={session?.user?.username} avatarData={session?.user?.avatarData} /><div className="mx-auto max-w-4xl p-4 md:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold tracking-[.16em] text-[#c6f65c]">TRADE TRACKER</p><h1 className="mt-2 text-3xl font-bold">Pending trades</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#a9afa9]">Every trade still being reviewed or paid appears here. Open one to continue the conversation, view its receipt, or share its Trade Session ID with support.</p></div><Link href="/trade" className="w-fit rounded-xl bg-[#c6f65c] px-4 py-3 text-sm font-bold text-[#161818] transition hover:bg-[#d9ff86]">Start a trade</Link></div>{error && <p role="alert" className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{error}</p>}{trades === null && !error ? <div className="mt-6 rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 text-sm text-[#a9afa9]">Loading pending trades...</div> : trades?.length ? <div className="mt-6 grid gap-4">{trades.map((trade) => { const item = trade.type === "SELL_GIFTCARD" ? trade.giftCardBrand ?? "Gift card" : `${trade.cryptoAsset ?? "Crypto"} withdrawal`; const sublabel = trade.type === "SELL_GIFTCARD" ? trade.giftCardSubcategory : "Naira withdrawal"; return <article key={trade.id} className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 shadow-lg shadow-black/15"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${trade.status === "PROCESSING" ? "bg-[#d6c7ff]/15 text-[#e5dcff]" : "bg-[#f5c76a]/15 text-[#f5c76a]"}`}>{trade.status === "PROCESSING" ? "PAYMENT PROCESSING" : "PENDING REVIEW"}</span><span className="break-all font-mono text-xs font-semibold text-[#d8ff96]">{trade.referenceId ?? `FEX-${trade.id.toUpperCase()}`}</span></div><h2 className="mt-3 text-xl font-bold">{item}</h2><p className="mt-1 text-sm text-[#a9afa9]">{sublabel ?? "Trade details submitted"} · Submitted {new Date(trade.createdAt).toLocaleString()}</p></div><div className="sm:text-right"><p className="text-xs font-semibold text-[#a9afa9]">EXPECTED PAYOUT</p><p className="mt-1 text-xl font-bold text-[#d8ff96]">{formatNaira(trade.totalValue)}</p></div></div><div className="mt-5 flex flex-wrap gap-3"><Link href={`/trade/${trade.id}`} className="rounded-xl bg-[#c6f65c] px-4 py-2.5 text-sm font-bold text-[#161818] transition hover:bg-[#d9ff86]">Open trade room</Link><Link href={`/trade/${trade.id}/receipt`} className="rounded-xl border border-[#f4f3ee]/15 px-4 py-2.5 text-sm font-bold text-[#d7dbd4] transition hover:border-[#c6f65c] hover:bg-[#c6f65c]/10">View receipt</Link></div></article>; })}</div> : <section className="mt-6 rounded-3xl border border-[#c6f65c]/20 bg-[#202323] p-10 text-center"><p className="text-lg font-bold">No pending trades</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#a9afa9]">You have no trades waiting for review right now. Completed and failed trades remain available in your dashboard activity.</p><Link href="/trade" className="mt-6 inline-flex rounded-xl bg-[#c6f65c] px-4 py-3 text-sm font-bold text-[#161818]">Start a trade</Link></section>}</div></main>;
}
