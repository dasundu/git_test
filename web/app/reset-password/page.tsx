"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { ErrorNote } from "@/components/ui";

function Form() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api("/auth/reset", { body: { token, password } }); setDone(true); } catch (e: any) { setErr(e.message); }
  };
  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">Choose a new password</h1>
      {done ? <p className="text-sm">Password updated. <Link className="font-semibold text-brand-dark underline" href="/login">Log in</Link></p> : (
        <>
          <label className="block"><span className="label">New password</span><input className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <ErrorNote error={err} />
          <button className="btn-primary w-full" disabled={!token}>Update password</button>
        </>
      )}
    </form>
  );
}
export default function Page() { return <Suspense><Form /></Suspense>; }
