"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const floatingIcons = [
  { src: "/giftcard-icons/amazon.png", alt: "Amazon", top: "6%", left: "4%", delay: "0s", duration: "7s" },
  { src: "/giftcard-icons/apple.svg", alt: "Apple", top: "62%", left: "2%", delay: "1.2s", duration: "6.4s" },
  { src: "/giftcard-icons/steam.svg", alt: "Steam", top: "10%", left: "90%", delay: "0.6s", duration: "6.8s" },
  { src: "/giftcard-icons/xbox.png", alt: "Xbox", top: "70%", left: "92%", delay: "1.8s", duration: "7.5s" },
  { src: "/giftcard-icons/google-play.svg", alt: "Google Play", top: "38%", left: "96%", delay: "0.3s", duration: "6.2s" },
  { src: "/giftcard-icons/razer-gold.svg", alt: "Razer Gold", top: "88%", left: "8%", delay: "2.1s", duration: "7.1s" },
];

const values = [
  {
    icon: "💸",
    title: "Highest Rates",
    summary: "Some of the best rates in the market.",
    detail: "We keep our gift card and crypto rates competitive so you get the most Naira for what you're trading — no lowball offers, no hidden cuts.",
  },
  {
    icon: "⚡",
    title: "Quick Transactions",
    summary: "Built for speed and efficiency.",
    detail: "From submission to review to payout, every step of the FEXEX trade flow is designed to move fast without cutting corners on security.",
  },
  {
    icon: "🧭",
    title: "User-Friendly Interface",
    summary: "Simple, hassle-free trading.",
    detail: "Every gift card and crypto asset gets its own dedicated trade page, so you always know exactly what to enter and what happens next.",
  },
  {
    icon: "🎁",
    title: "Customer Rewards",
    summary: "Refer & Earn, Spin & Win.",
    detail: "Earn extra cash and commissions through programs like Refer & Earn and Spin & Win, rewarding you for trading and bringing others along.",
  },
  {
    icon: "🛟",
    title: "Dedicated Support",
    summary: "Help at a moment's notice.",
    detail: "Our support team is on hand to help with questions or issues on any trade, right from your account.",
  },
];

