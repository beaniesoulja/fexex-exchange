import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="fexex-surface min-h-screen bg-[#161818] px-5 py-12 text-[#f4f3ee] sm:px-8">
      <section className="mx-auto max-w-2xl rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-7 sm:p-10">
        <p className="text-xs font-bold tracking-[0.18em] text-[#c6f65c]">ABOUT FEXEX</p>
        <h1 className="mt-3 text-3xl font-bold">Value, moved clearly.</h1>
        <p className="mt-3 leading-7 text-[#a9afa9]">FEXEX helps customers sell supported gift cards and exchange crypto to Naira with clear pricing and account-based trade tracking.</p>
        <Link href="/dashboard" className="mt-7 inline-flex rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86]">Back to dashboard</Link>
      </section>
    </main>
  );
}
