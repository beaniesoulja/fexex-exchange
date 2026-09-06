"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { giftCards } from "@/lib/gift-cards";

const tickerItems = ["Amazon", "Apple", "Steam", "Google Play", "Xbox", "Razer Gold", "Sephora", "USDT", "Bitcoin"];

const stats = [
  { value: "25+", label: "Gift cards supported" },
  { value: "10+", label: "Crypto assets supported" },
  { value: "100%", label: "Trades reviewed by a person" },
  { value: "₦", label: "Every rate shown up front" },
];

const steps = [
  { number: "01", title: "Pick what you want to sell", copy: "Choose a gift card or crypto asset and see the route made for it." },
  { number: "02", title: "Enter the details", copy: "Add your value and the information required for that specific trade." },
  { number: "03", title: "Track your next move", copy: "Your dashboard keeps your trade history and payout progress in one place." },
];

const faqs = [
  { question: "What can I trade on FEXEX?", answer: "FEXEX supports the gift cards and crypto assets currently available in the Trade area. Available options and rates are managed by the FEXEX team." },
  { question: "Can I see the rate before I start?", answer: "Yes. Use the Naira rate calculator to check current gift-card rates before choosing a trade." },
  { question: "Do I need an account?", answer: "Create a FEXEX account to submit and follow a trade from your dashboard." },
];