export default function AboutPage() {
  const [openValue, setOpenValue] = useState(0);

  return (
    <main className="fexex-surface min-h-screen overflow-hidden bg-[#161818] text-[#f4f3ee]">
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
        <Link href="/" aria-label="FEXEX home" className="shrink-0 transition hover:scale-[1.02]">
          <Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="h-8 w-auto sm:h-9" style={{ width: "auto" }} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-full px-3 py-2 text-xs font-semibold text-[#f4f3ee] transition hover:bg-white/5 hover:text-[#c6f65c] sm:px-4 sm:text-sm">Log in</Link>
          <Link href="/signup" className="rounded-full bg-[#c6f65c] px-4 py-2.5 text-xs font-bold text-[#161818] shadow-[0_10px_30px_rgba(198,246,92,0.16)] transition hover:-translate-y-0.5 hover:bg-[#d9ff86] sm:px-5 sm:text-sm">Start trading <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-4xl px-5 pb-10 pt-10 text-center sm:px-8 sm:pb-16 sm:pt-16">
        {floatingIcons.map((icon) => (
          <span
            key={icon.alt}
            aria-hidden="true"
            className="fexex-float-icon pointer-events-none absolute hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#202323] p-2.5 shadow-lg sm:flex"
            style={{ top: icon.top, left: icon.left, animationDelay: icon.delay, animationDuration: icon.duration }}
          >
            <Image src={icon.src} alt="" width={32} height={32} className="h-full w-full object-contain" />
          </span>
        ))}

        <p className="relative mx-auto inline-flex items-center gap-2 rounded-full border border-[#c6f65c]/30 bg-[#c6f65c]/10 px-3 py-1.5 text-xs font-bold tracking-wide text-[#d8ff96]"><span className="h-1.5 w-1.5 rounded-full bg-[#c6f65c] shadow-[0_0_0_4px_rgba(198,246,92,0.12)]" /> TRUSTED SINCE 2026</p>
        <h1 className="relative mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-5xl">Say hello to <span className="fexex-serif text-[#c6f65c]">FEXEX</span> — the gift card platform that trades you up, not down.</h1>
        <p className="relative mx-auto mt-6 max-w-2xl text-base leading-7 text-[#c8ccc7] sm:text-lg">Since 2026, FEXEX has steadily grown into an industry leader — hitting real milestones along the way, powered by a dedicated team committed to exceptional service. That focus has earned the trust and loyalty of countless users across Nigeria.</p>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-16 sm:px-8 sm:pb-24">
        <div className="rounded-[2rem] border border-[#bfe3ff]/20 bg-[linear-gradient(145deg,rgba(191,227,255,0.14),rgba(32,35,35,0.95)_60%)] p-7 sm:p-9">
          <p className="text-xs font-extrabold tracking-[0.14em] text-[#bfe3ff]">OUR MISSION</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Revolutionizing the gift card trading market.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#c8ccc7] sm:text-base">We combine high rates, swift transactions, and excellent customer service into one platform — empowering our users to trade their gift cards efficiently, without the runaround.</p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-16 sm:px-8 sm:pb-24">
        <p className="text-xs font-extrabold tracking-[0.14em] text-[#c6f65c]">WHAT SETS US APART</p>
        <h2 className="mt-3 max-w-lg text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Our core values, tap to explore.</h2>

        <div className="mt-8 space-y-3">
          {values.map((value, index) => {
            const isOpen = openValue === index;
            return (
              <div key={value.title} className={`overflow-hidden rounded-2xl border transition ${isOpen ? "border-[#c6f65c]/45 bg-[#202323]" : "border-white/10 bg-[#1a1d1d]"}`}>
                <button
                  type="button"
                  onClick={() => setOpenValue(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c6f65c]/10 text-xl">{value.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold tracking-[-0.02em]">{value.title}</span>
                    <span className="block text-xs text-[#a9afa9] sm:text-sm">{value.summary}</span>
                  </span>
                  <span aria-hidden="true" className={`shrink-0 text-xl font-normal text-[#c6f65c] transition ${isOpen ? "rotate-45" : ""}`}>+</span>
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-6 text-[#a9afa9] sm:px-6 sm:pl-[4.25rem]">{value.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-16 sm:px-8 sm:pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#202323] p-7">
            <p className="text-xs font-extrabold tracking-[0.14em] text-[#d8ff96]">REFER & EARN</p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Bring a friend, earn a commission.</h3>
            <p className="mt-3 text-sm leading-6 text-[#a9afa9]">Share FEXEX with people who trade gift cards, and earn cash when they do. This program is coming soon to your account.</p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#c6f65c]/25 bg-[#c6f65c]/10 px-3 py-1.5 text-xs font-semibold text-[#d8ff96]">Coming soon</span>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#202323] p-7">
            <p className="text-xs font-extrabold tracking-[0.14em] text-[#dbf1ff]">SPIN & WIN</p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">A spin for every trade.</h3>
            <p className="mt-3 flex items-center gap-4 text-sm leading-6 text-[#a9afa9]">
              <span aria-hidden="true" className="fexex-spin-wheel flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-dashed border-[#bfe3ff]/50 bg-[conic-gradient(from_0deg,#c6f65c_0deg_60deg,#bfe3ff_60deg_120deg,#202323_120deg_180deg,#c6f65c_180deg_240deg,#bfe3ff_240deg_300deg,#202323_300deg_360deg)]" />
              Trade and get a chance to win extra cash. This program is coming soon to your account.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#bfe3ff]/25 bg-[#bfe3ff]/10 px-3 py-1.5 text-xs font-semibold text-[#dbf1ff]">Coming soon</span>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-white/10 bg-[#202323] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">Ready to make your next move?</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#a9afa9]">Join the users across Nigeria already trading on FEXEX.</p>
          </div>
          <Link href="/signup" className="shrink-0 rounded-full bg-[#c6f65c] px-6 py-3.5 text-sm font-bold text-[#161818] shadow-[0_12px_32px_rgba(198,246,92,0.18)] transition hover:-translate-y-0.5 hover:bg-[#d9ff86]">Create an account <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
