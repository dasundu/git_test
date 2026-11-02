"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PROVINCES } from "@/lib/format";
import type { Brand, Category, Listing } from "@/lib/types";
import { ErrorNote } from "./ui";

export default function ListingForm({ existing }: { existing?: Listing }) {
  const router = useRouter();
  const { me, refresh } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [images, setImages] = useState<string[]>(existing?.images.map((i) => i.url) ?? []);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    title: existing?.title ?? "", description: existing?.description ?? "", categoryId: existing?.category.id ?? "", brandId: existing?.brand?.id ?? "",
    price: existing ? String(existing.price) : "", negotiable: existing?.negotiable ?? true, year: existing?.year ? String(existing.year) : "",
    mileageKm: existing?.mileageKm != null ? String(existing.mileageKm) : "", condition: existing?.condition ?? "USED",
    province: existing?.province ?? "", city: existing?.city ?? "",
  });
  const [specs, setSpecs] = useState<Record<string, string>>(Object.fromEntries(Object.entries(existing?.specs ?? {}).map(([k, v]) => [k, String(v)])));

  useEffect(() => {
    api<Category[]>("/categories").then(setCats);
    api<Brand[]>("/brands").then(setBrands);
  }, []);

  const category = cats.find((c) => c.id === f.categoryId);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const q = me?.quota;
  const blocked = !existing && q && q.remaining <= 0 && me?.role !== "ADMIN";

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null); setUploading(true);
    try {
      const form = new FormData();
      [...files].slice(0, 12 - images.length).forEach((file) => form.append("files", file));
      const { urls } = await api<{ urls: string[] }>("/uploads-api", { form });
      setImages((prev) => [...prev, ...urls].slice(0, 12));
    } catch (e: any) { setErr(e.message); }
    setUploading(false);
  };
  const move = (i: number, d: number) => setImages((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!images.length) return setErr("Add at least one photo");
    setBusy(true); setErr(null);
    const body = {
      title: f.title, description: f.description, categoryId: f.categoryId, brandId: f.brandId || null,
      price: Number(f.price), negotiable: f.negotiable, year: f.year ? Number(f.year) : null,
      mileageKm: f.mileageKm ? Number(f.mileageKm) : null, condition: f.condition,
      province: f.province || null, city: f.city || null, specs, images,
    };
    try {
      const l = existing ? await api<Listing>(`/listings/${existing.id}`, { method: "PATCH", body }) : await api<Listing>("/listings", { body });
      await refresh();
      router.push(`/listings/${l.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  if (blocked) return (
    <div className="card mx-auto max-w-md space-y-3 p-8 text-center">
      <p className="text-lg font-bold">You've used your {q!.limit} free listings</p>
      <p className="text-sm text-stone-500">Paid listings are coming soon. You can still edit or mark existing trucks as sold.</p>
      <Link href="/dashboard" className="btn-primary">Back to dashboard</Link>
    </div>
  );

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{existing ? "Edit listing" : "Post a truck"}</h1>
        {!existing && q && <span className="text-sm text-stone-500">{q.remaining} of {q.limit} free listings left</span>}
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">Photos <span className="text-sm font-normal text-stone-500">({images.length}/12) — first photo is the cover</span></h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((u, i) => (
            <div key={u} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-200">
              <img src={u} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-brand px-1.5 text-[10px] font-bold text-white">COVER</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-1 text-white">
                <button type="button" aria-label="Move left" onClick={() => move(i, -1)} className="px-1.5">‹</button>
                <button type="button" aria-label="Remove photo" onClick={() => setImages(images.filter((x) => x !== u))} className="px-1.5">✕</button>
                <button type="button" aria-label="Move right" onClick={() => move(i, 1)} className="px-1.5">›</button>
              </div>
            </div>
          ))}
          {images.length < 12 && (
            <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-lg border-2 border-dashed border-stone-300 text-center text-sm text-stone-500 hover:border-brand">
              {uploading ? "Uploading…" : "+ Add photos"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">Basics</h2>
        <label className="block"><span className="label">Title</span><input className="input" required minLength={5} maxLength={120} placeholder="e.g. 2015 Isuzu Giga 10-wheeler dump truck" value={f.title} onChange={(e) => set("title", e.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Category</span>
            <select className="input" required value={f.categoryId} onChange={(e) => { set("categoryId", e.target.value); setSpecs({}); }}>
              <option value="">Select category…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
          <label className="block"><span className="label">Brand</span>
            <select className="input" value={f.brandId} onChange={(e) => set("brandId", e.target.value)}>
              <option value="">Other / not listed</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></label>
          <label className="block"><span className="label">Price (₱)</span><input className="input" required inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^0-9]/g, ""))} /></label>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={f.negotiable} onChange={(e) => set("negotiable", e.target.checked)} /> Price is negotiable</label>
          <label className="block"><span className="label">Condition</span>
            <select className="input" value={f.condition} onChange={(e) => set("condition", e.target.value)}>
              <option value="USED">Used</option><option value="JAPAN_SURPLUS">Japan Surplus</option><option value="REPAIRED">Repaired</option>
            </select></label>
          <label className="block"><span className="label">Year</span><input className="input" inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => set("year", e.target.value.replace(/[^0-9]/g, ""))} /></label>
          <label className="block"><span className="label">Mileage (km)</span><input className="input" inputMode="numeric" value={f.mileageKm} onChange={(e) => set("mileageKm", e.target.value.replace(/[^0-9]/g, ""))} /></label>
          <div />
          <label className="block"><span className="label">Province</span><input className="input" list="provinces" value={f.province} onChange={(e) => set("province", e.target.value)} /><datalist id="provinces">{PROVINCES.map((p) => <option key={p} value={p} />)}</datalist></label>
          <label className="block"><span className="label">City / municipality</span><input className="input" value={f.city} onChange={(e) => set("city", e.target.value)} /></label>
        </div>
      </section>

      {category?.specSchema && category.specSchema.length > 0 && (
        <section className="card space-y-4 p-5">
          <h2 className="font-bold">{category.name} specifications</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {category.specSchema.map((s) => (
              <label key={s.key} className="block">
                <span className="label">{s.label}{s.unit ? ` (${s.unit})` : ""}</span>
                {s.type === "select" ? (
                  <select className="input" value={specs[s.key] ?? ""} onChange={(e) => setSpecs({ ...specs, [s.key]: e.target.value })}><option value="">—</option>{s.options!.map((o) => <option key={o}>{o}</option>)}</select>
                ) : (
                  <input className="input" inputMode={s.type === "number" ? "decimal" : undefined} value={specs[s.key] ?? ""} onChange={(e) => setSpecs({ ...specs, [s.key]: e.target.value })} />
                )}
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="card space-y-2 p-5">
        <h2 className="font-bold">Description</h2>
        <textarea className="input" aria-label="Description" rows={6} required minLength={10} maxLength={5000} placeholder="Condition, service history, included accessories, documents available (OR/CR, import papers)…" value={f.description} onChange={(e) => set("description", e.target.value)} />
      </section>

      <ErrorNote error={err} />
      <div className="flex gap-3">
        <button className="btn-primary px-6" disabled={busy || uploading}>{busy ? "Saving…" : existing ? "Save changes" : "Publish listing"}</button>
        <Link href="/dashboard" className="btn-outline">Cancel</Link>
      </div>
    </form>
  );
}
