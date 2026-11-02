"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useRequireAuth";
import PushToggle from "@/components/PushToggle";
import { ErrorNote, Spinner } from "@/components/ui";
import type { Me } from "@/lib/types";

export default function Account() {
  const ready = useRequireAuth();
  const { me, setMe } = useAuth();
  const [f, setF] = useState({ name: "", phone: "", messengerUrl: "", emailNotify: true });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  useEffect(() => { if (me) setF({ name: me.name, phone: me.phone ?? "", messengerUrl: me.messengerUrl ?? "", emailNotify: me.emailNotify }); }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready || !me) return <Spinner />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setMsg(null);
    try { setMe(await api<Me>("/auth/me", { method: "PATCH", body: { ...f, phone: f.phone || null } })); setMsg("Saved."); } catch (e: any) { setErr(e.message); }
  };
  const changePw = async (e: React.FormEvent) => {
    e.preventDefault(); setPwErr(null); setPwMsg(null);
    try { await api("/auth/password", { body: pw }); setPw({ current: "", next: "" }); setPwMsg("Password changed."); } catch (e: any) { setPwErr(e.message); }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-extrabold">Account settings</h1>
      <form onSubmit={save} className="card space-y-4 p-5">
        <label className="block"><span className="label">Email</span><input className="input bg-stone-50" disabled value={me.email} /></label>
        <label className="block"><span className="label">Name</span><input className="input" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="block"><span className="label">Mobile number</span><input className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        {me.role !== "BUYER" && me.role !== "DEALER" && <label className="block"><span className="label">Messenger link (shown on your listings)</span><input className="input" placeholder="https://m.me/yourname" value={f.messengerUrl} onChange={(e) => setF({ ...f, messengerUrl: e.target.value })} /></label>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.emailNotify} onChange={(e) => setF({ ...f, emailNotify: e.target.checked })} /> Email me about messages, offers and availability</label>
        <ErrorNote error={err} />{msg && <p className="text-sm text-emerald-700">{msg}</p>}
        <button className="btn-primary">Save changes</button>
      </form>
      <div className="card p-5"><PushToggle /></div>
      <form onSubmit={changePw} className="card space-y-4 p-5">
        <h2 className="font-bold">Change password</h2>
        <label className="block"><span className="label">Current password</span><input className="input" type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
        <label className="block"><span className="label">New password</span><input className="input" type="password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
        <ErrorNote error={pwErr} />{pwMsg && <p className="text-sm text-emerald-700">{pwMsg}</p>}
        <button className="btn-outline">Update password</button>
      </form>
    </div>
  );
}
