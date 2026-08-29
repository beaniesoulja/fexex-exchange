"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Message = { id: string; body: string; createdAt: string; sender: { username: string | null; role: "USER" | "ADMIN" } };
type Trade = { id: string; giftCardBrand: string | null; totalValue: number; status: string };

export default function TradeRoomPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { status } = useSession();
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => { if (status === "unauthenticated") router.replace("/login"); }, [status, router]);
  useEffect(() => {
    if (!orderId || status !== "authenticated") return;
    const load = () => fetch(`/api/trades/${orderId}/messages`).then(async r => r.ok ? r.json() : null).then(data => { if (data) { setTrade(data.order); setMessages(data.messages); } });
    void load(); const timer = window.setInterval(load, 3000); return () => window.clearInterval(timer);
  }, [orderId, status]);
  const send = async (event: React.FormEvent) => { event.preventDefault(); if (!body.trim()) return; const response = await fetch(`/api/trades/${orderId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }); if (response.ok) { const saved = await response.json(); setMessages(current => [...current, saved]); setBody(""); } };

  return <main className="fexex-surface min-h-screen bg-[#161818] p-4 text-[#f4f3ee] sm:p-8"><div className="mx-auto max-w-2xl"><Link href="/trade" className="text-sm font-semibold text-[#c6f65c]">← Back to Trade</Link><section className="mt-5 rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 sm:p-7"><p className="text-xs font-bold tracking-[.16em] text-[#c6f65c]">FEXEX P2P ESCROW</p><h1 className="mt-2 text-2xl font-bold">{trade?.giftCardBrand ?? "Gift card"} trade room</h1><p className="mt-1 text-sm text-[#a9afa9]">Admin is the approved buyer. Your Naira payout is released only after review.</p><div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-[#1a1d1d] p-4">{messages.length ? messages.map(message => <div key={message.id} className={`max-w-[85%] rounded-2xl p-3 text-sm ${message.sender.role === "ADMIN" ? "bg-[#d6c7ff] text-[#161818]" : "ml-auto bg-[#2a2e2d]"}`}><p className="mb-1 text-xs font-bold">{message.sender.role === "ADMIN" ? "Admin" : `@${message.sender.username ?? "you"}`}</p>{message.body}</div>) : <p className="py-8 text-center text-sm text-[#a9afa9]">Escrow room ready. Send the first message to begin Admin review.</p>}</div><form onSubmit={send} className="mt-4 flex gap-2"><input value={body} onChange={e => setBody(e.target.value)} maxLength={1000} placeholder="Message Admin about this trade" className="min-w-0 flex-1 rounded-xl bg-[#f4f3ee] p-3 text-sm text-[#161818]"/><button className="rounded-xl bg-[#c6f65c] px-4 font-bold text-[#161818]">Send</button></form></section></div></main>;
}
