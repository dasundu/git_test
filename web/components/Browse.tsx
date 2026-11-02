"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { PROVINCES } from "@/lib/format";
import type { Brand, Category, Listing, Paged } from "@/lib/types";
import { Empty, ListingCard, Pager, Spinner } from "./ui";

export default function Browse() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [data, setData] = useState<Paged<Listing> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");

  useEffect(() => {
    api<Category[]>("/categories").then(setCats).catch(() => {});
    api<Brand[]>("/brands").then(setBrands).catch(() => {});
  }, []);
  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  const qs = sp.toString();
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<Paged<Listing>>(`/listings?${qs}`).then((d) => { if (!cancelled) { setData(d); setLoading(false); } }).catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [qs]);

  const set = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!("page" in patch)) next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }, [sp, router, pathname]);

  const category = cats.find((c) => c.slug === sp.get("category"));
  const specFilters = useMemo(() => (category?.specSchema ?? []).filter((f) => f.filterable && f.type === "select"), [category]);
  const activeCount = [...sp.keys()].filter((k) => !["page", "sort", "q"].includes(k)).length;
  const page = Number(sp.get("page") ?? 1);

  const filters = (
    <div className="space-y-4">
      <Field label="Category">
        <select className="input" value={sp.get("category") ?? ""} onChange={(e) => {
          const patch: Record<string, string | null> = { category: e.target.value || null };
          for (const k of sp.keys()) if (k.startsWith("spec_")) patch[k] = null;
          set(patch);
        }}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Brand">
        <select className="input" value={sp.get("brand") ?? ""} onChange={(e) => set({ brand: e.target.value || null })}>
          <option value="">All brands</option>
          {brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
        </select>
      </Field>
      <Field label="Price (₱)">
        <div className="flex gap-2">
          <DebouncedInput placeholder="Min" label="Minimum price" value={sp.get("minPrice") ?? ""} onCommit={(v) => set({ minPrice: v || null })} />
          <DebouncedInput placeholder="Max" label="Maximum price" value={sp.get("maxPrice") ?? ""} onCommit={(v) => set({ maxPrice: v || null })} />
        </div>
      </Field>
      <Field label="Year">
        <div className="flex gap-2">
          <DebouncedInput placeholder="From" label="Year from" value={sp.get("minYear") ?? ""} onCommit={(v) => set({ minYear: v || null })} />
          <DebouncedInput placeholder="To" label="Year to" value={sp.get("maxYear") ?? ""} onCommit={(v) => set({ maxYear: v || null })} />
        </div>
      </Field>
      <Field label="Condition">
        <select className="input" value={sp.get("condition") ?? ""} onChange={(e) => set({ condition: e.target.value || null })}>
          <option value="">Any</option><option value="USED">Used</option><option value="JAPAN_SURPLUS">Japan Surplus</option><option value="REPAIRED">Repaired</option>
        </select>
      </Field>
      <Field label="Province">
        <select className="input" value={sp.get("province") ?? ""} onChange={(e) => set({ province: e.target.value || null })}>
          <option value="">Anywhere</option>
          {PROVINCES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </Field>
      {specFilters.map((f) => (
        <Field key={f.key} label={f.label}>
          <select className="input" value={sp.get(`spec_${f.key}`) ?? ""} onChange={(e) => set({ [`spec_${f.key}`]: e.target.value || null })}>
            <option value="">Any</option>
            {f.options!.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={sp.get("status") === "all"} onChange={(e) => set({ status: e.target.checked ? "all" : null })} /> Include sold trucks
      </label>
      {activeCount > 0 && <button className="btn-outline w-full" onClick={() => router.push(`${pathname}${sp.get("q") ? `?q=${encodeURIComponent(sp.get("q")!)}` : ""}`)}>Clear filters</button>}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-extrabold">{category ? category.name : "All trucks & equipment"}</h1>
        <form className="flex" onSubmit={(e) => { e.preventDefault(); set({ q: q.trim() || null }); }}>
          <input className="input rounded-r-none" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary rounded-l-none">Go</button>
        </form>
        <select className="input w-44" value={sp.get("sort") ?? "newest"} onChange={(e) => set({ sort: e.target.value === "newest" ? null : e.target.value })} aria-label="Sort">
          <option value="newest">Newest first</option><option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option><option value="year_desc">Year: newest</option>
        </select>
        <button className="btn-outline lg:hidden" onClick={() => setShowFilters(!showFilters)}>Filters{activeCount ? ` (${activeCount})` : ""}</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className={`${showFilters ? "block" : "hidden"} card h-fit p-4 lg:block`}>{filters}</aside>
        <section>
          {sp.get("q") && <p className="mb-3 text-sm text-stone-500">Results for “{sp.get("q")}”</p>}
          {loading && !data ? <Spinner /> : data && data.items.length ? (
            <>
              <p className="mb-3 text-sm text-stone-500">{data.total} result{data.total === 1 ? "" : "s"}</p>
              <div className={`grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
                {data.items.map((l) => <ListingCard key={l.id} l={l} />)}
              </div>
              <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={(p) => { set({ page: String(p) }); window.scrollTo({ top: 0 }); }} />
            </>
          ) : <Empty title="No trucks match your search">Try removing a filter or searching a different term.</Empty>}
        </section>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block"><span className="label">{label}</span>{children}</label>;

function DebouncedInput({ value, onCommit, placeholder, label }: { value: string; onCommit: (v: string) => void; placeholder: string; label: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (v === value) return;
    const t = setTimeout(() => onCommit(v.replace(/[^0-9]/g, "")), 600);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return <input className="input" inputMode="numeric" aria-label={label} placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />;
}
