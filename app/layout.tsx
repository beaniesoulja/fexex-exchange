// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers"; // Import the Providers

export const metadata: Metadata = {
  title: "FEXEX | Crypto & Giftcard Exchange",
  description: "Trade crypto and gift cards for Naira with FEXEX.",
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
