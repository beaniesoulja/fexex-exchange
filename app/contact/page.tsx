"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ type: "error", text: data.error ?? "We could not send your message." });
        return;
      }
      setStatus({ type: "success", text: data.message ?? "Your message has been sent." });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setStatus({ type: "error", text: "A network error occurred. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="fexex-surface min-h-screen overflow-hidden bg-[#161818] text-[#f4f3ee]">
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
        <Link href="/" aria-label="FEXEX home" className="shrink-0 transition hover:scale-[1.02]">
          <Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="h-8 w-auto sm:h-9" style={{ width: "auto" }} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-full px-3 py-2 text-xs font-semibold text-[#f4f3ee] transition hover:bg-white/5 hover:text-[#c6f65c] sm:px-4 sm:text-sm">Log in</Link>
          <Link href="/signup" className="rounded-full bg-[#c6f65c] px-4 py-2.5 text-xs font-bold text-[#161818] transition hover:bg-[#d9ff86] sm:px-5 sm:text-sm">Start trading <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-5xl gap-10 px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.22em] text-[#a9afa9]"><span className="h-px w-6 bg-[#c6f65c]" />Get in touch</p>
          <h1 className="mt-5 max-w-sm text-4xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-5xl">Contact <span className="fexex-serif text-[#c6f65c]">FEXEX.</span></h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#a9afa9] sm:text-base">Have a question about a trade, your account, or something else? Send us a message and we&apos;ll get back to you.</p>

          <div className="mt-9 rounded-2xl border border-[#c6f65c]/25 bg-[#c6f65c]/10 p-5">
            <p className="text-xs font-bold tracking-wide text-[#d8ff96]">ALREADY A CUSTOMER?</p>
            <p className="mt-2 text-sm leading-6 text-[#c8ccc7]">Sign in and use the support chat bubble in the corner of your screen for the fastest reply on an active trade.</p>
            <Link href="/login" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#c6f65c] transition hover:text-[#d9ff86]">Log in to chat <span aria-hidden="true">→</span></Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-[#1a1d1d] p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Name</label>
              <input id="contact-name" type="text" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} className="w-full rounded-xl border border-white/15 bg-[#202323] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Email</label>
              <input id="contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-xl border border-white/15 bg-[#202323] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="you@example.com" />
            </div>
          </div>
          <div className="mt-5">
            <label htmlFor="contact-subject" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Subject</label>
            <input id="contact-subject" type="text" value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={140} className="w-full rounded-xl border border-white/15 bg-[#202323] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="What's this about?" />
          </div>
          <div className="mt-5">
            <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Message</label>
            <textarea id="contact-message" value={message} onChange={(event) => setMessage(event.target.value.slice(0, 2000))} required rows={6} maxLength={2000} className="w-full resize-none rounded-xl border border-white/15 bg-[#202323] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="Tell us what's going on" />
            <p className="mt-1.5 text-right text-xs text-[#777a75]">{message.length}/2000</p>
          </div>

          {status && <p role={status.type === "error" ? "alert" : "status"} className={`mt-4 rounded-xl px-4 py-3 text-sm ${status.type === "error" ? "bg-red-400/10 text-red-200" : "bg-[#c6f65c]/10 text-[#d8ff96]"}`}>{status.text}</p>}

          <button type="submit" disabled={sending} className="mt-6 w-full rounded-xl bg-[#c6f65c] px-4 py-3.5 text-sm font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            {sending ? "Sending..." : "Send message"}
          </button>
        </form>
      </section>
    </main>
  );
}
