import Image from "next/image";
import Link from "next/link";
import { giftCards } from "@/lib/gift-cards";

const navigation = [
  { label: "Home", href: "#home" },
  { label: "Sell Crypto", href: "#sell-crypto" },
  { label: "Sell Giftcard", href: "/sell-giftcard" },
  { label: "Dashboard", href: "/dashboard" },
];

export default function Home() {
  return (
    <main id="home" className="fexex-surface min-h-screen overflow-hidden bg-[#161818] text-[#f4f3ee]">

      <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-5 px-5 py-5 sm:px-8 sm:py-6">
        <Link href="#home" aria-label="Fexex home" className="shrink-0">
          <Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} priority className="h-8 w-auto sm:h-9" />
        </Link>

        <nav
          aria-label="Main navigation"
          className="order-3 grid w-full grid-cols-4 items-center gap-1 pt-1 text-center text-[11px] font-medium leading-4 text-[#a9afa9] sm:gap-6 sm:text-sm md:order-none md:flex md:w-auto md:gap-7 md:pt-0 md:text-left"
        >
          {navigation.map((item) => (
            <Link key={item.label} href={item.href} className="transition hover:text-[#c6f65c]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/login" className="text-xs font-semibold text-[#f4f3ee] transition hover:text-[#c6f65c] sm:text-sm">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#c6f65c] px-3 py-2.5 text-xs font-bold text-[#161818] transition hover:bg-[#d9ff86] sm:px-5 sm:text-sm"
          >
            Start Trading
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-32 lg:pt-24">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-[#c6f65c]/25 bg-[#c6f65c]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#d8ff96]">
            FEXEX / VALUE IN MOTION
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl">
            Trade value.<br /><span className="fexex-serif text-[#d6c7ff]">Feel certain.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            A clearer way to move the value you already have into Naira. No noisy guesswork—just your next move.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/signup" className="rounded-full bg-[#c6f65c] px-6 py-3.5 font-bold text-[#161818] transition hover:bg-[#d9ff86]">
              Start Trading
            </Link>
            <Link href="/sell-giftcard" className="rounded-full border border-[#f4f3ee]/20 px-6 py-3.5 font-semibold text-[#f4f3ee] transition hover:border-[#c6f65c]/60 hover:bg-[#c6f65c]/10">
              Explore services
            </Link>
          </div>
        </div>

        <div className="relative rounded-[2rem] border border-[#f4f3ee]/10 bg-[#202323] p-5 shadow-2xl shadow-black/40 before:absolute before:-right-12 before:top-12 before:-z-10 before:h-48 before:w-48 before:rounded-full before:border before:border-[#d6c7ff]/30 sm:p-7">
          <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-5 sm:p-6">
            <div className="flex items-center justify-between text-sm text-[#a9afa9]">
              <span>Available balance</span>
              <span className="rounded-full bg-[#c6f65c]/10 px-3 py-1 text-xs font-semibold text-[#d8ff96]">Clear rate</span>
            </div>
            <p className="mt-3 text-4xl font-semibold">₦2,480,000</p>
            <div className="mt-7 rounded-xl bg-[#f4f3ee]/5 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#a9afa9]">You send</span>
                <span className="font-semibold">Bitcoin</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-semibold">0.025 BTC</span>
                <span className="text-sm font-medium text-[#d8ff96]">≈ ₦2,480,000</span>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-[#c6f65c] p-4 text-[#161818]">
              <div className="flex items-center justify-between text-sm font-medium"><span>You receive</span><span>Naira</span></div>
              <p className="mt-2 text-2xl font-bold">₦2,480,000</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-[#a9afa9]">
            <span>Secure trades</span><span>Clear pricing</span><span>Quick support</span>
          </div>
        </div>
      </section>

      <section id="sell-crypto" className="relative z-10 border-y border-[#f4f3ee]/10 bg-[#1a1d1d]">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 sm:px-8 md:grid-cols-2">
          <article className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 transition hover:-translate-y-1 hover:border-[#d6c7ff]/50">
            <p className="text-sm font-semibold text-[#d6c7ff]">SELL CRYPTO</p>
            <h2 className="mt-3 text-3xl font-semibold">Your crypto, your move.</h2>
            <p className="mt-4 leading-7 text-[#c8ccc7]">Exchange supported digital assets with a process that keeps every step easy to understand.</p>
            <Link href="/login" className="mt-7 inline-block font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Sell Crypto →</Link>
          </article>
          <article id="sell-giftcard" className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 transition hover:-translate-y-1 hover:border-[#c6f65c]/50">
            <p className="text-sm font-semibold text-[#c6f65c]">SELL GIFTCARD</p>
            <h2 className="mt-3 text-3xl font-semibold">Unlock the value in your cards.</h2>
            <p className="mt-4 leading-7 text-[#c8ccc7]">Submit eligible gift cards with a Naira value and receive your approved payout in ₦.</p>
            <Link href="/sell-giftcard" className="mt-7 inline-block font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Sell Giftcard →</Link>
          </article>
        </div>
      </section>

      <section aria-labelledby="gift-cards-heading" className="relative z-10 mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-semibold text-[#c6f65c]">SUPPORTED GIFT CARDS</p>
            <h2 id="gift-cards-heading" className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">The cards you know. A clearer way to move their value.</h2>
            <p className="mt-4 max-w-xl leading-7 text-[#a9afa9]">Choose from nine card brands at the start of your trade. We will guide you through the details from there.</p>
          </div>
          <Link href="/sell-giftcard" className="inline-flex w-fit items-center rounded-full border border-[#f4f3ee]/20 px-5 py-3 text-sm font-semibold transition hover:border-[#c6f65c] hover:bg-[#c6f65c]/10">Sell a gift card <span className="ml-3 text-[#c6f65c]">→</span></Link>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Supported gift card brands">
          {giftCards.map((giftCard) => (
            <li key={giftCard.code} className="group rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-4 transition hover:-translate-y-1 hover:border-[#c6f65c]/50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c6f65c]/10 text-[10px] font-bold tracking-wide text-[#d8ff96] group-hover:bg-[#c6f65c] group-hover:text-[#161818]">{giftCard.code}</span>
              <p className="mt-8 text-sm font-semibold text-[#f4f3ee]">{giftCard.name}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-[#777a75] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} FEXEX. Value in motion.</span>
        <Link href="/dashboard" className="transition hover:text-[#c6f65c]">Go to Dashboard →</Link>
      </footer>
    </main>
  );
}
