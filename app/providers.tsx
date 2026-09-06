// app/providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";
import { SupportWidget } from "@/components/support-widget";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <SupportWidget />
    </SessionProvider>
  );
}