"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PROVINCES } from "@/lib/format";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { ErrorNote, Spinner, VerifiedBadge } from "@/components/ui";
import type { Dealership } from "@/lib/types";

const blank = { name: "", description: "", address: "", city: "", province: "", latitude: "", longitude: "", phone: "", messengerUrl: "", facebookUrl: "", websiteUrl: "", yearsInBusiness: "" };

export default function DealerProfile() {
  const ready = useRequireAuth(["DEALER"]);
  const { me, refresh } = useAuth();
  const [f, setF] = useState(blank);
  const [d, setD] = useState<Dealership | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [up, setUp] = useState(false);

  useEffect(() => {
    if (!me?.dealership) return;
    const x = me.dealership; setD(x);
    setF({ name: x.name, description: x.description ?? "", address: x.address ?? "", city: x.city ?? "", province: x.province ?? "", latitude: x.latitude?.toString() ?? "", longitude: x.longitude?.toString() ?? "", phone: x.phone ?? "", messengerUrl: x.messengerUrl ?? "", facebookUrl: x.facebookUrl ?? "", websiteUrl: x.websiteUrl ?? "", yearsInBusiness: x.yearsInBusiness?.toString() ?? "" });
  }, [me?.dealership?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready || !d) return <Spinner />;

  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setMsg(null);
    try {
      setD(await api<Dealership>("/dealerships/me", { method: "PATCH", body: { ...f, latitude: num(f.latitude), longitude: num(f.longitude), yearsInBusiness: num(f.yearsInBusiness) } }));
      await refresh(); setMsg("Profile saved.");
    } catch (e: any) { setErr(e.message); }
  };
  const upload = async (kind: "logo" | "cover", file?: File) => {
    if (!file) return; setUp(true); setErr(null);
    try { const form = new FormData(); form.append(kind, file); setD(await api<Dealership>("/dealerships/me/images", { form })); await refresh(); } catch (e: any) { setErr(e.message); }
    setUp(false);
  };

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Dealership profile</h1>
          <div className="mt-1 text-sm text-stone-500">{d.verified ? <VerifiedBadge /> : "Not verified yet — our team reviews dealerships personally. Complete your profile and contact us to get the Verified Dealer badge."}</div></div>
        <Link href={`/dealers/${d.slug}`} className="btn-outline">View public page</Link>
      </div>

      <section className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-r from-stone-800 to-stone-600">
          {d.coverUrl && <img src={d.coverUrl} alt="" className="h-full w-full object-cover" />}
          <label className="btn-outline absolute right-3 top-3 cursor-pointer text-xs">{up ? "Uploading…" : "Change cover"}<input type="file" accept="image/*" className="sr-only" onChange={(e) => upload("cover", e.target.files?.[0])} /></label>
        </div>
        <div className="flex items-center gap-4 p-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl bg-stone-100 text-2xl font-bold text-stone-400">{d.logoUrl ? <img src={d.logoUrl} alt="" className="h-full w-full object-cover" /> : d.name[0]}</div>
          <label className="btn-outline cursor-pointer text-xs">Upload logo<input type="file" accept="image/*" className="sr-only" onChange={(e) => upload("logo", e.target.files?.[0])} /></label>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <label className="block"><span className="label">Dealership name</span><input className="input" required minLength={2} value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="block"><span className="label">About your business</span><textarea className="input" rows={4} maxLength={3000} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Years in business</span><input className="input" inputMode="numeric" value={f.yearsInBusiness} onChange={(e) => set("yearsInBusiness", e.target.value.replace(/[^0-9]/g, ""))} /></label>
          <label className="block"><span className="label">Phone</span><input className="input" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></label>
          <label className="block sm:col-span-2"><span className="label">Street address</span><input className="input" value={f.address} onChange={(e) => set("address", e.target.value)} /></label>
          <label className="block"><span className="label">City</span><input className="input" value={f.city} onChange={(e) => set("city", e.target.value)} /></label>
          <label className="block"><span className="label">Province</span><input className="input" list="prov" value={f.province} onChange={(e) => set("province", e.target.value)} /><datalist id="prov">{PROVINCES.map((p) => <option key={p} value={p} />)}</datalist></label>
          <label className="block"><span className="label">Map latitude (optional)</span><input className="input" inputMode="decimal" value={f.latitude} onChange={(e) => set("latitude", e.target.value)} /></label>
          <label className="block"><span className="label">Map longitude (optional)</span><input className="input" inputMode="decimal" value={f.longitude} onChange={(e) => set("longitude", e.target.value)} /></label>
          <label className="block"><span className="label">Messenger link</span><input className="input" placeholder="https://m.me/yourpage" value={f.messengerUrl} onChange={(e) => set("messengerUrl", e.target.value)} /></label>
          <label className="block"><span className="label">Facebook page</span><input className="input" placeholder="https://facebook.com/…" value={f.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} /></label>
          <label className="block sm:col-span-2"><span className="label">Website</span><input className="input" placeholder="https://…" value={f.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} /></label>
        </div>
        <ErrorNote error={err} />{msg && <p className="text-sm text-emerald-700">{msg}</p>}
        <button className="btn-primary">Save profile</button>
      </section>
    </form>
  );
}
