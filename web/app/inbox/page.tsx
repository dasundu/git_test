"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useSocketEvent } from "@/lib/realtime";
import { Empty, Spinner } from "@/components/ui";
import type { ConversationSummary } from "@/lib/types";

export default function Inbox() {
  const ready = useRequireAuth();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const load = useCallback(() => api<ConversationSummary[]>("/conversations").then(setItems), []);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  useSocketEvent("message:new", load);
  if (!ready || !items) return <Spinner />;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-extrabold">Inbox</h1>
      {items.length === 0 ? <Empty title="No conversations yet">Open a listing and tap “Chat with seller” to start one.</Empty> : (
        <ul className="card divide-y divide-stone-100">
          {items.map((c) => {
            const other = c.role === "buyer" ? c.seller.name : c.buyer.name;
            return (
              <li key={c.id}>
                <Link href={`/inbox/${c.id}`} className={`flex gap-3 p-4 hover:bg-stone-50 ${c.unread ? "bg-amber-50/60" : ""}`}>
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-stone-200">{c.listing.images[0] && <img src={c.listing.images[0].url} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm ${c.unread ? "font-bold" : "font-semibold"}`}>{other} <span className="font-normal text-stone-400">· {c.role === "buyer" ? "seller" : "buyer"}</span></p>
                      <span className="shrink-0 text-xs text-stone-400">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-xs text-stone-500">{c.listing.title}</p>
                    <p className={`truncate text-sm ${c.unread ? "text-stone-900" : "text-stone-500"}`}>{c.lastMessage?.body ?? "No messages yet"}</p>
                  </div>
                  {c.unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
