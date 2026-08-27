"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatNaira } from "@/lib/currency";
import { giftCards } from "@/lib/gift-cards";

export default function SellGiftcardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

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
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: formData.get("brand"),
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
          <p className="mt-3 text-sm leading-6 text-[#a9afa9]">Enter the card value in Naira. Your approved payout and wallet balance are always in ₦.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="brand" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Gift card brand</label>
              <select id="brand" name="brand" required defaultValue="" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20">
                <option value="" disabled>Select a gift card</option>
                {giftCards.map((giftCard) => (
                  <option key={giftCard.code} value={giftCard.name}>{giftCard.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="amount" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card value (₦)</label>
              <input id="amount" name="amount" type="number" min="1" step="1" required placeholder="e.g. 100000" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
            </div>
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

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Submitting..." : "Submit gift card"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
