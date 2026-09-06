"use client";
import Image from "next/image";
import { useState } from "react";
import { formatNaira } from "@/lib/currency";
import { useAdmin } from "../admin-context";

export default function AdminVerificationPage() {
  const { orders, setOrders, fetchAnalytics } = useAdmin();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [failureDescriptions, setFailureDescriptions] = useState<Record<string, string>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;

  const handleAction = async (orderId: string, action: "APPROVE" | "REJECT" | "SUCCESS" | "FAIL") => {
    setActionLoading(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action, resultDescription: failureDescriptions[orderId] ?? "" }),
      });

      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setFailureDescriptions((current) => {
          const next = { ...current };
          delete next[orderId];
          return next;
        });
        void fetchAnalytics();
        alert(`✅ ${action === "SUCCESS" ? "Gift-card trade marked successful" : action === "FAIL" ? "Gift-card trade marked failed" : action === "APPROVE" ? "Withdrawal approved" : "Trade rejected"}!`);
      } else {
        const data = await res.json().catch(() => null);
        alert(`❌ ${data?.error ?? "Failed to process order."}`);
      }
    } catch {
      alert("❌ Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section aria-labelledby="verification-heading">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold tracking-wide text-[#f5c76a]">TRADE & TRANSACTION MANAGEMENT</p><h2 id="verification-heading" className="mt-1 text-2xl font-bold">Split-screen verification desk</h2><p className="mt-1 text-sm text-[#a9afa9]">Inspect the submitted evidence, resolve the trade once, and leave a clear reason whenever it fails.</p></div><span className="rounded-full bg-[#f5c76a]/15 px-3 py-1.5 text-xs font-bold text-[#f5c76a]">{orders.length} awaiting review</span></div>
      {orders.length === 0 || !selectedOrder ? <div className="rounded-3xl border border-[#c6f65c]/20 bg-[#202323] p-10 text-center"><p className="text-lg font-bold">Verification queue is clear</p><p className="mt-2 text-sm text-[#a9afa9]">New gift-card and crypto trades will appear here automatically.</p></div> : <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] xl:max-h-[780px] xl:overflow-y-auto"><div className="border-b border-[#f4f3ee]/10 px-4 py-4"><p className="text-xs font-bold tracking-wide text-[#a9afa9]">REVIEW QUEUE</p></div><div className="p-2">{orders.map((order) => <button key={order.id} type="button" onClick={() => setSelectedOrderId(order.id)} className={`mb-1 w-full rounded-2xl p-3 text-left transition ${selectedOrder.id === order.id ? "bg-[#c6f65c] text-[#151817]" : "text-[#d7dbd4] hover:bg-[#2a302d]"}`}><div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate text-sm font-bold">{order.type === "SELL_GIFTCARD" ? order.giftCardBrand ?? "Gift card" : `${order.cryptoAsset ?? "Crypto"} withdrawal`}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedOrder.id === order.id ? "bg-[#151817]/10" : "bg-[#f5c76a]/15 text-[#f5c76a]"}`}>{order.type === "SELL_GIFTCARD" ? "CARD" : "CRYPTO"}</span></div><p className={`mt-1 truncate text-xs ${selectedOrder.id === order.id ? "text-[#26321e]" : "text-[#a9afa9]"}`}>{order.user.email}</p><p className={`mt-2 text-xs font-semibold ${selectedOrder.id === order.id ? "text-[#26321e]" : "text-[#d8ff96]"}`}>{formatNaira(order.totalValue)}</p></button>)}</div></aside>
        <div className="min-w-0 space-y-5">
          <div className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f5c76a]/15 px-2.5 py-1 text-xs font-bold text-[#f5c76a]">PENDING REVIEW</span><span className="font-mono text-xs font-semibold text-[#d8ff96]">{selectedOrder.referenceId ?? `FEX-${selectedOrder.id.toUpperCase()}`}</span></div><h3 className="mt-3 text-xl font-bold">{selectedOrder.type === "SELL_GIFTCARD" ? `${selectedOrder.giftCardBrand} · $${selectedOrder.amount.toLocaleString()}` : `${selectedOrder.cryptoAsset ?? "Crypto"} withdrawal`}</h3><p className="mt-1 break-all text-sm text-[#a9afa9]">Customer: {selectedOrder.user.email} · Submitted {new Date(selectedOrder.createdAt).toLocaleString()}</p></div><div className="rounded-2xl bg-[#c6f65c]/10 px-4 py-3 sm:text-right"><p className="text-xs font-semibold text-[#a9afa9]">EXPECTED PAYOUT</p><p className="mt-1 text-xl font-bold text-[#d8ff96]">{formatNaira(selectedOrder.totalValue)}</p></div></div></div>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5"><p className="text-xs font-bold tracking-wide text-[#c6f65c]">{selectedOrder.type === "SELL_GIFTCARD" ? "EVIDENCE & CARD DETAILS" : "WITHDRAWAL DETAILS"}</p>{selectedOrder.type === "SELL_GIFTCARD" ? <><div className="mt-4 flex min-h-52 items-center justify-center overflow-hidden rounded-2xl border border-[#f4f3ee]/10 bg-[#141717]">{selectedOrder.giftCardImage ? <Image src={selectedOrder.giftCardImage} alt={`${selectedOrder.giftCardBrand ?? "Gift card"} evidence`} width={640} height={420} unoptimized className="max-h-80 w-full object-contain" /> : <p className="px-4 text-center text-sm text-[#a9afa9]">No card image was uploaded with this trade.</p>}</div><div className="mt-4 grid gap-3 rounded-2xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-4 font-mono text-sm"><p className="break-all"><span className="font-sans text-xs font-semibold text-[#a9afa9]">CARD CODE</span><br />{selectedOrder.giftCardCode?.split(" | ")[0] || "Not provided"}</p><p className="break-all"><span className="font-sans text-xs font-semibold text-[#a9afa9]">CARD PIN</span><br />{selectedOrder.giftCardCode?.split(" | ")[1] || "Not provided"}</p><p className="font-sans text-xs text-[#a9afa9]">{selectedOrder.giftCardSubcategory ?? selectedOrder.giftCardCountry ?? "No sub-category selected"}</p></div></> : <div className="mt-4 rounded-2xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-4 text-sm leading-7 text-[#d7dbd4]"><p className="text-xs font-semibold text-[#a9afa9]">DEFAULT WITHDRAWAL ACCOUNT</p><p><strong>Bank:</strong> {selectedOrder.payoutBankName ?? "Not saved"}</p><p><strong>Account name:</strong> {selectedOrder.payoutAccountName ?? "Not saved"}</p><p><strong>Account number:</strong> {selectedOrder.payoutBankAccountNumber ?? "Not saved"}</p></div>}</article>
            <article className="rounded-3xl border border-[#f5c76a]/25 bg-[#202323] p-5"><p className="text-xs font-bold tracking-wide text-[#f5c76a]">RESOLUTION CONTROL</p><h4 className="mt-2 text-lg font-bold">Record the final outcome</h4><p className="mt-1 text-sm leading-6 text-[#a9afa9]">A successful card trade closes cleanly. A failed trade requires a reason the customer can see in their receipt and trade room.</p><label htmlFor={`failure-${selectedOrder.id}`} className="mt-5 mb-1 block text-xs font-semibold text-[#a9afa9]">Failure description <span className="text-red-300">(required to mark failed)</span></label><textarea id={`failure-${selectedOrder.id}`} value={failureDescriptions[selectedOrder.id] ?? ""} onChange={(event) => setFailureDescriptions((current) => ({ ...current, [selectedOrder.id]: event.target.value }))} maxLength={800} rows={5} placeholder="Explain clearly what went wrong with this trade." className="w-full resize-y rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-3 py-2 text-sm text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-red-300" /><div className="mt-4 grid gap-3"><p className="rounded-xl border border-[#d6c7ff]/25 bg-[#d6c7ff]/5 px-4 py-3 text-sm leading-6 text-[#d7dbd4]">Customer trade rooms and receipts are customer-only. Review the submitted evidence and record the outcome here.</p><button onClick={() => handleAction(selectedOrder.id, selectedOrder.type === "SELL_GIFTCARD" ? "SUCCESS" : "APPROVE")} disabled={actionLoading === selectedOrder.id} className="rounded-xl bg-[#c6f65c] py-3 text-sm font-bold text-[#151817] transition hover:bg-[#d9ff86] disabled:opacity-50">{actionLoading === selectedOrder.id ? "Processing..." : selectedOrder.type === "SELL_GIFTCARD" ? "Mark trade successful" : "Approve withdrawal"}</button><button onClick={() => handleAction(selectedOrder.id, selectedOrder.type === "SELL_GIFTCARD" ? "FAIL" : "REJECT")} disabled={actionLoading === selectedOrder.id || !(failureDescriptions[selectedOrder.id] ?? "").trim()} className="rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50">{actionLoading === selectedOrder.id ? "Processing..." : selectedOrder.type === "SELL_GIFTCARD" ? "Mark trade failed" : "Reject withdrawal"}</button></div></article>
          </div>
        </div>
      </div>}
    </section>
  );
}
