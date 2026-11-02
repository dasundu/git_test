"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { peso, timeAgo } from "@/lib/format";
import { useSocketEvent } from "@/lib/realtime";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { Message, Offer } from "@/lib/types";
import { ErrorNote, Spinner, StatusBadge } from "./ui";

interface Detail {
  conversation: { id: string; role: "buyer" | "seller"; buyerId: string; sellerId: string; buyer: { id: string; name: string }; seller: { id: string; name: string; messengerUrl: string | null }; listing: { id: string; title: string; price: number; status: any; images: { url: string }[] } };
  messages: Message[];
  offers: Offer[];
}

export default function Thread({ id }: { id: string }) {
  const ready = useRequireAuth();
  const { me, refresh } = useAuth();
  const [d, setD] = useState<Detail | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try { setD(await api<Detail>(`/conversations/${id}`)); refresh(); } catch (e: any) { if (e.status === 404) setNotFound(true); }
  }, [id, refresh]);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  useSocketEvent<{ conversationId: string }>("message:new", (p) => { if (p.conversationId === id) load(); });
  useSocketEvent("offer:update", (o: Offer) => { if (o.conversationId === id) load(); });
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [d?.messages.length]);

  if (notFound) return <p className="card mx-auto max-w-md p-8 text-center">Conversation not found.</p>;
  if (!ready || !d || !me) return <Spinner />;
  const { conversation: c, messages, offers } = d;
  const isBuyer = c.role === "buyer";
  const other = isBuyer ? c.seller : c.buyer;
  const offerById = new Map(offers.map((o) => [o.id, o]));
  const pending = offers.find((o) => o.status === "PENDING");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText(""); setErr(null);
    try { await api(`/conversations/${id}/messages`, { body: { body } }); await load(); } catch (e: any) { setErr(e.message); setText(body); }
  };
  const act = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); await load(); } catch (e: any) { setErr(e.message); } };

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] min-h-[28rem] max-w-3xl flex-col">
      <div className="card mb-3 flex items-center gap-3 p-3">
        <Link href="/inbox" className="text-stone-400 hover:text-stone-700" aria-label="Back to inbox">←</Link>
        <Link href={`/listings/${c.listing.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-stone-200">{c.listing.images[0] && <img src={c.listing.images[0].url} alt="" className="h-full w-full object-cover" />}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{c.listing.title}</p>
            <p className="text-xs text-stone-500">{peso(c.listing.price)} · chatting with {other.name}</p>
          </div>
        </Link>
        <StatusBadge status={c.listing.status} />
      </div>

      <div className="card flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-stone-400">Say hello 👋</p>}
        {messages.map((m) => {
          if (m.type === "SYSTEM") return <p key={m.id} className="text-center text-xs text-stone-500">{m.body} · {timeAgo(m.createdAt)}</p>;
          const mine = m.senderId === me.id;
          const offer = m.type === "OFFER" && m.offerId ? offerById.get(m.offerId) : undefined;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] space-y-2 rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-brand text-white" : "bg-stone-100"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {offer && <OfferActions offer={offer} meId={me.id} mine={mine} act={act} />}
                <p className={`text-[10px] ${mine ? "text-white/70" : "text-stone-400"}`}>{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="mt-3 space-y-2">
        <ErrorNote error={err} />
        {isBuyer && !pending && c.listing.status !== "SOLD" && (
          offerOpen ? (
            <OfferForm onCancel={() => setOfferOpen(false)} onSubmit={(amount, note) => act(async () => { await api(`/conversations/${id}/offers`, { body: { amount, note } }); setOfferOpen(false); })} initial={c.listing.price} />
          ) : <button className="btn-outline w-full" onClick={() => setOfferOpen(true)}>Make an offer</button>
        )}
        <form onSubmit={send} className="flex gap-2">
          <input className="input" placeholder="Type a message…" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} aria-label="Message" />
          <button className="btn-primary" disabled={!text.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900", ACCEPTED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-red-100 text-red-800",
  COUNTERED: "bg-stone-200 text-stone-700", WITHDRAWN: "bg-stone-200 text-stone-600",
};

function OfferActions({ offer, meId, mine, act }: { offer: Offer; meId: string; mine: boolean; act: (fn: () => Promise<unknown>) => void }) {
  const [counter, setCounter] = useState(false);
  const iRespond = offer.status === "PENDING" && !mine;
  const respond = (action: string, amount?: number) => act(() => api(`/offers/${offer.id}/respond`, { body: { action, amount } }));
  return (
    <div className="rounded-lg bg-white p-2.5 text-stone-900">
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-extrabold">{peso(offer.amount)}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[offer.status]}`}>{offer.status[0] + offer.status.slice(1).toLowerCase()}</span>
      </div>
      {iRespond && !counter && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => respond("ACCEPT")}>Accept</button>
          <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => setCounter(true)}>Counter</button>
          <button className="btn-outline px-3 py-1.5 text-xs text-red-700" onClick={() => respond("REJECT")}>Decline</button>
        </div>
      )}
      {iRespond && counter && <OfferForm compact onCancel={() => setCounter(false)} onSubmit={(a) => { setCounter(false); respond("COUNTER", a); }} initial={offer.amount} />}
      {offer.status === "PENDING" && mine && (
        <button className="mt-2 text-xs font-semibold text-stone-500 underline" onClick={() => act(() => api(`/offers/${offer.id}/withdraw`, { method: "POST" }))}>Withdraw offer</button>
      )}
    </div>
  );
}

function OfferForm({ onSubmit, onCancel, initial, compact }: { onSubmit: (amount: number, note?: string) => void; onCancel: () => void; initial: number; compact?: boolean }) {
  const [amount, setAmount] = useState(String(initial));
  const [note, setNote] = useState("");
  return (
    <form className={`flex gap-2 ${compact ? "mt-2" : "card p-3"}`} onSubmit={(e) => { e.preventDefault(); const n = Number(amount); if (n > 0) onSubmit(n, note || undefined); }}>
      <input className="input" inputMode="numeric" aria-label="Offer amount (₱)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} autoFocus />
      {!compact && <input className="input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />}
      <button className="btn-primary px-3 text-xs">Send</button>
      <button type="button" className="btn-outline px-3 text-xs" onClick={onCancel}>Cancel</button>
    </form>
  );
}
