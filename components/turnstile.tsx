"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        action: string;
        theme: "light" | "dark" | "auto";
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": () => void;
      }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  action: "login" | "password_reset";
  onTokenChange: (token: string | null) => void;
}

export function Turnstile({ action, onTokenChange }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const siteKey = process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "" : "";

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) return;

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "dark",
      callback: (token) => onTokenChange(token),
      "expired-callback": () => onTokenChange(null),
      "error-callback": () => onTokenChange(null),
    });

    return () => window.turnstile?.remove(widgetId);
  }, [action, onTokenChange, scriptReady, siteKey]);

  if (!siteKey) return null;

  return (
    <div className="flex justify-center py-1">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div ref={containerRef} className="min-h-[65px]" />
    </div>
  );
}
