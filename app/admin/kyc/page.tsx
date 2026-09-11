"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

type KycSubmission = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  documentType: string;
  documentImage: string;
  selfieImage: string;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { email: string; username: string | null; legalName: string | null };
};

export default function AdminKycPage() {
  const [submissions, setSubmissions] = useState<KycSubmission[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = () => {
    void fetch("/api/admin/kyc")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load KYC submissions");
        return response.json() as Promise<KycSubmission[]>;
      })
      .then(setSubmissions)
      .catch(() => setLoadError("We could not load KYC submissions."));
  };

  useEffect(() => { load(); }, []);

  const pending = (submissions ?? []).filter((item) => item.status === "PENDING");
  const selected = pending.find((item) => item.id === selectedId) ?? pending[0] ?? null;

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (!selected) return;
    if (action === "REJECT" && !reviewNote.trim()) return;
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: selected.id, action, reviewNote }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.error ?? "Failed to process this submission.");
        return;
      }
      setReviewNote("");
      setSelectedId(null);
      load();
      alert(data.message ?? "Done.");
    } catch {
      alert("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="fexex-pop-in" aria-labelledby="kyc-heading">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#f5c76a]">IDENTITY VERIFICATION</p>
          <h2 id="kyc-heading" className="mt-1 text-2xl font-bold">KYC review queue</h2>
          <p className="mt-1 text-sm text-[#a9afa9]">Check the submitted document against the selfie, then approve or reject with a reason.</p>
        </div>
        <span className="rounded-full bg-[#f5c76a]/15 px-3 py-1.5 text-xs font-bold text-[#f5c76a]">{pending.length} awaiting review</span>
      </div>

      {loadError && <p role="alert" className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{loadError}</p>}

      {submissions === null ? (
        <div className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-10 text-center text-sm text-[#a9afa9]">Loading submissions...</div>
      ) : pending.length === 0 || !selected ? (
        <div className="rounded-3xl border border-[#c6f65c]/20 bg-[#202323] p-10 text-center">
          <p className="text-lg font-bold">KYC queue is clear</p>
          <p className="mt-2 text-sm text-[#a9afa9]">New identity verification submissions will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] xl:max-h-[780px] xl:overflow-y-auto">
            <div className="border-b border-[#f4f3ee]/10 px-4 py-4"><p className="text-xs font-bold tracking-wide text-[#a9afa9]">REVIEW QUEUE</p></div>
            <div className="p-2">
              {pending.map((submission) => (
                <button key={submission.id} type="button" onClick={() => { setSelectedId(submission.id); setReviewNote(""); }} className={`mb-1 w-full rounded-2xl p-3 text-left transition ${selected.id === submission.id ? "bg-[#c6f65c] text-[#151817]" : "text-[#d7dbd4] hover:bg-[#2a302d]"}`}>
                  <p className="min-w-0 truncate text-sm font-bold">{submission.user.legalName ?? submission.user.username ?? submission.user.email}</p>
                  <p className={`mt-1 truncate text-xs ${selected.id === submission.id ? "text-[#26321e]" : "text-[#a9afa9]"}`}>{submission.documentType}</p>
                  <p className={`mt-1 truncate text-xs ${selected.id === submission.id ? "text-[#26321e]" : "text-[#a9afa9]"}`}>{submission.user.email}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <div className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f5c76a]/15 px-2.5 py-1 text-xs font-bold text-[#f5c76a]">PENDING REVIEW</span>
                <span className="font-mono text-xs font-semibold text-[#d8ff96]">{selected.id}</span>
              </div>
              <h3 className="mt-3 text-xl font-bold">{selected.documentType}</h3>
              <p className="mt-1 break-all text-sm text-[#a9afa9]">Customer: {selected.user.email} ({selected.user.legalName ?? "No legal name on file"}) · Submitted {new Date(selected.createdAt).toLocaleString()}</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5">
                <p className="text-xs font-bold tracking-wide text-[#c6f65c]">DOCUMENT</p>
                <div className="mt-4 flex min-h-52 items-center justify-center overflow-hidden rounded-2xl border border-[#f4f3ee]/10 bg-[#141717]">
                  <Image src={selected.documentImage} alt="Submitted identity document" width={640} height={420} unoptimized className="max-h-80 w-full object-contain" />
                </div>
              </article>
              <article className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5">
                <p className="text-xs font-bold tracking-wide text-[#c6f65c]">SELFIE WITH DOCUMENT</p>
                <div className="mt-4 flex min-h-52 items-center justify-center overflow-hidden rounded-2xl border border-[#f4f3ee]/10 bg-[#141717]">
                  <Image src={selected.selfieImage} alt="Submitted selfie holding the identity document" width={640} height={420} unoptimized className="max-h-80 w-full object-contain" />
                </div>
              </article>
            </div>

            <article className="rounded-3xl border border-[#f5c76a]/25 bg-[#202323] p-5">
              <p className="text-xs font-bold tracking-wide text-[#f5c76a]">RESOLUTION</p>
              <h4 className="mt-2 text-lg font-bold">Confirm the document matches the selfie and the name on file</h4>
              <label htmlFor="kyc-note" className="mt-5 mb-1 block text-xs font-semibold text-[#a9afa9]">Reason for customer <span className="text-red-300">(required to reject)</span></label>
              <textarea id="kyc-note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={500} rows={4} placeholder="e.g. Document photo is blurry, please resubmit a clearer photo." className="w-full resize-y rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-3 py-2 text-sm text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-red-300" />
              <div className="mt-4 grid gap-3">
                <button onClick={() => handleAction("APPROVE")} disabled={actionLoading} className="rounded-xl bg-[#c6f65c] py-3 text-sm font-bold text-[#151817] transition hover:bg-[#d9ff86] disabled:opacity-50">{actionLoading ? "Processing..." : "Approve identity verification"}</button>
                <button onClick={() => handleAction("REJECT")} disabled={actionLoading || !reviewNote.trim()} className="rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50">{actionLoading ? "Processing..." : "Reject submission"}</button>
              </div>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
