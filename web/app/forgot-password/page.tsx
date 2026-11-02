"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { ErrorNote } from "@/components/ui";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api("/auth/forgot", { body: { email } }); setSent(true); } catch (e: any) { setErr(e.message); }
  };
  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">Reset password</h1>
      {sent ? <p className="text-sm text-stone-600">If an account exists for <b>{email}</b>, we've sent a reset link. It expires in 1 hour.</p> : (
        <>
          <label className="block"><span className="label">Email</span><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <ErrorNote error={err} />
          <button className="btn-primary w-full">Send reset link</button>
        </>
      )}
    </form>
  );
}
