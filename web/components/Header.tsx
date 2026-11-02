"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "TruckMarket PH";

export default function Header() {
  const { me, logout, loading } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api<Category[]>("/categories").then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/browse${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };
  const canSell = me && ["SELLER", "DEALER", "ADMIN"].includes(me.role);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">T</span>
          <span className="hidden sm:inline">{SITE}</span>
        </Link>

        <select aria-label="Browse by category" className="input hidden w-44 md:block" value="" onChange={(e) => e.target.value && router.push(`/browse?category=${e.target.value}`)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.slug}>{c.name}{c.count ? ` (${c.count})` : ""}</option>)}
        </select>

        <form onSubmit={search} className="flex min-w-0 flex-1">
          <input className="input rounded-r-none" placeholder="Search trucks, brands, equipment…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <button className="btn-primary rounded-l-none" type="submit">Search</button>
        </form>

        <nav className="flex shrink-0 items-center gap-1 text-sm">
          <Link href="/dealers" className="hidden rounded-lg px-3 py-2 font-medium hover:bg-stone-100 lg:block">Dealers</Link>
          {loading ? null : me ? (
            <>
              <Link href="/favorites" className="hidden rounded-lg px-3 py-2 font-medium hover:bg-stone-100 sm:block">Saved</Link>
              <Link href="/inbox" className="relative rounded-lg px-3 py-2 font-medium hover:bg-stone-100">
                Inbox
                {me.unreadMessages > 0 && <span className="absolute -right-0.5 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{me.unreadMessages}</span>}
              </Link>
              <Link href="/notifications" aria-label="Notifications" className="relative rounded-lg px-2.5 py-2 hover:bg-stone-100">
                🔔
                {me.unreadNotifications > 0 && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{me.unreadNotifications}</span>}
              </Link>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenu(!menu)} className="grid h-9 w-9 place-items-center rounded-full bg-stone-900 text-sm font-bold text-white" aria-label="Account menu">{me.name[0]?.toUpperCase()}</button>
                {menu && (
                  <div className="card absolute right-0 mt-2 w-52 overflow-hidden py-1 text-sm" onClick={() => setMenu(false)}>
                    <p className="truncate border-b border-stone-100 px-4 py-2 font-semibold">{me.name}</p>
                    {canSell && <Link className="block px-4 py-2 hover:bg-stone-50" href="/dashboard">Seller dashboard</Link>}
                    {canSell && <Link className="block px-4 py-2 hover:bg-stone-50" href="/dashboard/new">Post a truck</Link>}
                    {me.role === "DEALER" && <Link className="block px-4 py-2 hover:bg-stone-50" href="/dashboard/profile">Dealership profile</Link>}
                    {me.role === "ADMIN" && <Link className="block px-4 py-2 hover:bg-stone-50" href="/admin">Admin</Link>}
                    <Link className="block px-4 py-2 hover:bg-stone-50 sm:hidden" href="/favorites">Saved trucks</Link>
                    <Link className="block px-4 py-2 hover:bg-stone-50" href="/account">Account settings</Link>
                    <button className="block w-full px-4 py-2 text-left hover:bg-stone-50" onClick={async () => { await logout(); router.push("/"); }}>Log out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 font-medium hover:bg-stone-100">Log in</Link>
              <Link href="/register" className="btn-primary hidden sm:inline-flex">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
