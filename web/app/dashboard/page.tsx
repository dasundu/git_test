"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { peso, timeAgo } from "@/lib/format";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Empty, ErrorNote, FeaturedTag, Spinner, StatusBadge } from "@/components/ui";
import type { Listing, ListingStatus } from "@/lib/types";

export default function Dashboard() {
  const ready = useRequireAuth(["SELLER", "DEALER", "ADMIN"]);
  const { me, refresh } = useAuth();
  const [items, setItems] = useState<Listing[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => api<Listing[]>("/listings/mine").then(setItems), []);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  if (!ready || !me || !items) return <Spinner />;

  const setStatus = async (id: string, status: ListingStatus) => { setErr(null); try { await api(`/listings/${id}/status`, { method: "PATCH", body: { status } }); load(); } catch (e: any) { setErr(e.message); } };
  const remove = async (id: string) => { if (!confirm("Delete this listing? This cannot be undone and still counts toward your free listings.")) return; await api(`/listings/${id}`, { method: "DELETE" }); load(); refresh(); };
  const q = me.quota;
  const totals = { views: items.reduce((a, l) => a + l.views, 0), inquiries: items.reduce((a, l) => a + (l.inquiries ?? 0), 0), offers: items.reduce((a, l) => a + (l.offerCount ?? 0), 0) };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{me.dealership ? me.dealership.name : "My listings"}</h1>
        <div className="flex gap-2">
          {me.role === "DEALER" && <Link className="btn-outline" href="/dashboard/profile">Edit dealership profile</Link>}
          <Link className="btn-primary" href="/dashboard/new">+ Post a truck</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat k="Total views" v={totals.views} /><Stat k="Buyer inquiries" v={totals.inquiries} /><Stat k="Offers received" v={totals.offers} />
        {q && <Stat k="Free listings left" v={`${q.remaining} / ${q.limit}`} hint={q.mode === "MONTHLY" ? "resets monthly" : "one-time allowance"} />}
      </div>
      <ErrorNote error={err} />

      {items.length === 0 ? <Empty title="You haven't posted any trucks yet"><Link className="font-semibold text-brand-dark underline" href="/dashboard/new">Post your first truck</Link></Empty> : (
        <div className="card divide-y divide-stone-100">
          {items.map((l) => (
            <div key={l.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <Link href={`/listings/${l.id}`} className="flex min-w-0 flex-1 gap-3">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded bg-stone-200">{l.images[0] && <img src={l.images[0].url} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.title}</p>
                  <p className="text-sm font-bold text-brand-dark">{peso(l.price)}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <StatusBadge status={l.status} />{l.featured && <FeaturedTag />}
                    {l.moderation === "HIDDEN" && <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-700">Hidden by admin</span>}
                    <span>👁 {l.views}</span><span>💬 {l.inquiries}</span><span>♥ {l.saves}</span><span>Confirmed {timeAgo(l.availabilityConfirmedAt)}</span>
                  </div>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Status" className="input w-32" value={l.status} onChange={(e) => setStatus(l.id, e.target.value as ListingStatus)}>
                  <option value="AVAILABLE">Available</option><option value="RESERVED">Reserved</option><option value="SOLD">Sold</option>
                </select>
                <Link className="btn-outline" href={`/dashboard/edit/${l.id}`}>Edit</Link>
                <button className="btn-outline text-red-700" onClick={() => remove(l.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const Stat = ({ k, v, hint }: { k: string; v: number | string; hint?: string }) => <div className="card p-4"><p className="text-xs text-stone-500">{k}</p><p className="text-2xl font-extrabold">{v}</p>{hint && <p className="text-[11px] text-stone-400">{hint}</p>}</div>;
