"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useAdmin } from "../admin-context";

export default function AdminRatesPage() {
  const { pricing, setPricing, pricingLoadError } = useAdmin();
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMessage, setPricingMessage] = useState("");
  const [catalogMessage, setCatalogMessage] = useState("");
  const [catalogSaving, setCatalogSaving] = useState<"giftcard" | "crypto" | null>(null);
  const [newGiftCard, setNewGiftCard] = useState({ brand: "", code: "", icon: "", nairaPayoutPerUsd: "", isActive: true });
  const [newCrypto, setNewCrypto] = useState({ asset: "", name: "", icon: "", nairaPayoutPerUsd: "", isActive: true });
  const [selectedGiftCardBrand, setSelectedGiftCardBrand] = useState("");
  const [newSubcategory, setNewSubcategory] = useState({ label: "", country: "", cardType: "", nairaPayoutPerUsd: "", isActive: true });
  const [subcategorySaving, setSubcategorySaving] = useState(false);

  const updateGiftCardRate = (brand: string, nairaPayoutPerUsd: number) => {
    setPricing((current) => current ? {
      ...current,
      giftCardRates: current.giftCardRates.map((rate) =>
        rate.brand === brand ? { ...rate, nairaPayoutPerUsd } : rate,
      ),
    } : current);
  };

  const toggleGiftCardBuying = (brand: string, isActive: boolean) => {
    setPricing((current) => current ? {
      ...current,
      giftCardRates: current.giftCardRates.map((rate) =>
        rate.brand === brand ? { ...rate, isActive } : rate,
      ),
    } : current);
  };

  const updateSubcategoryRate = (id: string, nairaPayoutPerUsd: number) => {
    setPricing((current) => current ? {
      ...current,
      giftCardRates: current.giftCardRates.map((rate) => ({
        ...rate,
        subcategories: rate.subcategories.map((subcategory) => subcategory.id === id ? { ...subcategory, nairaPayoutPerUsd } : subcategory),
      })),
    } : current);
  };

  const toggleSubcategoryBuying = (id: string, isActive: boolean) => {
    setPricing((current) => current ? {
      ...current,
      giftCardRates: current.giftCardRates.map((rate) => ({
        ...rate,
        subcategories: rate.subcategories.map((subcategory) => subcategory.id === id ? { ...subcategory, isActive } : subcategory),
      })),
    } : current);
  };

  const updateCryptoRate = (asset: string, nairaPayoutPerUsd: number) => {
    setPricing((current) => current ? {
      ...current,
      cryptoRates: current.cryptoRates.map((rate) => rate.asset === asset ? { ...rate, nairaPayoutPerUsd } : rate),
    } : current);
  };

  const toggleCryptoBuying = (asset: string, isActive: boolean) => {
    setPricing((current) => current ? {
      ...current,
      cryptoRates: current.cryptoRates.map((rate) => rate.asset === asset ? { ...rate, isActive } : rate),
    } : current);
  };

  const savePricing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pricing) return;

    setPricingSaving(true);
    setPricingMessage("");
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usdToNairaRate: pricing.usdToNairaRate,
          giftCardRates: pricing.giftCardRates.map(({ brand, nairaPayoutPerUsd, isActive }) => ({ brand, nairaPayoutPerUsd, isActive })),
          cryptoRates: pricing.cryptoRates.map(({ asset, nairaPayoutPerUsd, isActive }) => ({ asset, nairaPayoutPerUsd, isActive })),
          giftCardSubcategories: pricing.giftCardRates.flatMap((rate) => rate.subcategories.map(({ id, label, nairaPayoutPerUsd, isActive }) => ({ id, label, nairaPayoutPerUsd, isActive }))),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPricingMessage(data.error ?? "We could not save the pricing.");
        return;
      }

      setPricing((current) => current ? {
        ...current,
        usdToNairaRate: data.usdToNairaRate,
        giftCardRates: data.giftCardRates,
        cryptoRates: data.cryptoRates,
      } : current);
      setPricingMessage("Pricing saved. New trades will use these rates.");
    } catch {
      setPricingMessage("A network error occurred. Please try again.");
    } finally {
      setPricingSaving(false);
    }
  };

  const loadPricing = async () => {
    const response = await fetch("/api/admin/pricing");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "We could not refresh the catalog.");
    setPricing(data);
  };

  const addCatalogImage = (event: ChangeEvent<HTMLInputElement>, kind: "giftcard" | "crypto") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setCatalogMessage("Choose an image file under 2MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const icon = typeof reader.result === "string" ? reader.result : "";
      if (kind === "giftcard") setNewGiftCard((current) => ({ ...current, icon }));
      else setNewCrypto((current) => ({ ...current, icon }));
    };
    reader.readAsDataURL(file);
  };

  const createCatalogListing = async (event: FormEvent<HTMLFormElement>, kind: "giftcard" | "crypto") => {
    event.preventDefault();
    setCatalogSaving(kind);
    setCatalogMessage("");
    const listing = kind === "giftcard" ? newGiftCard : newCrypto;
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...listing, nairaPayoutPerUsd: Number(listing.nairaPayoutPerUsd) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCatalogMessage(data.error ?? "We could not add this listing.");
        return;
      }
      await loadPricing();
      if (kind === "giftcard") setNewGiftCard({ brand: "", code: "", icon: "", nairaPayoutPerUsd: "", isActive: true });
      else setNewCrypto({ asset: "", name: "", icon: "", nairaPayoutPerUsd: "", isActive: true });
      setCatalogMessage(data.message ?? "Catalog listing added.");
    } catch {
      setCatalogMessage("A network error occurred. Please try again.");
    } finally {
      setCatalogSaving(null);
    }
  };

  const createSubcategory = async () => {
    if (!selectedGiftCardBrand) return;
    if (!newSubcategory.label.trim() || newSubcategory.nairaPayoutPerUsd === "") {
      setCatalogMessage("Enter the sub-category name and Naira payout rate first.");
      return;
    }
    setSubcategorySaving(true);
    setCatalogMessage("");
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "giftcard-subcategory", brand: selectedGiftCardBrand, ...newSubcategory, nairaPayoutPerUsd: Number(newSubcategory.nairaPayoutPerUsd) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCatalogMessage(data.error ?? "We could not save this sub-category.");
        return;
      }
      await loadPricing();
      setNewSubcategory({ label: "", country: "", cardType: "", nairaPayoutPerUsd: "", isActive: true });
      setCatalogMessage(data.message ?? "Sub-category saved.");
    } catch {
      setCatalogMessage("A network error occurred. Please try again.");
    } finally {
      setSubcategorySaving(false);
    }
  };

  const selectedGiftCard = pricing?.giftCardRates.find((rate) => rate.brand === selectedGiftCardBrand) ?? null;

  return (
    <section className="fexex-pop-in mb-8 rounded-2xl border border-[#bfe3ff]/25 bg-[#202323] p-5 shadow-lg shadow-black/20 sm:p-6" aria-labelledby="pricing-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#bfe3ff]">DAILY PRICING</p>
          <h2 id="pricing-heading" className="mt-1 text-2xl font-bold text-[#f4f3ee]">Trade rates</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a9afa9]">Set the USD / USDT to Naira rate and each gift card&apos;s Naira payout. Changes apply only to new trades.</p>
        </div>
      </div>

      {pricing ? (
        <>
        <form onSubmit={savePricing} className="mt-6 space-y-6">
          <div className="max-w-sm">
            <label htmlFor="usd-to-naira-rate" className="mb-2 block text-sm font-semibold text-[#f4f3ee]">1 USD / USDT = Naira</label>
            <input
              id="usd-to-naira-rate"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={pricing.usdToNairaRate}
              onChange={(event) => setPricing((current) => current ? { ...current, usdToNairaRate: Number(event.target.value) } : current)}
              className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#bfe3ff] focus:ring-2 focus:ring-[#bfe3ff]/20"
            />
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#f4f3ee]">Gift card payout rates in Naira per USD</h3>
              <span className="text-xs text-[#a9afa9]">Toggle cards on only when buying</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pricing.giftCardRates.map((rate) => (
                <label key={rate.id} onClick={() => setSelectedGiftCardBrand(rate.brand)} className={`cursor-pointer rounded-xl border bg-[#1a1d1d] p-3 transition ${selectedGiftCardBrand === rate.brand ? "border-[#c6f65c] ring-2 ring-[#c6f65c]/20" : "border-[#f4f3ee]/10 hover:border-[#c6f65c]/50"}`}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[#d7dbd4]">{rate.brand}</span>
                    <span className="flex items-center gap-2 text-xs font-semibold text-[#a9afa9]">
                      Buying
                      <input
                        type="checkbox"
                        checked={rate.isActive}
                        onChange={(event) => toggleGiftCardBuying(rate.brand, event.target.checked)}
                        className="peer sr-only"
                      />
                      <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-[#343a38] transition peer-checked:bg-[#c6f65c] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-[#f4f3ee] after:transition peer-checked:after:translate-x-5" />
                    </span>
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="1000000"
                      step="1"
                      required
              value={rate.nairaPayoutPerUsd}
                      onChange={(event) => updateGiftCardRate(rate.brand, Number(event.target.value))}
                      className="min-w-0 flex-1 rounded-lg border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2 text-sm text-[#f4f3ee] outline-none focus:border-[#bfe3ff]"
                    />
                    <span className="text-xs text-[#a9afa9]">₦ / $1</span>
                  </span>
                </label>
              ))}
            </div>
            {selectedGiftCard && (
              <div className="mt-5 rounded-2xl border border-[#c6f65c]/25 bg-[#c6f65c]/5 p-4 sm:p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-semibold tracking-wide text-[#c6f65c]">{selectedGiftCard.brand.toUpperCase()} SUB-CATEGORIES</p><h4 className="mt-1 font-bold text-[#f4f3ee]">Country and card-type payout rates</h4></div>
                  <span className="text-xs text-[#a9afa9]">Set a rate and turn on only the variants you are buying.</span>
                </div>
                {selectedGiftCard.subcategories.length === 0 ? <p className="mt-4 text-sm text-[#a9afa9]">No sub-categories yet. Add the first one below.</p> : <div className="mt-4 space-y-3">{selectedGiftCard.subcategories.map((subcategory) => <div key={subcategory.id} className="grid gap-3 rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-center"><div className="min-w-0"><p className="text-sm font-semibold text-[#f4f3ee]">{subcategory.label}</p><p className="mt-1 text-xs text-[#a9afa9]">{[subcategory.country, subcategory.cardType].filter(Boolean).join(" · ") || "Custom card type"}</p></div><label className="flex items-center gap-2"><input type="number" min="0" max="1000000" step="1" value={subcategory.nairaPayoutPerUsd} onChange={(event) => updateSubcategoryRate(subcategory.id, Number(event.target.value))} className="min-w-0 flex-1 rounded-lg border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2 text-sm outline-none focus:border-[#c6f65c]" /><span className="shrink-0 text-xs text-[#a9afa9]">₦/$1</span></label><label className="flex items-center gap-2 text-xs font-semibold text-[#d7dbd4]"><input type="checkbox" checked={subcategory.isActive} onChange={(event) => toggleSubcategoryBuying(subcategory.id, event.target.checked)} /> Buying</label></div>)}</div>}
                <div className="mt-5 border-t border-[#f4f3ee]/10 pt-5">
                  <p className="text-sm font-semibold text-[#f4f3ee]">Add a {selectedGiftCard.brand} sub-category</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={newSubcategory.label} onChange={(event) => setNewSubcategory((current) => ({ ...current, label: event.target.value }))} placeholder="Display name / denominations" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" /><input value={newSubcategory.country} onChange={(event) => setNewSubcategory((current) => ({ ...current, country: event.target.value }))} placeholder="Country" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" /><input value={newSubcategory.cardType} onChange={(event) => setNewSubcategory((current) => ({ ...current, cardType: event.target.value }))} placeholder="Card type e.g. Ecode" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" /><input type="number" min="0" max="1000000" step="1" value={newSubcategory.nairaPayoutPerUsd} onChange={(event) => setNewSubcategory((current) => ({ ...current, nairaPayoutPerUsd: event.target.value }))} placeholder="Naira per $1" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" /></div>
                  <label className="mt-3 flex items-center gap-2 text-sm text-[#d7dbd4]"><input type="checkbox" checked={newSubcategory.isActive} onChange={(event) => setNewSubcategory((current) => ({ ...current, isActive: event.target.checked }))} /> FEXEX is buying this sub-category</label>
                  <button type="button" onClick={() => void createSubcategory()} disabled={subcategorySaving} className="mt-4 rounded-xl bg-[#c6f65c] px-4 py-2.5 text-sm font-bold text-[#161818] disabled:opacity-60">{subcategorySaving ? "Saving..." : "Add sub-category"}</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#f4f3ee]">Crypto payout rates in Naira per USD</h3>
              <span className="text-xs text-[#a9afa9]">Toggle assets on only when buying</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pricing.cryptoRates.map((rate) => (
                <label key={rate.id} className="rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-3">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[#d7dbd4]">{rate.asset}</span>
                    <span className="flex items-center gap-2 text-xs font-semibold text-[#a9afa9]">
                      Buying
                      <input type="checkbox" checked={rate.isActive} onChange={(event) => toggleCryptoBuying(rate.asset, event.target.checked)} className="peer sr-only" />
                      <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-[#343a38] transition peer-checked:bg-[#c6f65c] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-[#f4f3ee] after:transition peer-checked:after:translate-x-5" />
                    </span>
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <input type="number" inputMode="decimal" min="0" max="1000000" step="1" required value={rate.nairaPayoutPerUsd} onChange={(event) => updateCryptoRate(rate.asset, Number(event.target.value))} className="min-w-0 flex-1 rounded-lg border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2 text-sm text-[#f4f3ee] outline-none focus:border-[#bfe3ff]" />
                    <span className="text-xs text-[#a9afa9]">₦ / $1</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {pricingMessage && <p role="status" className="text-sm font-medium text-[#bfe3ff]">{pricingMessage}</p>}
          <button type="submit" disabled={pricingSaving} className="w-full rounded-xl bg-[#bfe3ff] px-5 py-3 font-bold text-[#161818] transition hover:bg-[#dbf1ff] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            {pricingSaving ? "Saving prices..." : "Save daily pricing"}
          </button>
        </form>
        <div className="mt-8 grid gap-5 border-t border-[#f4f3ee]/10 pt-6 lg:grid-cols-2">
          <form onSubmit={(event) => void createCatalogListing(event, "giftcard")} className="rounded-2xl border border-[#c6f65c]/25 bg-[#1a1d1d] p-5">
            <p className="text-xs font-semibold tracking-wide text-[#c6f65c]">CATALOG</p>
            <h3 className="mt-1 text-lg font-bold text-[#f4f3ee]">Add gift card</h3>
            <p className="mt-1 text-xs leading-5 text-[#a9afa9]">Add a card name, its customer-facing code, image, Naira price, and buying status.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input required value={newGiftCard.brand} onChange={(event) => setNewGiftCard((current) => ({ ...current, brand: event.target.value }))} placeholder="Gift card name" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" />
              <input required value={newGiftCard.code} onChange={(event) => setNewGiftCard((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="Code e.g. NKE" maxLength={16} className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#c6f65c]" />
              <input required type="number" min="0" max="1000000" step="1" value={newGiftCard.nairaPayoutPerUsd} onChange={(event) => setNewGiftCard((current) => ({ ...current, nairaPayoutPerUsd: event.target.value }))} placeholder="Naira per $1" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" />
              <label className="flex items-center gap-2 rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm text-[#d7dbd4]"><input type="checkbox" checked={newGiftCard.isActive} onChange={(event) => setNewGiftCard((current) => ({ ...current, isActive: event.target.checked }))} /> FEXEX is buying this card</label>
            </div>
            <label className="mt-3 block text-xs font-medium text-[#d7dbd4]">Image URL or upload</label>
            <input required={!newGiftCard.icon.startsWith("data:")} type="url" value={newGiftCard.icon.startsWith("data:") ? "" : newGiftCard.icon} onChange={(event) => setNewGiftCard((current) => ({ ...current, icon: event.target.value }))} placeholder="https://..." className="mt-1 w-full rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" />
            <input type="file" accept="image/*" onChange={(event) => addCatalogImage(event, "giftcard")} className="mt-2 block w-full text-xs text-[#a9afa9] file:mr-3 file:rounded-lg file:border-0 file:bg-[#c6f65c] file:px-3 file:py-2 file:font-semibold file:text-[#161818]" />
            {newGiftCard.icon && <p className="mt-2 text-xs text-[#d8ff96]">Gift-card image ready.</p>}
            <button type="submit" disabled={catalogSaving !== null} className="mt-4 w-full rounded-xl bg-[#c6f65c] px-4 py-3 text-sm font-bold text-[#161818] disabled:opacity-60">{catalogSaving === "giftcard" ? "Adding gift card..." : "Add gift card"}</button>
          </form>

          <form onSubmit={(event) => void createCatalogListing(event, "crypto")} className="rounded-2xl border border-[#bfe3ff]/25 bg-[#1a1d1d] p-5">
            <p className="text-xs font-semibold tracking-wide text-[#bfe3ff]">CATALOG</p>
            <h3 className="mt-1 text-lg font-bold text-[#f4f3ee]">Add crypto asset</h3>
            <p className="mt-1 text-xs leading-5 text-[#a9afa9]">List another asset FEXEX can buy, set its Naira price, and control whether it is live.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input required value={newCrypto.asset} onChange={(event) => setNewCrypto((current) => ({ ...current, asset: event.target.value.toUpperCase() }))} placeholder="Ticker e.g. XRP" maxLength={16} className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#bfe3ff]" />
              <input required value={newCrypto.name} onChange={(event) => setNewCrypto((current) => ({ ...current, name: event.target.value }))} placeholder="Name e.g. XRP" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#bfe3ff]" />
              <input required type="number" min="0" max="1000000" step="1" value={newCrypto.nairaPayoutPerUsd} onChange={(event) => setNewCrypto((current) => ({ ...current, nairaPayoutPerUsd: event.target.value }))} placeholder="Naira per $1" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#bfe3ff]" />
              <label className="flex items-center gap-2 rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm text-[#d7dbd4]"><input type="checkbox" checked={newCrypto.isActive} onChange={(event) => setNewCrypto((current) => ({ ...current, isActive: event.target.checked }))} /> FEXEX is buying this asset</label>
            </div>
            <label className="mt-3 block text-xs font-medium text-[#d7dbd4]">Icon URL or upload <span className="text-[#777a75]">(optional)</span></label>
            <input type="url" value={newCrypto.icon.startsWith("data:") ? "" : newCrypto.icon} onChange={(event) => setNewCrypto((current) => ({ ...current, icon: event.target.value }))} placeholder="https://..." className="mt-1 w-full rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#bfe3ff]" />
            <input type="file" accept="image/*" onChange={(event) => addCatalogImage(event, "crypto")} className="mt-2 block w-full text-xs text-[#a9afa9] file:mr-3 file:rounded-lg file:border-0 file:bg-[#bfe3ff] file:px-3 file:py-2 file:font-semibold file:text-[#161818]" />
            {newCrypto.icon && <p className="mt-2 text-xs text-[#dbf1ff]">Crypto icon ready.</p>}
            <button type="submit" disabled={catalogSaving !== null} className="mt-4 w-full rounded-xl bg-[#bfe3ff] px-4 py-3 text-sm font-bold text-[#161818] disabled:opacity-60">{catalogSaving === "crypto" ? "Adding crypto..." : "Add crypto asset"}</button>
          </form>
        </div>
        {catalogMessage && <p role="status" className="mt-4 text-sm font-medium text-[#bfe3ff]">{catalogMessage}</p>}
        </>
      ) : pricingLoadError ? (
        <p role="alert" className="mt-6 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{pricingLoadError}</p>
      ) : (
        <p className="mt-6 text-sm text-[#a9afa9]">Loading pricing controls...</p>
      )}
    </section>
  );
}
