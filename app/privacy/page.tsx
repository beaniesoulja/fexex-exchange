import Link from "next/link";

const sections = [
  {
    title: "1. Information we collect",
    body: "When you create a FEXEX account we collect your email address, legal name, date of birth, phone number, and a password (stored as a secure hash, never in plain text). When you submit a trade we collect the details needed to process it, such as the gift card brand, value, and card code, your crypto wallet address, or your bank payout details. We also automatically record device, browser, and IP information, and activity such as logins and trade submissions, to help secure your account and improve the service.",
  },
  {
    title: "2. How we use your information",
    body: "We use your information to create and secure your account, process and verify trades, calculate and pay out your Naira or crypto proceeds, communicate with you about your trades and account, prevent fraud and abuse, and meet our legal and regulatory obligations.",
  },
  {
    title: "3. How we share your information",
    body: "We do not sell your personal information. We share it only where necessary: with payment and crypto payout providers to complete a trade, with service providers who help us run FEXEX (such as hosting and communications tools), and with regulators or law enforcement where required by law.",
  },
  {
    title: "4. Data retention",
    body: "We keep account and trade records for as long as your account is active and for a further period afterward where needed to meet legal, accounting, or fraud-prevention obligations.",
  },
  {
    title: "5. Your rights",
    body: "You can review and update most of your account details from your Profile page at any time. To request a copy of your data, ask us to correct it, or ask us to close your account, contact us using the details below.",
  },
  {
    title: "6. Security",
    body: "We use industry-standard measures, including password hashing and encrypted connections, to protect your information. No method of transmission or storage is completely secure, so we encourage you to use a strong, unique password and enable any additional account protections we offer.",
  },
  {
    title: "7. Cookies",
    body: "We use strictly necessary cookies to keep you signed in and to keep the service secure. We do not use cookies for third-party advertising.",
  },
  {
    title: "8. Changes to this policy",
    body: "We may update this policy from time to time. If we make material changes, we will let you know through the app or by email before they take effect.",
  },
  {
    title: "9. Contact us",
    body: "Questions about this policy or your data can be sent to our support team via the Contact Us page.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="fexex-surface min-h-screen bg-[#161818] px-5 py-12 text-[#f4f3ee] sm:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-7 sm:p-10">
        <p className="text-xs font-bold tracking-[0.18em] text-[#c6f65c]">LEGAL</p>
        <h1 className="mt-3 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-3 leading-7 text-[#a9afa9]">This policy explains what information FEXEX collects, how we use it, and the choices you have. It applies to everyone who uses the FEXEX website and app.</p>

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
