import Link from "next/link";

const sections = [
  {
    title: "1. Acceptance of these terms",
    body: "By creating a FEXEX account or using the FEXEX website and app, you agree to these Terms of Use and to our Privacy Policy. If you do not agree, do not use FEXEX.",
  },
  {
    title: "2. Eligibility",
    body: "You must be at least 18 years old and able to form a binding contract to use FEXEX. The name on your account must match the legal name you provide, as shown on your government-issued ID.",
  },
  {
    title: "3. Your account",
    body: "You are responsible for keeping your password and login details confidential and for all activity that happens under your account. Tell us immediately if you suspect unauthorized access to your account.",
  },
  {
    title: "4. Trading gift cards",
    body: "FEXEX lets you sell supported gift cards for a Naira payout at the rate shown at the time you submit a trade. Every trade is reviewed by an admin before it is marked successful or failed; a trade remains pending until that review is complete. You confirm that any gift card you submit is legitimately yours to sell, and was not obtained fraudulently.",
  },
  {
    title: "5. Rates and payouts",
    body: "Published rates can change at any time and apply only to new trades from the moment they are set; a rate shown to you does not carry over to a trade you submit after it changes. Expected payout figures are estimates until an admin confirms the final outcome of your trade.",
  },
  {
    title: "6. Prohibited use",
    body: "You may not use FEXEX to submit a gift card that is stolen, fraudulently obtained, or that you do not have the right to sell; to attempt to manipulate rates or the review process; or to use the platform for money laundering or any other unlawful purpose. We may decline, delay, or reverse a trade, and may suspend or close an account, where we reasonably suspect any of the above.",
  },
  {
    title: "7. Fees and taxes",
    body: "Any fees are reflected in the rate shown at the time of your trade. You are responsible for any taxes that apply to your use of FEXEX.",
  },
  {
    title: "8. Account closure",
    body: "You may request closure of your account at any time by contacting support. We may suspend or close an account that violates these terms or where we are required to do so by law.",
  },
  {
    title: "9. No investment advice",
    body: "Nothing on FEXEX is financial or investment advice. You trade at your own risk.",
  },
  {
    title: "10. Disclaimers and limitation of liability",
    body: "FEXEX is provided “as is.” To the fullest extent permitted by law, FEXEX is not liable for indirect or consequential losses arising from your use of the platform.",
  },
  {
    title: "11. Changes to these terms",
    body: "We may update these terms from time to time. If we make material changes, we will let you know through the app or by email before they take effect. Continuing to use FEXEX after a change takes effect means you accept the updated terms.",
  },
  {
    title: "12. Contact us",
    body: "Questions about these terms can be sent to our support team via the Contact Us page.",
  },
];

export default function TermsOfUsePage() {
  return (
    <main className="fexex-surface min-h-screen bg-[#161818] px-5 py-12 text-[#f4f3ee] sm:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-7 sm:p-10">
        <p className="text-xs font-bold tracking-[0.18em] text-[#c6f65c]">LEGAL</p>
        <h1 className="mt-3 text-3xl font-bold">Terms of Use</h1>
        <p className="mt-3 leading-7 text-[#a9afa9]">These terms govern your use of FEXEX. Please read them alongside our <Link href="/privacy" className="font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Privacy Policy</Link>.</p>

        <div className="mt-8 space-y-7 border-t border-[#f4f3ee]/10 pt-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold text-[#f4f3ee]">{section.title}</h2>
              <p className="mt-2 leading-7 text-[#a9afa9]">{section.body}</p>
            </div>
          ))}
        </div>

        <Link href="/" className="mt-9 inline-flex rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86]">Back to home</Link>
      </section>
    </main>
  );
}
