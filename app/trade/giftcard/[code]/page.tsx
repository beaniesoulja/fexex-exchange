"use client";
/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { AppHeader } from "@/components/app-header";
import { formatNaira } from "@/lib/currency";

interface GiftCardOption {
  name: string;
  code: string;
  icon: string;
  nairaPayoutPerUsd: number;
  available: boolean;
  subcategories: GiftCardSubcategory[];
}

interface GiftCardSubcategory {
  label: string;
  country: string | null;
  cardType: string | null;
  nairaPayoutPerUsd: number;
}

export default function GiftCardTradePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const [giftCard, setGiftCard] = useState<GiftCardOption | null>(null);
  const [loadingCard, setLoadingCard] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedSubcategoryLabel, setSelectedSubcategoryLabel] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !code) return;
    let active = true;
    void fetch("/api/gift-cards")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load gift cards");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        const card = (data.giftCards ?? []).find((item: GiftCardOption) => item.code.toLowerCase() === code.toLowerCase());
        if (!card) setLoadError("This gift card is not available on FEXEX.");
        else setGiftCard(card);
      })
      .catch(() => { if (active) setLoadError("We could not load this gift card. Please try again."); })
      .finally(() => { if (active) setLoadingCard(false); });
    return () => { active = false; };
  }, [code, status]);

  const selectedSubcategory = giftCard?.subcategories.find((subcategory) => subcategory.label === selectedSubcategoryLabel) ?? giftCard?.subcategories[0];
  const effectiveRate = selectedSubcategory?.nairaPayoutPerUsd ?? giftCard?.nairaPayoutPerUsd ?? 0;
  const numericAmount = Number(amount);
  const estimatedPayout = giftCard?.available && Number.isFinite(numericAmount) && numericAmount > 0
    ? Math.round(numericAmount * effectiveRate)
    : null;

  const changeImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      event.target.value = "";
      setMessage("Please choose an image under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitTrade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!giftCard?.available) {
      setMessage("This gift card is currently paused. Please choose another active card.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: giftCard.name,
          country: selectedSubcategory?.country ?? "US",
          subcategory: selectedSubcategory?.label,
          amount: Number(formData.get("amount")),
          cardCode: formData.get("cardCode"),
          cardPin: formData.get("cardPin"),
          imageBase64,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "We could not submit your gift card.");
        return;
      }
      router.push(data.tradeRoom ?? `/trade/${data.orderId}`);
    } catch {
      setMessage("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] text-[#f4f3ee]">
      <AppHeader username={session?.user?.username} avatarData={session?.user?.avatarData} />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Link href="/trade" className="text-sm font-semibold text-[#c6f65c] hover:text-[#d9ff86]">← All gift cards</Link>
        {loadingCard || status === "loading" ? <div className="mt-6 rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 text-sm text-[#a9afa9]">Loading gift card trade...</div> : loadError || !giftCard ? <section className="mt-6 rounded-3xl border border-red-400/20 bg-[#202323] p-8"><h1 className="text-2xl font-bold">Gift card unavailable</h1><p className="mt-2 text-sm text-red-200">{loadError || "This gift card was not found."}</p><Link href="/trade" className="mt-6 inline-flex rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818]">Choose another gift card</Link></section> : (
          <section className="mt-6 rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f4f3ee]/10 bg-[#f4f3ee] p-2"><img src={giftCard.icon} alt={`${giftCard.name} icon`} className="h-full w-full object-contain" /></span>
              <div><p className="text-sm font-semibold text-[#c6f65c]">NAIRA GIFT CARD PAYOUT</p><h1 className="mt-1 text-3xl font-semibold">Sell {giftCard.name}</h1></div>
            </div>
            <p className="mt-5 text-sm leading-6 text-[#a9afa9]">Submit only your {giftCard.name} details. Your payout estimate updates instantly in Naira.</p>

            <form onSubmit={submitTrade} className="mt-7 space-y-5">
              {giftCard.subcategories.length > 0 && <div><label htmlFor="subcategory" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Country and card type</label><select id="subcategory" required value={selectedSubcategory?.label ?? ""} onChange={(event) => setSelectedSubcategoryLabel(event.target.value)} className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20">{giftCard.subcategories.map((subcategory) => <option key={subcategory.label} value={subcategory.label}>{subcategory.label}</option>)}</select><p className="mt-2 text-xs text-[#a9afa9]">Rate: {formatNaira(selectedSubcategory?.nairaPayoutPerUsd ?? 0)} per $1</p></div>}
              <div>
                <label htmlFor="amount" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card value (USD)</label>
                <input id="amount" name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 100" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
              </div>
              <div className="rounded-2xl border border-[#c6f65c]/25 bg-[#c6f65c]/10 p-4"><p className="text-xs font-semibold tracking-wide text-[#d8ff96]">LIVE PAYOUT ESTIMATE</p>{giftCard.available ? <><p className="mt-2 text-sm text-[#d7dbd4]">{selectedSubcategory ? `${selectedSubcategory.label} pays ${formatNaira(effectiveRate)} for every $1 of card value.` : `${giftCard.name} pays ${formatNaira(effectiveRate)} for every $1 of card value.`}</p><p className="mt-2 text-2xl font-bold text-[#f4f3ee]">{estimatedPayout === null ? "Enter a card value" : formatNaira(estimatedPayout)}</p></> : <p className="mt-2 text-sm text-[#d7dbd4]">This card is currently paused. You can return to choose another card.</p>}</div>
              <div><label htmlFor="image" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card image <span className="text-[#777a75]">(optional, max 2MB)</span></label><input id="image" type="file" accept="image/*" onChange={changeImage} className="w-full rounded-xl border border-dashed border-[#f4f3ee]/20 bg-[#1a1d1d] p-3 text-sm text-[#a9afa9] file:mr-4 file:rounded-lg file:border-0 file:bg-[#c6f65c] file:px-3 file:py-2 file:font-semibold file:text-[#161818] hover:file:bg-[#d9ff86]" />{imagePreview && <Image src={imagePreview} alt="Gift card preview" width={512} height={220} unoptimized className="mt-3 h-44 w-full rounded-xl border border-white/10 object-cover" />}</div>
              <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="card-code" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card code <span className="text-[#777a75]">(optional)</span></label><input id="card-code" name="cardCode" type="text" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" /></div><div><label htmlFor="card-pin" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card PIN <span className="text-[#777a75]">(optional)</span></label><input id="card-pin" name="cardPin" type="text" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" /></div></div>
              {message && <p role="status" className="rounded-xl bg-[#c6f65c]/10 px-4 py-3 text-sm text-[#d8ff96]">{message}</p>}
              <button type="submit" disabled={submitting || !giftCard.available} className="w-full rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Submitting..." : `Submit ${giftCard.name} gift card`}</button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
