"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { ErrorNote, Spinner, StatusBadge, VerifiedBadge } from "@/components/ui";

const TABS = ["Overview", "Dealerships", "Listings", "Reports", "Users", "Settings"] as const;
type Tab = (typeof TABS)[number];

export default function Admin() {
  const ready = useRequireAuth(["ADMIN"]);
  const [tab, setTab] = useState<Tab>("Overview");
  if (!ready) return <Spinner />;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Admin</h1>
      <div className="flex gap-1 overflow-x-auto border-b border-stone-200">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${tab === t ? "border-brand text-brand-dark" : "border-transparent text-stone-500 hover:text-stone-800"}`}>{t}</button>)}
      </div>
      {tab === "Overview" && <Overview />}
      {tab === "Dealerships" && <Dealerships />}
      {tab === "Listings" && <Listings />}
      {tab === "Reports" && <Reports />}
      {tab === "Users" && <Users />}
      {tab === "Settings" && <Settings />}
    </div>
  );
}

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => api<T>(path).then(setData).catch((e) => setErr(e.message)), [path]);
  useEffect(() => { setData(null); load(); }, [load]);
  return { data, err, reload: load, setErr };
}

function Overview() {
  const { data } = useLoad<Record<string, number>>("/admin/stats");
  if (!data) return <Spinner />;
  const labels: Record<string, string> = { users: "Users", dealers: "Dealerships", verified: "Verified dealers", listings: "Listings", available: "Available now", sold: "Sold", openReports: "Open reports", convos: "Conversations", offers: "Offers" };
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Object.entries(labels).map(([k, l]) => <div key={k} className="card p-4"><p className="text-xs text-stone-500">{l}</p><p className="text-3xl font-extrabold">{data[k]}</p></div>)}</div>;
}

function Dealerships() {
  const [pending, setPending] = useState(false);
  const { data, err, reload, setErr } = useLoad<any[]>(`/admin/dealerships${pending ? "?pending=1" : ""}`);
  const act = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); reload(); } catch (e: any) { setErr(e.message); } };
  if (!data) return <Spinner />;
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pending} onChange={(e) => setPending(e.target.checked)} /> Only show unverified</label>
      <ErrorNote error={err} />
      <div className="card divide-y divide-stone-100">
        {data.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/dealers/${d.slug}`} className="font-bold hover:underline">{d.name}</Link> {d.verified && <VerifiedBadge small />}
              <p className="text-xs text-stone-500">{d.user.name} · {d.user.email} · {d.user.phone ?? "no phone"} · {d._count.listings} listings · joined {timeAgo(d.createdAt)}</p>
              {d.featured && <p className="text-xs font-semibold text-brand-dark">Featured{d.featuredUntil ? ` until ${new Date(d.featuredUntil).toLocaleDateString()}` : ""}</p>}
            </div>
            <button className={d.verified ? "btn-outline" : "btn-primary"} onClick={() => act(() => api(`/admin/dealerships/${d.id}/verify`, { method: "PATCH", body: { verified: !d.verified } }))}>{d.verified ? "Remove verification" : "Verify dealer"}</button>
            <button className="btn-outline" onClick={() => {
              if (d.featured) return act(() => api(`/admin/dealerships/${d.id}/feature`, { method: "PATCH", body: { featured: false } }));
              const days = Number(prompt("Feature on the homepage for how many days?", "30"));
              if (days > 0) act(() => api(`/admin/dealerships/${d.id}/feature`, { method: "PATCH", body: { featured: true, days } }));
            }}>{d.featured ? "Unfeature" : "Feature"}</button>
          </div>
        ))}
        {data.length === 0 && <p className="p-6 text-center text-sm text-stone-500">No dealerships.</p>}
      </div>
    </div>
  );
}

function Listings() {
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("");
  const { data, err, reload, setErr } = useLoad<{ total: number; items: any[] }>(`/admin/listings?q=${encodeURIComponent(q)}${mod ? `&moderation=${mod}` : ""}`);
  const act = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); reload(); } catch (e: any) { setErr(e.message); } };
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><input className="input max-w-xs" placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-40" value={mod} onChange={(e) => setMod(e.target.value)}><option value="">All</option><option value="ACTIVE">Active</option><option value="HIDDEN">Hidden</option><option value="REMOVED">Removed</option></select></div>
      <ErrorNote error={err} />
      {!data ? <Spinner /> : (
        <div className="card divide-y divide-stone-100">
          {data.items.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-stone-200">{l.images[0] && <img src={l.images[0].url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <Link href={`/listings/${l.id}`} className="font-semibold hover:underline">{l.title}</Link>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500"><StatusBadge status={l.status} /><span>{l.moderation}</span><span>{l.dealership?.name ?? l.seller.name}</span>{l.featured && <b className="text-brand-dark">Featured</b>}</div>
              </div>
              <button className="btn-outline" onClick={() => {
                if (l.featured) return act(() => api(`/admin/listings/${l.id}`, { method: "PATCH", body: { featured: false } }));
                const days = Number(prompt("Feature on the homepage for how many days?", "14"));
                if (days > 0) act(() => api(`/admin/listings/${l.id}`, { method: "PATCH", body: { featured: true, days } }));
              }}>{l.featured ? "Unfeature" : "Feature"}</button>
              {l.moderation === "ACTIVE" ? <button className="btn-outline text-red-700" onClick={() => act(() => api(`/admin/listings/${l.id}`, { method: "PATCH", body: { moderation: "HIDDEN" } }))}>Hide</button>
                : <button className="btn-outline" onClick={() => act(() => api(`/admin/listings/${l.id}`, { method: "PATCH", body: { moderation: "ACTIVE" } }))}>Restore</button>}
            </div>
          ))}
          {data.items.length === 0 && <p className="p-6 text-center text-sm text-stone-500">No listings found.</p>}
        </div>
      )}
    </div>
  );
}

