"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { formatNaira } from "@/lib/currency";

interface GiftCardOption {
  name: string;
  code: string;
  icon: string;
  nairaPayoutPerUsd: number;
  available: boolean;
}

export default function SellGiftcardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [giftCardOptions, setGiftCardOptions] = useState<GiftCardOption[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [rateError, setRateError] = useState("");

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

  if (status === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-[#161818] text-[#a9afa9]">Loading...</main>;
  }

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] text-[#f4f3ee]">
      <AppHeader username={session?.user?.username} avatarData={session?.user?.avatarData} />
      <div className="w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
        <section className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10">
          <p className="text-sm font-semibold text-[#c6f65c]">NAIRA GIFT CARD PAYOUTS</p>
          <h1 className="mt-2 text-3xl font-semibold">Choose a gift card</h1>
          <p className="mt-3 text-sm leading-6 text-[#a9afa9]">Select the gift card you want to sell to open its dedicated trade form.</p>

          <section className="mt-7">
            <h2 className="mb-3 text-sm font-medium text-[#d7dbd4]">Choose the gift card you are selling</h2>
            {ratesLoading ? <div className="rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-4 text-sm text-[#a9afa9]">Loading today&apos;s rates...</div> : rateError ? <p role="alert" className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{rateError}</p> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {giftCardOptions.map((giftCard) => (
                  <Link key={giftCard.code} href={`/trade/giftcard/${encodeURIComponent(giftCard.code)}`} className={`group rounded-2xl border p-4 text-left transition duration-200 ${giftCard.available ? "border-[#f4f3ee]/10 bg-[#1a1d1d] hover:-translate-y-1 hover:border-[#c6f65c] hover:bg-[#c6f65c]/10" : "border-[#f4f3ee]/10 bg-[#1a1d1d] hover:border-[#777a75]"}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f4f3ee]/10 bg-[#f4f3ee] p-1.5 transition duration-200 group-hover:-rotate-6 group-hover:scale-110"><img src={giftCard.icon} alt="" className="h-full w-full object-contain" /></span>
                    <span className="mt-5 block text-sm font-semibold text-[#f4f3ee]">{giftCard.name}</span>
                    <span className={`mt-1 block text-xs font-medium ${giftCard.available ? "text-[#c6f65c]" : "text-[#777a75]"}`}>{giftCard.available ? `${formatNaira(giftCard.nairaPayoutPerUsd)} / $1` : "Currently paused"}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
