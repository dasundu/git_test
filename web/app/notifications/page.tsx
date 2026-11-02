"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { useSocketEvent } from "@/lib/realtime";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Empty, Spinner } from "@/components/ui";
import type { Notification } from "@/lib/types";

export default function Notifications() {
  const ready = useRequireAuth();
  const { refresh } = useAuth();
  const [items, setItems] = useState<Notification[] | null>(null);
  const load = useCallback(() => api<Notification[]>("/notifications").then(setItems), []);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  useSocketEvent("notification:new", load);
  if (!ready || !items) return <Spinner />;
  const readAll = async () => { await api("/notifications/read-all", { method: "POST" }); await load(); refresh(); };
  const open = (n: Notification) => { if (!n.readAt) api(`/notifications/${n.id}/read`, { method: "POST" }).then(refresh); };
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-extrabold">Notifications</h1>{items.some((n) => !n.readAt) && <button className="text-sm font-semibold text-brand-dark" onClick={readAll}>Mark all read</button>}</div>
      {items.length === 0 ? <Empty title="You're all caught up" /> : (
        <ul className="card divide-y divide-stone-100">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.link ?? "#"} onClick={() => open(n)} className={`block p-4 hover:bg-stone-50 ${n.readAt ? "" : "bg-amber-50/60"}`}>
                <div className="flex justify-between gap-3"><p className="text-sm font-semibold">{n.title}</p><span className="shrink-0 text-xs text-stone-400">{timeAgo(n.createdAt)}</span></div>
                <p className="text-sm text-stone-600">{n.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
