import Image from "next/image";
import Link from "next/link";
import { giftCards } from "@/lib/gift-cards";

const marqueeItems = ["Amazon", "Apple", "Steam", "Google Play", "Instant quote", "Naira payout", "Clear rates", "Secure trading"];

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
  const repeatedMarqueeItems = [...marqueeItems, ...marqueeItems];

  return (
    <main className="fexex-surface min-h-screen overflow-hidden bg-[#161818] text-[#f4f3ee]">
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
        <Link href="/" aria-label="FEXEX home" className="shrink-0 transition hover:scale-[1.02]">
          <Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} priority className="h-8 w-auto sm:h-9" />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-medium text-[#c8ccc7] lg:flex">
          <a href="#how-it-works" className="transition hover:text-[#c6f65c]">How it works</a>
          <a href="#supported-cards" className="transition hover:text-[#c6f65c]">Gift cards</a>
          <Link href="/giftcard-calculator" className="transition hover:text-[#c6f65c]">Rate calculator</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-full px-3 py-2 text-xs font-semibold text-[#f4f3ee] transition hover:bg-white/5 hover:text-[#c6f65c] sm:px-4 sm:text-sm">Log in</Link>
          <Link href="/signup" className="rounded-full bg-[#c6f65c] px-4 py-2.5 text-xs font-bold text-[#161818] shadow-[0_10px_30px_rgba(198,246,92,0.16)] transition hover:-translate-y-0.5 hover:bg-[#d9ff86] sm:px-5 sm:text-sm">Start trading <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[1.03fr_0.97fr] lg:items-center lg:pb-28 lg:pt-20">
        <div className="relative">
          <div aria-hidden="true" className="fexex-hero-orb fexex-hero-orb-one" />
          <p className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-[#c6f65c]/30 bg-[#c6f65c]/10 px-3 py-1.5 text-xs font-bold tracking-wide text-[#d8ff96]"><span className="h-1.5 w-1.5 rounded-full bg-[#c6f65c] shadow-[0_0_0_4px_rgba(198,246,92,0.12)]" /> VALUE, BUT MAKE IT MOVE</p>
          <h1 className="relative max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-6xl md:text-7xl">Your value has a <span className="fexex-serif text-[#d6c7ff]">next life.</span></h1>
          <p className="relative mt-6 max-w-xl text-base leading-7 text-[#c8ccc7] sm:text-lg sm:leading-8">Sell supported gift cards and crypto through a trade flow that feels clear from the first click to your next move.</p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-[#c6f65c] px-6 py-3.5 text-sm font-bold text-[#161818] shadow-[0_12px_32px_rgba(198,246,92,0.18)] transition hover:-translate-y-0.5 hover:bg-[#d9ff86]">Start a trade <span aria-hidden="true">→</span></Link>
            <Link href="/giftcard-calculator" className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-[#f4f3ee] transition hover:border-[#d6c7ff]/70 hover:bg-[#d6c7ff]/10">Check Naira rates</Link>
          </div>
          <div className="relative mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-[#a9afa9]"><span className="inline-flex items-center gap-2"><span className="text-[#c6f65c]">✦</span> Easy to follow</span><span className="inline-flex items-center gap-2"><span className="text-[#c6f65c]">✦</span> Rates in Naira</span><span className="inline-flex items-center gap-2"><span className="text-[#c6f65c]">✦</span> Dedicated trade pages</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div aria-hidden="true" className="fexex-hero-orb fexex-hero-orb-two" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#202323]/90 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.38)] backdrop-blur sm:p-5">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#181b1b] px-4 py-3 text-xs text-[#a9afa9]"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#c6f65c]" /> FEXEX TRADE DESK</span><span>Live experience</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
              <Link href="/trade" className="group rounded-2xl bg-[#c6f65c] p-5 text-[#161818] transition hover:-translate-y-1 hover:bg-[#d9ff86]"><div className="flex items-start justify-between"><span className="rounded-xl bg-[#161818]/10 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.12em]">GIFTCARDS</span><span className="text-xl transition group-hover:translate-x-1">↗</span></div><p className="mt-12 text-2xl font-bold tracking-[-0.05em]">Turn cards<br />into Naira.</p><p className="mt-4 text-xs font-semibold text-[#161818]/65">Choose a card, a sub-category, and its value.</p></Link>
              <Link href="/trade?type=crypto" className="group rounded-2xl border border-[#d6c7ff]/25 bg-[#d6c7ff]/10 p-5 transition hover:-translate-y-1 hover:border-[#d6c7ff]/60 hover:bg-[#d6c7ff]/15"><div className="flex items-start justify-between"><span className="rounded-xl bg-[#d6c7ff]/15 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.12em] text-[#e5dcff]">CRYPTO</span><span className="text-xl text-[#d6c7ff] transition group-hover:translate-x-1">↗</span></div><p className="mt-12 text-2xl font-bold tracking-[-0.05em]">Make a clean<br />crypto move.</p><p className="mt-4 text-xs font-semibold text-[#c8ccc7]">Select your asset and submit the amount to sell.</p></Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">{[["01", "Pick"], ["02", "Enter"], ["03", "Track"]].map(([number, label]) => <div key={number} className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><span className="text-[10px] font-bold text-[#c6f65c]">{number}</span><p className="mt-2 text-xs font-semibold">{label}</p></div>)}</div>
          </div>
          <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-white/10 bg-[#1a1d1d] px-4 py-3 shadow-xl sm:block"><p className="text-[10px] font-bold tracking-[0.12em] text-[#c6f65c]">A CLEARER ROUTE</p><p className="mt-1 text-xs font-semibold">Choose. Submit. Track.</p></div>
        </div>
      </section>

      <section aria-label="FEXEX trading highlights" className="relative z-10 border-y border-white/10 bg-[#c6f65c] py-3 text-[#161818]"><div className="fexex-marquee overflow-hidden"><div className="fexex-marquee-track" aria-hidden="true">{repeatedMarqueeItems.map((item, index) => <span key={`${item}-${index}`} className="flex shrink-0 items-center gap-5 px-4 text-sm font-extrabold tracking-[-0.03em]"><span>{item}</span><span className="text-lg leading-none">✦</span></span>)}</div><p className="sr-only">FEXEX supports Amazon, Apple, Steam, Google Play and more with clear Naira rates and secure trading.</p></div></section>

      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end"><div><p className="text-xs font-extrabold tracking-[0.14em] text-[#c6f65c]">HOW FEXEX FLOWS</p><h2 className="mt-4 max-w-sm text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Less hunting around. More moving forward.</h2></div><p className="max-w-xl text-sm leading-7 text-[#a9afa9] sm:text-base">We give each card and crypto asset its own route, so the details you need show up when you need them.</p></div>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">{steps.map((step, index) => <li key={step.number} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#202323] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#c6f65c]/45 hover:bg-[#242828]"><span aria-hidden="true" className="absolute -right-4 -top-7 text-8xl font-bold tracking-[-0.12em] text-white/[0.035]">{index + 1}</span><span className="relative inline-flex rounded-full bg-[#c6f65c]/10 px-3 py-1 text-xs font-extrabold text-[#d8ff96]">{step.number}</span><h3 className="relative mt-12 text-xl font-semibold tracking-[-0.04em]">{step.title}</h3><p className="relative mt-3 text-sm leading-6 text-[#a9afa9]">{step.copy}</p></li>)}</ol>
      </section>

      <section id="supported-cards" className="relative z-10 border-y border-white/10 bg-[#1a1d1d] py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-extrabold tracking-[0.14em] text-[#d6c7ff]">PICK YOUR VALUE</p><h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">The cards in your drawer have somewhere to go.</h2></div><Link href="/trade" className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold transition hover:border-[#c6f65c] hover:bg-[#c6f65c]/10">Browse the trade desk <span className="text-[#c6f65c]">→</span></Link></div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{featuredCards.map((giftCard, index) => <Link key={giftCard.code} href={`/trade/giftcard/${encodeURIComponent(giftCard.code)}`} className="group relative min-h-40 overflow-hidden rounded-2xl border border-white/10 bg-[#202323] p-4 transition duration-300 hover:-translate-y-1 hover:border-[#c6f65c]/55 hover:bg-[#262b2a]"><span className="absolute right-3 top-3 text-[10px] font-bold text-white/20">0{index + 1}</span><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f3ee] p-2 transition group-hover:rotate-[-6deg] group-hover:scale-110"><Image src={giftCard.icon} alt="" width={30} height={30} className="h-full w-full object-contain" /></span><p className="mt-12 pr-4 text-sm font-bold tracking-[-0.03em]">{giftCard.name}</p><span className="mt-2 inline-block text-xs font-semibold text-[#a9afa9] transition group-hover:text-[#c6f65c]">Start trade →</span></Link>)}</div></div></section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"><div className="rounded-[2rem] border border-[#d6c7ff]/20 bg-[linear-gradient(145deg,rgba(214,199,255,0.16),rgba(32,35,35,0.95)_60%)] p-7 sm:p-9"><p className="text-xs font-extrabold tracking-[0.14em] text-[#d6c7ff]">NO GUESSWORK NEEDED</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">See your rate before you start the conversation.</h2><p className="mt-5 max-w-lg text-sm leading-7 text-[#c8ccc7]">Our calculator gives you a simple view of current Naira gift-card rates before you pick a trade flow.</p><Link href="/giftcard-calculator" className="mt-8 inline-flex rounded-full bg-[#d6c7ff] px-5 py-3 text-sm font-bold text-[#161818] transition hover:-translate-y-0.5 hover:bg-[#e5dcff]">Open calculator <span className="ml-2">→</span></Link></div><div><p className="text-xs font-extrabold tracking-[0.14em] text-[#c6f65c]">QUESTIONS, ANSWERED</p><div className="mt-4 divide-y divide-white/10 rounded-3xl border border-white/10 bg-[#202323] px-5 sm:px-7">{faqs.map((faq) => <details key={faq.question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold marker:content-none">{faq.question}<span className="text-xl font-normal text-[#c6f65c] transition group-open:rotate-45">+</span></summary><p className="max-w-xl pt-3 text-sm leading-6 text-[#a9afa9]">{faq.answer}</p></details>)}</div></div></section>

      <footer className="relative z-10 border-t border-white/10 bg-[#111313]"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={100} height={28} className="h-7 w-auto" /><p className="mt-2 text-xs text-[#777a75]">Value in motion. Your move, made clearer.</p></div><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[#a9afa9]"><Link href="/login" className="transition hover:text-[#c6f65c]">Log in</Link><Link href="/signup" className="transition hover:text-[#c6f65c]">Create account</Link><Link href="/giftcard-calculator" className="transition hover:text-[#c6f65c]">Rate calculator</Link><span>© {new Date().getFullYear()} FEXEX</span></div></div></footer>
    </main>
  );
}
