"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatNaira } from "@/lib/currency";

interface GiftCardOption {
  name: string;
  code: string;
  nairaPayoutPerThousand: number;
  available: boolean;
}

export default function SellGiftcardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rateError, setRateError] = useState("");
  const [giftCardOptions, setGiftCardOptions] = useState<GiftCardOption[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [amount, setAmount] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    let active = true;
    void fetch("/api/gift-cards")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load gift card prices");
        return response.json();
      })
      .then((data) => {
        if (active) setGiftCardOptions(data.giftCards ?? []);
      })
      .catch((error) => {
        console.error("Failed to fetch gift card prices", error);
        if (active) setRateError("We could not load live gift-card rates. Please refresh and try again.");
      })
      .finally(() => {
        if (active) setRatesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);

  const selectedGiftCard = giftCardOptions.find((giftCard) => giftCard.name === selectedBrand);
  const numericAmount = Number(amount);
  const estimatedPayout = selectedGiftCard?.available && Number.isFinite(numericAmount) && numericAmount > 0
    ? Math.round((numericAmount / 1000) * selectedGiftCard.nairaPayoutPerThousand)
    : null;

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Please choose an image under 2MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGiftCard?.available) {
      setMessage("Choose a gift card with an active payout rate to continue.");
      return;
    }

    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: selectedBrand,
          country: "NG",
          amount: Number(formData.get("amount")),
          cardCode: formData.get("cardCode"),
          cardPin: formData.get("cardPin"),
          imageBase64,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "We could not submit your gift card.");
        return;
      }

      setMessage(`Order ${data.orderId} submitted. Expected payout: ${formatNaira(data.expectedPayout)}.`);
      event.currentTarget.reset();
      setSelectedBrand("");
      setAmount("");
      setImagePreview(null);
      setImageBase64(null);
    } catch {
      setMessage("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-[#161818] text-[#a9afa9]">Loading...</main>;
  }

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] px-4 py-8 text-[#f4f3ee] sm:py-12">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/" aria-label="Fexex home">
          <Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="h-8 w-auto" />
        </Link>
        <div className="mt-7 rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <p className="text-sm font-semibold text-[#c6f65c]">NAIRA GIFT CARD PAYOUTS</p>
          <h1 className="mt-2 text-3xl font-semibold">Sell a gift card</h1>
          <p className="mt-3 text-sm leading-6 text-[#a9afa9]">Choose a card, see today&apos;s payout rate, then enter its Naira value for an instant estimate.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <fieldset>
              <legend className="mb-3 text-sm font-medium text-[#d7dbd4]">Choose the gift card you are selling</legend>
              {ratesLoading ? (
                <div className="rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-4 text-sm text-[#a9afa9]">Loading today&apos;s rates...</div>
              ) : rateError ? (
                <p role="alert" className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{rateError}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {giftCardOptions.map((giftCard) => {
                    const selected = giftCard.name === selectedBrand;
                    return (
                      <button
                        key={giftCard.code}
                        type="button"
                        onClick={() => setSelectedBrand(giftCard.name)}
                        aria-pressed={selected}
                        className={`rounded-2xl border p-4 text-left transition ${selected ? "border-[#c6f65c] bg-[#c6f65c]/10" : "border-[#f4f3ee]/10 bg-[#1a1d1d] hover:border-[#d6c7ff]/60"}`}
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6c7ff]/15 text-[10px] font-bold tracking-wide text-[#e5dcff]">{giftCard.code}</span>
                        <span className="mt-5 block text-sm font-semibold text-[#f4f3ee]">{giftCard.name}</span>
                        <span className={`mt-1 block text-xs font-medium ${giftCard.available ? "text-[#c6f65c]" : "text-[#777a75]"}`}>
                          {giftCard.available ? `${formatNaira(giftCard.nairaPayoutPerThousand)} / ₦1,000` : "Currently paused"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>
            <div>
              <label htmlFor="amount" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card value (₦)</label>
              <input id="amount" name="amount" type="number" min="1" step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 100000" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
            </div>
            {selectedGiftCard && (
              <div className="rounded-2xl border border-[#c6f65c]/25 bg-[#c6f65c]/10 p-4">
                <p className="text-xs font-semibold tracking-wide text-[#d8ff96]">LIVE PAYOUT ESTIMATE</p>
                {selectedGiftCard.available ? (
                  <>
                    <p className="mt-2 text-sm text-[#d7dbd4]">{selectedGiftCard.name} pays {formatNaira(selectedGiftCard.nairaPayoutPerThousand)} for every ₦1,000 of card value.</p>
                    <p className="mt-2 text-2xl font-bold text-[#f4f3ee]">{estimatedPayout === null ? "Enter a card value" : formatNaira(estimatedPayout)}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[#d7dbd4]">This card is currently paused. Choose a card with an active rate, or check back later.</p>
                )}
              </div>
            )}
            <div>
              <label htmlFor="image" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card image <span className="text-[#777a75]">(optional, max 2MB)</span></label>
              <input id="image" type="file" accept="image/*" onChange={handleImageChange} className="w-full rounded-xl border border-dashed border-[#f4f3ee]/20 bg-[#1a1d1d] p-3 text-sm text-[#a9afa9] file:mr-4 file:rounded-lg file:border-0 file:bg-[#c6f65c] file:px-3 file:py-2 file:font-semibold file:text-[#161818] hover:file:bg-[#d9ff86]" />
              {imagePreview && <Image src={imagePreview} alt="Gift card preview" width={512} height={220} unoptimized className="mt-3 h-44 w-full rounded-xl border border-white/10 object-cover" />}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="card-code" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card code <span className="text-[#777a75]">(optional)</span></label>
                <input id="card-code" name="cardCode" type="text" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
              </div>
              <div>
                <label htmlFor="card-pin" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card PIN <span className="text-[#777a75]">(optional)</span></label>
                <input id="card-pin" name="cardPin" type="text" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
              </div>
            </div>

            {message && <p role="status" className="rounded-xl bg-[#c6f65c]/10 px-4 py-3 text-sm text-[#d8ff96]">{message}</p>}

            <button type="submit" disabled={loading || !selectedGiftCard?.available} className="w-full rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Submitting..." : "Submit gift card"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
