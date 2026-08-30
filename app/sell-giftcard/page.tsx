"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { formatNaira } from "@/lib/currency";

interface GiftCardOption {
  name: string;
  code: string;
  icon: string;
  nairaPayoutPerUsd: number;
  available: boolean;
}

interface CryptoOption {
  asset: string;
  name: string;
  icon: string;
  nairaPayoutPerUsd: number;
  available: boolean;
}

export default function SellGiftcardPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#161818] text-[#a9afa9]">Loading trade...</main>}><TradeSelector /></Suspense>;
}

function TradeSelector() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tradeType = searchParams.get("type") === "crypto" ? "crypto" : "giftcard";
  const [giftCardOptions, setGiftCardOptions] = useState<GiftCardOption[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [rateError, setRateError] = useState("");
  const [cryptoOptions, setCryptoOptions] = useState<CryptoOption[]>([]);
  const [cryptoRatesLoading, setCryptoRatesLoading] = useState(true);
  const [cryptoRateError, setCryptoRateError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    void fetch("/api/gift-cards")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load gift card prices");
        return data;
      })
      .then((data) => { if (active) setGiftCardOptions(data.giftCards ?? []); })
      .catch((error: unknown) => { if (active) setRateError(error instanceof Error ? error.message : "We could not load live gift-card rates. Please try again."); })
      .finally(() => { if (active) setRatesLoading(false); });
    return () => { active = false; };
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    void fetch("/api/crypto-rates")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load crypto rates");
        return data;
      })
      .then((rates) => {
        if (!active) return;
        setCryptoOptions(rates.cryptoAssets ?? []);
      })
      .catch((error: unknown) => { if (active) setCryptoRateError(error instanceof Error ? error.message : "We could not load live crypto trading rates. Please try again."); })
      .finally(() => { if (active) setCryptoRatesLoading(false); });
    return () => { active = false; };
  }, [status]);

  if (status === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-[#161818] text-[#a9afa9]">Loading...</main>;
  }

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] text-[#f4f3ee]">
      <AppHeader username={session?.user?.username} avatarData={session?.user?.avatarData} />
      <div className="w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
        <section className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10">
          <p className={`text-sm font-semibold ${tradeType === "giftcard" ? "text-[#c6f65c]" : "text-[#d6c7ff]"}`}>{tradeType === "giftcard" ? "NAIRA GIFT CARD PAYOUTS" : "CRYPTO TO NAIRA WITHDRAWALS"}</p>
          <h1 className="mt-2 text-3xl font-semibold">{tradeType === "giftcard" ? "Choose a gift card" : "Sell crypto"}</h1>
          <p className="mt-3 text-sm leading-6 text-[#a9afa9]">{tradeType === "giftcard" ? "Select the gift card you want to sell to open its dedicated trade form." : "Select the crypto you are selling, enter its USD value, and submit a Naira withdrawal request."}</p>

          <nav aria-label="Trade type" className="mt-6 grid grid-cols-2 rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-1">
            <button type="button" onClick={() => router.replace("/trade")} aria-pressed={tradeType === "giftcard"} className={`rounded-lg px-3 py-2.5 text-center text-sm font-bold transition ${tradeType === "giftcard" ? "bg-[#c6f65c] text-[#161818]" : "text-[#d7dbd4] hover:bg-[#2a2e2d] hover:text-[#c6f65c]"}`}>Sell Giftcard</button>
            <button type="button" onClick={() => router.replace("/trade?type=crypto")} aria-pressed={tradeType === "crypto"} className={`rounded-lg px-3 py-2.5 text-center text-sm font-bold transition ${tradeType === "crypto" ? "bg-[#d6c7ff] text-[#161818]" : "text-[#d7dbd4] hover:bg-[#2a2e2d] hover:text-[#d6c7ff]"}`}>Sell Crypto</button>
          </nav>

          {tradeType === "giftcard" ? (
            <section className="mt-7">
              <h2 className="mb-3 text-sm font-medium text-[#d7dbd4]">Choose the gift card you are selling</h2>
              {ratesLoading ? <div className="rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-4 text-sm text-[#a9afa9]">Loading today&apos;s rates...</div> : rateError ? <p role="alert" className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{rateError}</p> : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {giftCardOptions.map((giftCard) => (
                    <Link key={giftCard.code} href={`/trade/giftcard/${encodeURIComponent(giftCard.code)}`} className={`rounded-2xl border p-4 text-left transition ${giftCard.available ? "border-[#f4f3ee]/10 bg-[#1a1d1d] hover:border-[#c6f65c] hover:bg-[#c6f65c]/10" : "border-[#f4f3ee]/10 bg-[#1a1d1d] hover:border-[#777a75]"}`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f4f3ee]/10 bg-[#f4f3ee] p-1.5"><img src={giftCard.icon} alt="" className="h-full w-full object-contain" /></span>
                      <span className="mt-5 block text-sm font-semibold text-[#f4f3ee]">{giftCard.name}</span>
                      <span className={`mt-1 block text-xs font-medium ${giftCard.available ? "text-[#c6f65c]" : "text-[#777a75]"}`}>{giftCard.available ? `${formatNaira(giftCard.nairaPayoutPerUsd)} / $1` : "Currently paused"}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ) : <section className="mt-7"><h2 className="mb-3 text-sm font-medium text-[#d7dbd4]">Choose the crypto you are selling</h2>{cryptoRatesLoading ? <div className="rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-4 text-sm text-[#a9afa9]">Loading today&apos;s crypto rates...</div> : cryptoRateError ? <p role="alert" className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{cryptoRateError}</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{cryptoOptions.map((crypto) => <Link key={crypto.asset} href={`/trade/crypto/${encodeURIComponent(crypto.asset.toLowerCase())}`} className={`rounded-2xl border p-4 text-left transition ${crypto.available ? "border-[#f4f3ee]/10 bg-[#1a1d1d] hover:border-[#d6c7ff] hover:bg-[#d6c7ff]/10" : "border-[#f4f3ee]/10 bg-[#1a1d1d] hover:border-[#777a75]"}`}><img src={crypto.icon} alt="" className="h-10 w-10 object-contain" /><span className="mt-5 block text-sm font-semibold text-[#f4f3ee]">{crypto.asset}</span><span className={`mt-1 block text-xs font-medium ${crypto.available ? "text-[#c6f65c]" : "text-[#777a75]"}`}>{crypto.available ? `${formatNaira(crypto.nairaPayoutPerUsd)} / $1` : "Currently paused"}</span></Link>)}</div>}</section>}
        </section>
      </div>
    </main>
  );
}
