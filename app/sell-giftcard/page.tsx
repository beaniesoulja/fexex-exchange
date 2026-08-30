"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { formatNaira } from "@/lib/currency";
import { AppHeader } from "@/components/app-header";

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
  nairaPayoutPerUsd: number;
  available: boolean;
}

interface DefaultBankAccount {
  bankName: string;
  bankAccountNumber: string;
  legalName: string;
}

export default function SellGiftcardPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#161818] text-[#a9afa9]">Loading trade...</main>}><SellGiftcardContent /></Suspense>;
}

function SellGiftcardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tradeType = searchParams.get("type") === "crypto" ? "crypto" : "giftcard";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rateError, setRateError] = useState("");
  const [giftCardOptions, setGiftCardOptions] = useState<GiftCardOption[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [amount, setAmount] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [cryptoOptions, setCryptoOptions] = useState<CryptoOption[]>([]);
  const [cryptoRatesLoading, setCryptoRatesLoading] = useState(true);
  const [cryptoRateError, setCryptoRateError] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [cryptoUsdValue, setCryptoUsdValue] = useState("");
  const [cryptoMessage, setCryptoMessage] = useState("");
  const [cryptoSubmitting, setCryptoSubmitting] = useState(false);
  const [defaultBankAccount, setDefaultBankAccount] = useState<DefaultBankAccount | null>(null);

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

  useEffect(() => {
    if (status !== "authenticated") return;

    let active = true;
    void Promise.all([
      fetch("/api/crypto-rates").then(async (response) => {
        if (!response.ok) throw new Error("Failed to load crypto rates");
        return response.json();
      }),
      fetch("/api/user/profile").then(async (response) => response.ok ? response.json() : null),
    ])
      .then(([rates, profile]) => {
        if (!active) return;
        setCryptoOptions(rates.cryptoAssets ?? []);
        if (profile?.bankName && profile?.bankAccountNumber && profile?.legalName) {
          setDefaultBankAccount({ bankName: profile.bankName, bankAccountNumber: profile.bankAccountNumber, legalName: profile.legalName });
        }
      })
      .catch((error) => {
        console.error("Failed to load crypto trade details", error);
        if (active) setCryptoRateError("We could not load crypto trading rates. Please try again.");
      })
      .finally(() => {
        if (active) setCryptoRatesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);

  const selectedGiftCard = giftCardOptions.find((giftCard) => giftCard.name === selectedBrand);
  const selectedCryptoOption = cryptoOptions.find((crypto) => crypto.asset === selectedCrypto);
  const numericAmount = Number(amount);
  const numericCryptoUsdValue = Number(cryptoUsdValue);
  const estimatedPayout = selectedGiftCard?.available && Number.isFinite(numericAmount) && numericAmount > 0
    ? Math.round(numericAmount * selectedGiftCard.nairaPayoutPerUsd)
    : null;
  const estimatedCryptoPayout = selectedCryptoOption?.available && Number.isFinite(numericCryptoUsdValue) && numericCryptoUsdValue > 0
    ? Math.round(numericCryptoUsdValue * selectedCryptoOption.nairaPayoutPerUsd)
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
          country: "US",
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

      router.push(data.tradeRoom ?? `/trade/${data.orderId}`);
    } catch {
      setMessage("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoWithdrawal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = cryptoOptions.find((crypto) => crypto.asset === selectedCrypto);
    if (!selected?.available) {
      setCryptoMessage("Choose a crypto asset with an active payout rate.");
      return;
    }
    if (!defaultBankAccount) {
      setCryptoMessage("Save a default bank account in your dashboard before requesting a withdrawal.");
      return;
    }

    setCryptoSubmitting(true);
    setCryptoMessage("");
    try {
      const response = await fetch("/api/crypto-withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: selectedCrypto, usdValue: Number(cryptoUsdValue) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setCryptoMessage(data.error ?? "We could not submit your withdrawal request.");
        return;
      }
      setCryptoMessage(`Withdrawal ${data.orderId} submitted for Admin review. Expected payout: ${formatNaira(data.expectedPayout)}.`);
      setSelectedCrypto("");
      setCryptoUsdValue("");
    } catch {
      setCryptoMessage("A network error occurred. Please try again.");
    } finally {
      setCryptoSubmitting(false);
    }
  };

  if (status === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-[#161818] text-[#a9afa9]">Loading...</main>;
  }

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] text-[#f4f3ee]">
      <AppHeader username={session?.user?.username} avatarData={session?.user?.avatarData} />
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <div className="mt-7 rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <p className="text-sm font-semibold text-[#c6f65c]">NAIRA GIFT CARD PAYOUTS</p>
          <h1 className="mt-2 text-3xl font-semibold">Sell a gift card</h1>
          <p className="mt-3 text-sm leading-6 text-[#a9afa9]">Choose a card, enter its USD value, and see your Naira payout update instantly.</p>

          <nav aria-label="Trade type" className="mt-6 grid grid-cols-2 rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-1">
            <button type="button" onClick={() => router.replace("/trade")} aria-pressed={tradeType === "giftcard"} className={`rounded-lg px-3 py-2.5 text-center text-sm font-bold transition ${tradeType === "giftcard" ? "bg-[#c6f65c] text-[#161818]" : "text-[#d7dbd4] hover:bg-[#2a2e2d] hover:text-[#c6f65c]"}`}>Sell Giftcard</button>
            <button type="button" onClick={() => router.replace("/trade?type=crypto")} aria-pressed={tradeType === "crypto"} className={`rounded-lg px-3 py-2.5 text-center text-sm font-bold transition ${tradeType === "crypto" ? "bg-[#d6c7ff] text-[#161818]" : "text-[#d7dbd4] hover:bg-[#2a2e2d] hover:text-[#d6c7ff]"}`}>Sell Crypto</button>
          </nav>

          {tradeType === "giftcard" ? <form onSubmit={handleSubmit} className="mt-7 space-y-5">
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
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f4f3ee]/10 bg-[#f4f3ee] p-1.5">
                          <Image src={giftCard.icon} alt={`${giftCard.name} icon`} width={32} height={32} className="h-full w-full object-contain" />
                        </span>
                        <span className="mt-5 block text-sm font-semibold text-[#f4f3ee]">{giftCard.name}</span>
                        <span className={`mt-1 block text-xs font-medium ${giftCard.available ? "text-[#c6f65c]" : "text-[#777a75]"}`}>
                          {giftCard.available ? `${formatNaira(giftCard.nairaPayoutPerUsd)} / $1` : "Currently paused"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>
            <div>
              <label htmlFor="amount" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Card value (USD)</label>
              <input id="amount" name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 100" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
            </div>
            {selectedGiftCard && (
              <div className="rounded-2xl border border-[#c6f65c]/25 bg-[#c6f65c]/10 p-4">
                <p className="text-xs font-semibold tracking-wide text-[#d8ff96]">LIVE PAYOUT ESTIMATE</p>
                {selectedGiftCard.available ? (
                  <>
                    <p className="mt-2 text-sm text-[#d7dbd4]">{selectedGiftCard.name} pays {formatNaira(selectedGiftCard.nairaPayoutPerUsd)} for every $1 of card value.</p>
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
          </form> : <form onSubmit={handleCryptoWithdrawal} className="mt-7 space-y-5">
            <div>
              <p className="text-sm font-semibold text-[#d6c7ff]">CRYPTO TO NAIRA WITHDRAWAL</p>
              <h2 className="mt-2 text-2xl font-semibold">Sell crypto</h2>
              <p className="mt-2 text-sm leading-6 text-[#a9afa9]">Select the crypto you are selling, enter its USD value, and submit the Naira withdrawal request for Admin review.</p>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-medium text-[#d7dbd4]">Choose the crypto you are selling</legend>
              {cryptoRatesLoading ? <div className="rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-4 text-sm text-[#a9afa9]">Loading today&apos;s crypto rates...</div> : cryptoRateError ? <p role="alert" className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{cryptoRateError}</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cryptoOptions.map((crypto) => {
                  const selected = crypto.asset === selectedCrypto;
                  return <button key={crypto.asset} type="button" onClick={() => setSelectedCrypto(crypto.asset)} aria-pressed={selected} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-[#d6c7ff] bg-[#d6c7ff]/10" : "border-[#f4f3ee]/10 bg-[#1a1d1d] hover:border-[#d6c7ff]/60"}`}>
                    <Image src={`/crypto-icons/${crypto.asset.toLowerCase()}.svg`} alt="" width={40} height={40} className="h-10 w-10" />
                    <span className="mt-5 block text-sm font-semibold text-[#f4f3ee]">{crypto.asset}</span>
                    <span className={`mt-1 block text-xs font-medium ${crypto.available ? "text-[#c6f65c]" : "text-[#777a75]"}`}>{crypto.available ? `${formatNaira(crypto.nairaPayoutPerUsd)} / $1` : "Currently paused"}</span>
                  </button>;
                })}
              </div>}
            </fieldset>
            <div>
              <label htmlFor="crypto-usd-value" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Crypto value you are selling (USD)</label>
              <input id="crypto-usd-value" type="number" inputMode="decimal" min="0.01" step="0.01" required value={cryptoUsdValue} onChange={(event) => setCryptoUsdValue(event.target.value)} placeholder="e.g. 100" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#d6c7ff] focus:ring-2 focus:ring-[#d6c7ff]/20" />
            </div>
            {selectedCryptoOption && <div className="rounded-2xl border border-[#d6c7ff]/25 bg-[#d6c7ff]/10 p-4"><p className="text-xs font-semibold tracking-wide text-[#e5dcff]">LIVE NAIRA WITHDRAWAL ESTIMATE</p><p className="mt-2 text-sm text-[#d7dbd4]">{selectedCryptoOption.asset} pays {formatNaira(selectedCryptoOption.nairaPayoutPerUsd)} for every $1 of submitted value.</p><p className="mt-2 text-2xl font-bold text-[#f4f3ee]">{estimatedCryptoPayout === null ? "Enter a crypto value" : formatNaira(estimatedCryptoPayout)}</p></div>}
              <div className="rounded-2xl border border-[#c6f65c]/25 bg-[#c6f65c]/10 p-4"><p className="text-xs font-semibold tracking-wide text-[#d8ff96]">DEFAULT WITHDRAWAL ACCOUNT</p>{defaultBankAccount ? <><p className="mt-2 font-semibold text-[#f4f3ee]">{defaultBankAccount.bankName}</p><p className="text-sm text-[#d7dbd4]">{defaultBankAccount.legalName} · ••••••{defaultBankAccount.bankAccountNumber.slice(-4)}</p></> : <p className="mt-2 text-sm text-[#d7dbd4]">Save a default bank account in <Link href="/wallet#settings" className="font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Wallet settings</Link> before withdrawing.</p>}</div>
            {cryptoMessage && <p role="status" className="rounded-xl bg-[#d6c7ff]/10 px-4 py-3 text-sm text-[#e5dcff]">{cryptoMessage}</p>}
            <button type="submit" disabled={cryptoSubmitting || !selectedCryptoOption?.available || !defaultBankAccount} className="w-full rounded-xl bg-[#d6c7ff] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#e5dcff] disabled:cursor-not-allowed disabled:opacity-60">{cryptoSubmitting ? "Submitting withdrawal..." : "Request withdrawal"}</button>
          </form>}
        </div>
      </div>
    </main>
  );
}
