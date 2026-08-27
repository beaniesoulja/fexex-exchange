// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers"; // Import the Providers

export const metadata: Metadata = {
  title: "Crypto & Giftcard Exchange",
  description: "Secure OTC Exchange",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Wrap children in the Providers */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