export default function Home() {
  const featuredCards = giftCards.slice(0, 10);
  const repeatedTickerItems = [...tickerItems, ...tickerItems];
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <main className="fexex-surface min-h-screen overflow-hidden bg-[#161818] text-[#f4f3ee]">
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
        <Link href="/" aria-label="FEXEX home" className="shrink-0 transition hover:scale-[1.02]">
          <Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} priority className="h-8 w-auto sm:h-9" style={{ width: "auto" }} />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-[#c8ccc7] lg:flex">
          <a href="#how-it-works" className="transition hover:text-[#c6f65c]">How it works</a>
          <a href="#supported-cards" className="transition hover:text-[#c6f65c]">Gift cards</a>
          <Link href="/giftcard-calculator" className="transition hover:text-[#c6f65c]">Rate calculator</Link>
          <Link href="/about" className="transition hover:text-[#c6f65c]">About</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-full px-3 py-2 text-xs font-semibold text-[#f4f3ee] transition hover:bg-white/5 hover:text-[#c6f65c] sm:px-4 sm:text-sm">Log in</Link>
          <Link href="/signup" className="rounded-full bg-[#c6f65c] px-4 py-2.5 text-xs font-bold text-[#161818] transition hover:bg-[#d9ff86] sm:px-5 sm:text-sm">Start trading <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-16 px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-32 lg:pt-20">
        <div className="relative">
          <div aria-hidden="true" className="fexex-hero-orb fexex-hero-orb-one opacity-60" />
          <p className="relative mb-6 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.22em] text-[#a9afa9]"><span className="h-px w-6 bg-[#c6f65c]" />Value, but make it move</p>
          <h1 className="relative max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] sm:text-6xl md:text-[4.75rem]">Your value has a <span className="fexex-serif text-[#d6c7ff]">next life.</span></h1>
          <p className="relative mt-7 max-w-lg text-base leading-7 text-[#c8ccc7] sm:text-lg sm:leading-8">Sell supported gift cards and crypto through a trade flow that feels clear from the first click to your next move.</p>
          <div className="relative mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-[#c6f65c] px-6 py-3.5 text-sm font-bold text-[#161818] transition hover:bg-[#d9ff86]">Start a trade <span aria-hidden="true">→</span></Link>
            <Link href="/giftcard-calculator" className="rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-[#f4f3ee] transition hover:border-[#d6c7ff]/60 hover:text-[#d6c7ff]">Check Naira rates</Link>
          </div>
          <dl className="relative mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {stats.slice(0, 3).map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-bold tracking-[-0.03em] text-[#c6f65c]">{stat.value}</dd>
                <p className="mt-1 text-xs leading-4 text-[#777a75]">{stat.label}</p>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div aria-hidden="true" className="fexex-hero-orb fexex-hero-orb-two opacity-50" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#1c1f1f] shadow-[0_40px_100px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-xs text-[#777a75]"><span className="inline-flex items-center gap-2 font-semibold tracking-wide text-[#a9afa9]"><span className="h-1.5 w-1.5 rounded-full bg-[#c6f65c]" /> FEXEX TRADE DESK</span><span>Live experience</span></div>
            <div className="grid gap-px bg-white/10 sm:grid-cols-2">
              <Link href="/trade" className="group bg-[#1c1f1f] p-6 transition hover:bg-[#212525]"><div className="flex items-start justify-between"><span className="text-[10px] font-extrabold tracking-[0.16em] text-[#d8ff96]">GIFTCARDS</span><span className="text-lg text-[#c6f65c] transition group-hover:translate-x-1">↗</span></div><p className="mt-14 text-2xl font-bold leading-[1.1] tracking-[-0.04em]">Turn cards into Naira.</p><p className="mt-3 text-xs leading-5 text-[#a9afa9]">Choose a card, a sub-category, and its value.</p></Link>
              <Link href="/trade?type=crypto" className="group bg-[#1c1f1f] p-6 transition hover:bg-[#212525]"><div className="flex items-start justify-between"><span className="text-[10px] font-extrabold tracking-[0.16em] text-[#e5dcff]">CRYPTO</span><span className="text-lg text-[#d6c7ff] transition group-hover:translate-x-1">↗</span></div><p className="mt-14 text-2xl font-bold leading-[1.1] tracking-[-0.04em]">Make a clean crypto move.</p><p className="mt-3 text-xs leading-5 text-[#a9afa9]">Select your asset and submit the amount to sell.</p></Link>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-4 text-xs font-semibold text-[#777a75]">
              {["Pick", "Enter", "Track"].map((label, index) => (
                <span key={label} className="flex items-center gap-2">
                  <span className="text-[#c6f65c]">{`0${index + 1}`}</span>
                  <span className="text-[#a9afa9]">{label}</span>
                  {index < 2 && <span aria-hidden="true" className="mx-1 h-px w-5 bg-white/15" />}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="FEXEX trading highlights" className="relative z-10 border-y border-white/10 bg-[#131515] py-3.5">
        <div className="fexex-marquee overflow-hidden">
          <div className="fexex-marquee-track" aria-hidden="true">
            {repeatedTickerItems.map((item, index) => <span key={`${item}-${index}`} className="flex shrink-0 items-center gap-5 px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#777a75]"><span>{item}</span><span className="h-1 w-1 rounded-full bg-[#c6f65c]/70" /></span>)}
          </div>
          <p className="sr-only">FEXEX supports Amazon, Apple, Steam, Google Play and more with clear Naira rates and secure trading.</p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-white/10 py-10 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border-l border-white/10 pl-5 first:border-l-0 first:pl-0 sm:first:border-l sm:first:pl-5">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{stat.value}</dd>
              <p className="mt-2 text-xs leading-5 text-[#a9afa9] sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </dl>
      </section>

      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div><p className="text-xs font-extrabold tracking-[0.14em] text-[#c6f65c]">HOW FEXEX FLOWS</p><h2 className="mt-4 max-w-sm text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Less hunting around. More moving forward.</h2></div>
          <p className="max-w-xl text-sm leading-7 text-[#a9afa9] sm:text-base">We give each card and crypto asset its own route, so the details you need show up when you need them.</p>
        </div>
        <ol className="mt-12 divide-y divide-white/10 border-t border-white/10">
          {steps.map((step) => (
            <li key={step.number} className="group grid gap-3 py-8 sm:grid-cols-[auto_1fr] sm:items-baseline sm:gap-10">
              <span aria-hidden="true" className="text-4xl font-bold tracking-[-0.04em] text-white/15 transition group-hover:text-[#c6f65c]/40 sm:text-5xl">{step.number}</span>
              <div><h3 className="text-xl font-semibold tracking-[-0.03em]">{step.title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-[#a9afa9]">{step.copy}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section id="supported-cards" className="relative z-10 border-y border-white/10 bg-[#141616] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div><p className="text-xs font-extrabold tracking-[0.14em] text-[#d6c7ff]">PICK YOUR VALUE</p><h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">The cards in your drawer have somewhere to go.</h2></div>
            <Link href="/trade" className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold transition hover:border-[#c6f65c] hover:text-[#c6f65c]">Browse the trade desk <span className="text-[#c6f65c]">→</span></Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-5">
            {featuredCards.map((giftCard) => (
              <Link key={giftCard.code} href={`/trade/giftcard/${encodeURIComponent(giftCard.code)}`} className="group flex flex-col justify-between gap-6 bg-[#1a1d1d] p-5 transition hover:bg-[#202323]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f3ee] p-2"><Image src={giftCard.icon} alt="" width={26} height={26} className="h-full w-full object-contain" /></span>
                <div><p className="text-sm font-bold tracking-[-0.02em]">{giftCard.name}</p><span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#777a75] transition group-hover:text-[#c6f65c]">Start trade <span className="transition group-hover:translate-x-0.5">→</span></span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="rounded-3xl border border-white/10 bg-[#1a1d1d] p-7 sm:p-9">
          <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-[#d6c7ff]" />
          <p className="mt-6 text-xs font-extrabold tracking-[0.14em] text-[#d6c7ff]">NO GUESSWORK NEEDED</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">See your rate before you start the conversation.</h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#c8ccc7]">Our calculator gives you a simple view of current Naira gift-card rates before you pick a trade flow.</p>
          <Link href="/giftcard-calculator" className="mt-8 inline-flex rounded-full bg-[#d6c7ff] px-5 py-3 text-sm font-bold text-[#161818] transition hover:bg-[#e5dcff]">Open calculator <span className="ml-2">→</span></Link>
        </div>
        <div>
          <p className="text-xs font-extrabold tracking-[0.14em] text-[#c6f65c]">QUESTIONS, ANSWERED</p>
          <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#1a1d1d] px-5">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.question} className="py-3.5">
                  <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)} aria-expanded={isOpen} className="group flex w-full cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold transition">
                    <span className={`transition ${isOpen ? "text-[#f4f3ee]" : "text-[#c8ccc7] group-hover:text-[#f4f3ee]"}`}>{faq.question}</span>
                    <span aria-hidden="true" className={`shrink-0 text-base font-normal leading-none text-[#c6f65c] transition ${isOpen ? "rotate-45" : ""}`}>+</span>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden"><p className="max-w-md pt-2 text-sm leading-6 text-[#a9afa9]">{faq.answer}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-[#111313]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-1">
              <Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={100} height={28} className="h-7 w-auto" style={{ width: "auto" }} />
              <p className="mt-3 max-w-40 text-xs leading-5 text-[#777a75]">Value in motion. Your move, made clearer.</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#f4f3ee]">About</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#a9afa9]">
                <li><Link href="/about" className="transition hover:text-[#c6f65c]">About Fexex</Link></li>
                <li><Link href="/charity" className="transition hover:text-[#c6f65c]">Fexex Charity</Link></li>
                <li><Link href="/blog" className="transition hover:text-[#c6f65c]">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#f4f3ee]">Gift Cards</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#a9afa9]">
                <li><Link href="/trade/giftcard/RZR" className="transition hover:text-[#c6f65c]">Razer Gift Card</Link></li>
                <li><Link href="/trade/giftcard/STM" className="transition hover:text-[#c6f65c]">Steam Gift Card</Link></li>
                <li><Link href="/trade/giftcard/XBX" className="transition hover:text-[#c6f65c]">Xbox Gift Card</Link></li>
                <li><Link href="/trade/giftcard/GPL" className="transition hover:text-[#c6f65c]">Google Play Gift Card</Link></li>
                <li><Link href="/trade/giftcard/APL" className="transition hover:text-[#c6f65c]">Apple Gift Card</Link></li>
                <li><Link href="/trade/giftcard/SEP" className="transition hover:text-[#c6f65c]">Sephora Gift Card</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#f4f3ee]">Bill Payment</h3>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#c6f65c]/25 bg-[#c6f65c]/10 px-3 py-1.5 text-xs font-semibold text-[#d8ff96]">Coming soon</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#f4f3ee]">Community</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#a9afa9]">
                <li><a href="#" className="transition hover:text-[#c6f65c]">Facebook</a></li>
                <li><a href="#" className="transition hover:text-[#c6f65c]">Twitter</a></li>
                <li><a href="#" className="transition hover:text-[#c6f65c]">Instagram</a></li>
                <li><a href="#" className="transition hover:text-[#c6f65c]">YouTube</a></li>
                <li><a href="#" className="transition hover:text-[#c6f65c]">Telegram</a></li>
                <li><a href="#" className="transition hover:text-[#c6f65c]">TikTok</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#f4f3ee]">Support</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#a9afa9]">
                <li><Link href="/terms" className="transition hover:text-[#c6f65c]">Terms of Use</Link></li>
                <li><Link href="/privacy" className="transition hover:text-[#c6f65c]">Privacy Policy</Link></li>
                <li><Link href="/contact" className="transition hover:text-[#c6f65c]">Contact Us</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-[#777a75]">© {new Date().getFullYear()} FEXEX</span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[#a9afa9]">
              <Link href="/login" className="transition hover:text-[#c6f65c]">Log in</Link>
              <Link href="/signup" className="transition hover:text-[#c6f65c]">Create account</Link>
              <Link href="/giftcard-calculator" className="transition hover:text-[#c6f65c]">Rate calculator</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