function Reports() {
  const [status, setStatus] = useState("OPEN");
  const { data, err, reload, setErr } = useLoad<any[]>(`/admin/reports?status=${status}`);
  const act = async (id: string, body: object) => { setErr(null); try { await api(`/admin/reports/${id}`, { method: "PATCH", body }); reload(); } catch (e: any) { setErr(e.message); } };
  return (
    <div className="space-y-3">
      <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option></select>
      <ErrorNote error={err} />
      {!data ? <Spinner /> : (
        <div className="card divide-y divide-stone-100">
          {data.map((r) => (
            <div key={r.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><Link href={`/listings/${r.listing.id}`} className="font-semibold hover:underline">{r.listing.title}</Link><p className="text-xs text-stone-500">{r.reason} · by {r.reporter.name} ({r.reporter.email}) · {timeAgo(r.createdAt)} · listing is {r.listing.moderation}</p></div>
                {status === "OPEN" && <div className="flex gap-2">
                  <button className="btn-danger" onClick={() => act(r.id, { status: "RESOLVED", hideListing: true })}>Hide listing &amp; resolve</button>
                  <button className="btn-outline" onClick={() => act(r.id, { status: "RESOLVED" })}>Resolve</button>
                  <button className="btn-outline" onClick={() => act(r.id, { status: "DISMISSED" })}>Dismiss</button></div>}
              </div>
              {r.details && <p className="rounded bg-stone-50 p-2 text-sm text-stone-700">{r.details}</p>}
            </div>
          ))}
          {data.length === 0 && <p className="p-6 text-center text-sm text-stone-500">No {status.toLowerCase()} reports.</p>}
        </div>
      )}
    </div>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const { data, err, reload, setErr } = useLoad<{ total: number; items: any[] }>(`/admin/users?q=${encodeURIComponent(q)}${role ? `&role=${role}` : ""}`);
  const act = async (id: string, body: object) => { setErr(null); try { await api(`/admin/users/${id}`, { method: "PATCH", body }); reload(); } catch (e: any) { setErr(e.message); } };
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><input className="input max-w-xs" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-40" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option><option>BUYER</option><option>SELLER</option><option>DEALER</option><option>ADMIN</option></select></div>
      <ErrorNote error={err} />
      {!data ? <Spinner /> : (
        <div className="card divide-y divide-stone-100">
          {data.items.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1"><p className="font-semibold">{u.name} <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-bold">{u.role}</span> {u.suspended && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">SUSPENDED</span>}</p>
                <p className="text-xs text-stone-500">{u.email} · {u.phone ?? "no phone"} · {u._count.listings} listings · joined {timeAgo(u.createdAt)}</p></div>
              <button className={u.suspended ? "btn-outline" : "btn-outline text-red-700"} onClick={() => act(u.id, { suspended: !u.suspended })}>{u.suspended ? "Reinstate" : "Suspend"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Settings() {
  const { data, err } = useLoad<{ freeListingLimit: string; freeListingMode: string }>("/admin/settings");
  const [f, setF] = useState<{ freeListingLimit: string; freeListingMode: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [e2, setE2] = useState<string | null>(null);
  useEffect(() => { if (data) setF(data); }, [data]);
  if (!f) return <Spinner />;
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null); setE2(null);
    try { await api("/admin/settings", { method: "PUT", body: { freeListingLimit: Number(f.freeListingLimit), freeListingMode: f.freeListingMode } }); setMsg("Saved."); } catch (e: any) { setE2(e.message); }
  };
  return (
    <form onSubmit={save} className="card max-w-md space-y-4 p-5">
      <h2 className="font-bold">Free listing allowance</h2>
      <p className="text-sm text-stone-500">Applies to every seller and dealership. Decide whether the allowance is a one-time lifetime amount or resets each month.</p>
      <label className="block"><span className="label">Free listings per seller</span><input className="input" inputMode="numeric" value={f.freeListingLimit} onChange={(e) => setF({ ...f, freeListingLimit: e.target.value.replace(/[^0-9]/g, "") })} /></label>
      <label className="block"><span className="label">Allowance type</span>
        <select className="input" value={f.freeListingMode} onChange={(e) => setF({ ...f, freeListingMode: e.target.value })}><option value="ONE_TIME">One-time (lifetime)</option><option value="MONTHLY">Resets every month</option></select></label>
      <ErrorNote error={err ?? e2} />{msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <button className="btn-primary">Save</button>
    </form>
  );
}
