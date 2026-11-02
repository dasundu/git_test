"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";
import { ErrorNote } from "./ui";
import { safeNext } from "./LoginForm";

const TYPES = [
  { v: "BUYER", t: "I'm buying", d: "Browse, save trucks, chat and make offers" },
  { v: "SELLER", t: "Individual seller", d: "List your own trucks — first 4 free" },
  { v: "DEALER", t: "Dealership", d: "Your own profile page + first 4 listings free" },
] as const;

export default function RegisterForm() {
  const { setMe } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [f, setF] = useState({ accountType: "BUYER" as (typeof TYPES)[number]["v"], name: "", email: "", phone: "", password: "", dealershipName: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const me = await api<Me>("/auth/register", { body: { ...f, phone: f.phone || undefined, dealershipName: f.accountType === "DEALER" ? f.dealershipName : undefined } });
      setMe(me);
      router.push(f.accountType === "DEALER" ? "/dashboard/profile" : f.accountType === "SELLER" ? "/dashboard" : next);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">Create your account</h1>
      <div className="grid gap-2">
        {TYPES.map((t) => (
          <label key={t.v} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${f.accountType === t.v ? "border-brand bg-amber-50" : "border-stone-200"}`}>
            <input type="radio" name="type" className="mt-1" checked={f.accountType === t.v} onChange={() => set("accountType", t.v)} />
            <span><b className="text-sm">{t.t}</b><br /><span className="text-xs text-stone-500">{t.d}</span></span>
          </label>
        ))}
      </div>
      {f.accountType === "DEALER" && <label className="block"><span className="label">Dealership name</span><input className="input" required minLength={2} value={f.dealershipName} onChange={(e) => set("dealershipName", e.target.value)} /></label>}
      <label className="block"><span className="label">Your name</span><input className="input" required minLength={2} autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
      <label className="block"><span className="label">Email</span><input className="input" type="email" required autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></label>
      <label className="block"><span className="label">Mobile number {f.accountType === "BUYER" ? "(optional)" : ""}</span><input className="input" type="tel" autoComplete="tel" placeholder="09xx xxx xxxx" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></label>
      <label className="block"><span className="label">Password</span><input className="input" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} /><p className="mt-1 text-xs text-stone-500">At least 8 characters.</p></label>
      <ErrorNote error={err} />
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      <p className="text-center text-sm text-stone-500">Already have an account? <Link href="/login" className="font-semibold text-brand-dark hover:underline">Log in</Link></p>
      <p className="text-center text-xs text-stone-400">By signing up you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
    </form>
  );
}
