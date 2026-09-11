"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ProfileMenu } from "@/components/profile-menu";

const DOCUMENT_TYPES = ["National ID", "International Passport", "Driver's License", "Voter's Card"];

type KycStatusResponse = {
  kycVerified: boolean;
  submission: { id: string; status: "PENDING" | "APPROVED" | "REJECTED"; documentType: string; reviewNote: string | null; createdAt: string } | null;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject();
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function KycSubmissionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const documentInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const [kycStatus, setKycStatus] = useState<KycStatusResponse | null>(null);
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [documentPreview, setDocumentPreview] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const loadStatus = () => {
    void fetch("/api/kyc")
      .then((response) => response.ok ? response.json() : null)
      .then(setKycStatus)
      .catch(() => setKycStatus(null));
  };

  useEffect(() => {
    if (status === "authenticated") loadStatus();
  }, [status]);

  const pickImage = async (event: ChangeEvent<HTMLInputElement>, setPreview: (value: string) => void) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 3_000_000) {
      setMessage("Choose a JPG, PNG, or WebP image under 3 MB.");
      return;
    }
    setPreview(await readFileAsDataUrl(file));
  };

  const submit = async () => {
    if (!documentPreview || !selfiePreview) {
      setMessage("Upload both your document and a selfie holding it.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, documentImage: documentPreview, selfieImage: selfiePreview }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "We could not submit your documents.");
        return;
      }
      setMessage(data.message ?? "Submitted for review.");
      setDocumentPreview("");
      setSelfiePreview("");
      loadStatus();
    } catch {
      setMessage("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submission = kycStatus?.submission ?? null;
  const canSubmit = !kycStatus?.kycVerified && (!submission || submission.status === "REJECTED");

  return (
    <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1d2220] sm:p-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <Link href="/verification" className="text-sm font-semibold text-[#4d6c16]">← Back to Verification</Link>
          <ProfileMenu username={session?.user?.username} />
        </header>

        <section className="fexex-pop-in mt-6 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <h1 className="text-2xl font-bold">Identity verification (KYC)</h1>
          <p className="mt-1 text-sm text-[#5e6863]">Verify your ID to raise limits and trade with more confidence and trust.</p>

          {kycStatus?.kycVerified && (
            <div className="mt-5 rounded-xl bg-[#e6f7ef] p-5 text-sm font-semibold text-[#00b878]">Your identity is verified. No further action is needed.</div>
          )}

          {!kycStatus?.kycVerified && submission?.status === "PENDING" && (
            <div className="mt-5 rounded-xl bg-[#fdf3d8] p-5 text-sm text-[#7a5b0a]">
              <p className="font-bold">Submission under review</p>
              <p className="mt-1">You submitted a {submission.documentType} on {new Date(submission.createdAt).toLocaleDateString()}. We will notify you once it has been reviewed.</p>
            </div>
          )}

          {!kycStatus?.kycVerified && submission?.status === "REJECTED" && (
            <div className="mt-5 rounded-xl bg-rose-50 p-5 text-sm text-rose-700">
              <p className="font-bold">Your last submission was rejected</p>
              <p className="mt-1">{submission.reviewNote || "Please review and resubmit your documents."}</p>
            </div>
          )}

          {canSubmit && (
            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5e6863]">Document type</label>
                <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="w-full rounded-lg border border-[#e2e6de] bg-[#fafbf9] px-3 py-2.5 font-semibold outline-none focus:border-[#00b878] focus:ring-2 focus:ring-[#c6f65c]/40">
                  {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5e6863]">Document photo</label>
                  <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#c6d4c1] bg-[#fafbf9]">
                    {documentPreview ? <img src={documentPreview} alt="Document preview" className="h-full w-full object-contain" /> : <p className="px-4 text-center text-xs text-[#8a938d]">A clear photo of the front of your ID</p>}
                  </div>
                  <input ref={documentInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickImage(event, setDocumentPreview)} className="sr-only" />
                  <button type="button" onClick={() => documentInputRef.current?.click()} className="mt-2 rounded-lg bg-[#eff1ed] px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-md">{documentPreview ? "Change photo" : "Upload photo"}</button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5e6863]">Selfie holding the document</label>
                  <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#c6d4c1] bg-[#fafbf9]">
                    {selfiePreview ? <img src={selfiePreview} alt="Selfie preview" className="h-full w-full object-contain" /> : <p className="px-4 text-center text-xs text-[#8a938d]">Your face and the document both clearly visible</p>}
                  </div>
                  <input ref={selfieInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickImage(event, setSelfiePreview)} className="sr-only" />
                  <button type="button" onClick={() => selfieInputRef.current?.click()} className="mt-2 rounded-lg bg-[#eff1ed] px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-md">{selfiePreview ? "Change photo" : "Upload photo"}</button>
                </div>
              </div>

              <button type="button" onClick={submit} disabled={submitting} className="w-full rounded-xl bg-[#00b878] px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60 sm:w-auto">{submitting ? "Submitting..." : "Submit for review"}</button>
            </div>
          )}

          {message && <p role="status" className="mt-5 rounded-xl bg-[#eff1ed] px-4 py-3 text-sm font-medium text-[#4d6c16]">{message}</p>}
        </section>
      </div>
    </main>
  );
}
