"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatNaira } from "@/lib/currency";

interface GiftCardOption {
  name: string;
  code: string;
  nairaPayoutPerUsd: number;
  available: boolean;
}

export default function GiftcardCalculatorPage() {
  const [giftCards, setGiftCards] = useState<GiftCardOption[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadRates = useCallback(async () => {
    try {
      const response = await fetch("/api/gift-cards", { cache: "no-store" });
      if (!response.ok) throw new Error("Rates could not be loaded");

      const data = await response.json();
      setGiftCards(data.giftCards ?? []);
      setError("");
      setUpdatedAt(new Date());
    } catch {
      setError("Live rates are temporarily unavailable. Please try again shortly.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadRates(), 0);
    const interval = window.setInterval(() => void loadRates(), 3000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadRates]);

  const activeCards = useMemo(() => giftCards.filter((card) => card.available), [giftCards]);
  const selectedCard = giftCards.find((card) => card.name === selectedName);
  const numericAmount = Number(amount);
  const payout = selectedCard?.available && Number.isFinite(numericAmount) && numericAmount > 0
    ? Math.round(numericAmount * selectedCard.nairaPayoutPerUsd)
    : null;

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] text-[#f4f3ee]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <Link href="/" aria-label="FEXEX home">
          <Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="h-8 w-auto" priority />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/trade" className="hidden text-sm font-semibold text-[#d7dbd4] transition hover:text-[#c6f65c] sm:block">
            Sell a card
          </Link>
          <Link href="/login" className="rounded-full border border-[#f4f3ee]/15 px-4 py-2 text-xs font-bold text-[#f4f3ee] transition hover:border-[#c6f65c]/60 hover:bg-[#c6f65c]/10 sm:text-sm">
            Log in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pb-28 sm:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#c6f65c]/25 bg-[#c6f65c]/10 px-3 py-1 text-xs font-bold tracking-wide text-[#d8ff96]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f65c]" /> LIVE FEXEX RATES
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Gift card value,<br /><span className="fexex-serif text-[#d6c7ff]">made clear in Naira.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#a9afa9] sm:text-lg">Choose the card you hold, enter its value, and get an instant Naira payout estimate from today&apos;s FEXEX buying rates.</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section aria-label="Gift card rate calculator" className="rounded-[2rem] border border-[#f4f3ee]/10 bg-[#202323] p-5 shadow-2xl shadow-black/30 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f4f3ee]/10 pb-5">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-[#c6f65c]">CALCULATOR</p>
                <h2 className="mt-1 text-2xl font-semibold">What is your card worth?</h2>
              </div>
              <span className="rounded-full bg-[#f4f3ee]/5 px-3 py-1.5 text-xs font-medium text-[#a9afa9]">Naira payouts only</span>
            </div>

            {isLoading ? (
              <div className="mt-6 rounded-2xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-5 text-sm text-[#a9afa9]">Loading live FEXEX rates...</div>
            ) : error ? (
              <div role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-100">{error}</div>
            ) : (
              <div className="mt-6 space-y-6">
                <div>
                  <label htmlFor="gift-card" className="mb-2 block text-sm font-semibold text-[#d7dbd4]">1. Choose your gift card</label>
                  <select id="gift-card" value={selectedName} onChange={(event) => setSelectedName(event.target.value)} className="w-full appearance-none rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3.5 text-sm font-medium text-[#f4f3ee] outline-none transition focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/15">
                    <option value="">Select a card</option>
                    {giftCards.map((card) => (
                      <option key={card.code} value={card.name} disabled={!card.available}>
                        {card.name}{card.available ? "" : " — not buying today"}
                      </option>
                    ))}
                  </select>
                  {selectedCard && (
                    <p className={`mt-2 text-xs font-medium ${selectedCard.available ? "text-[#d8ff96]" : "text-[#f2b4b4]"}`}>
                      {selectedCard.available ? `FEXEX is buying ${selectedCard.name} at ${formatNaira(selectedCard.nairaPayoutPerUsd)} per $1 card value.` : `FEXEX is not buying ${selectedCard.name} right now.`}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="card-value" className="mb-2 block text-sm font-semibold text-[#d7dbd4]">2. Enter card value</label>
                  <div className="flex overflow-hidden rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] transition focus-within:border-[#c6f65c] focus-within:ring-2 focus-within:ring-[#c6f65c]/15">
                    <span className="flex items-center border-r border-[#f4f3ee]/10 px-4 text-sm font-bold text-[#a9afa9]">$</span>
                    <input id="card-value" type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-lg font-semibold text-[#f4f3ee] outline-none placeholder:text-[#777a75]" />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#777a75]">Enter the face value shown on your gift card. Your payout is quoted in Naira.</p>
                </div>

                <div className="rounded-2xl border border-[#c6f65c]/30 bg-[#c6f65c]/10 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold tracking-[0.16em] text-[#d8ff96]">ESTIMATED NAIRA PAYOUT</p>
                    <span className="rounded-full bg-[#c6f65c] px-2.5 py-1 text-[10px] font-extrabold text-[#161818]">LIVE</span>
                  </div>
                  <p className="mt-3 text-4xl font-bold tracking-tight text-[#f4f3ee] sm:text-5xl">{payout === null ? "₦0" : formatNaira(payout)}</p>
                  <p className="mt-3 text-sm leading-6 text-[#d7dbd4]">{selectedCard?.available ? `${formatNaira(selectedCard.nairaPayoutPerUsd)} × your card value` : "Select a card and enter its value to calculate your payout."}</p>
                </div>

                <Link href="/trade" className="flex w-full items-center justify-center rounded-xl bg-[#c6f65c] px-4 py-3.5 text-sm font-extrabold text-[#161818] transition hover:bg-[#d9ff86]">
                  Start a gift card trade <span className="ml-2 text-lg">→</span>
                </Link>
              </div>
            )}
          </section>

          <aside className="rounded-[2rem] border border-[#f4f3ee]/10 bg-[#1a1d1d] p-5 sm:p-7">
            <p className="text-xs font-bold tracking-[0.18em] text-[#d6c7ff]">TODAY&apos;S MARKET</p>
            <h2 className="mt-2 text-2xl font-semibold">Cards we&apos;re buying</h2>
            <p className="mt-2 text-sm leading-6 text-[#a9afa9]">Only active categories set in the FEXEX admin dashboard appear here.</p>

            <div className="mt-6 space-y-2">
              {isLoading ? (
                <div className="h-32 animate-pulse rounded-2xl bg-[#f4f3ee]/5" />
              ) : activeCards.length ? (
                activeCards.sort((a, b) => b.nairaPayoutPerUsd - a.nairaPayoutPerUsd).map((card) => (
                  <button key={card.code} type="button" onClick={() => setSelectedName(card.name)} className="flex w-full items-center justify-between rounded-xl border border-transparent bg-[#202323] p-3 text-left transition hover:border-[#c6f65c]/45 hover:bg-[#202323]/80">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d6c7ff]/15 text-[10px] font-extrabold tracking-wide text-[#e5dcff]">{card.code}</span>
                      <span className="text-sm font-semibold">{card.name}</span>
                    </span>
                    <span className="text-right text-xs font-bold text-[#d8ff96]">{formatNaira(card.nairaPayoutPerUsd)}<span className="block pt-0.5 text-[10px] font-medium text-[#777a75]">per $1</span></span>
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-[#f4f3ee]/10 p-4 text-sm leading-6 text-[#a9afa9]">There are no active gift-card rates right now. Please check back soon.</p>
              )}
            </div>

            <div className="mt-6 border-t border-[#f4f3ee]/10 pt-5 text-xs leading-5 text-[#777a75]">
              Rates refresh automatically every 3 seconds and may change before a trade is reviewed.{updatedAt && <span className="block pt-1 text-[#a9afa9]">Updated just now.</span>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
