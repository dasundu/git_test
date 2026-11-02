"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const b64ToU8 = (b: string) => {
  const pad = "=".repeat((4 - (b.length % 4)) % 4);
  const raw = atob((b + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export default function PushToggle() {
  const [state, setState] = useState<"checking" | "unsupported" | "disabled" | "off" | "on" | "denied">("checking");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      const key = await api<{ enabled: boolean }>("/push/key").catch(() => ({ enabled: false }));
      if (!key.enabled) return setState("disabled");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })();
  }, []);

  const enable = async () => {
    setErr(null);
    try {
      const { publicKey } = await api<{ publicKey: string }>("/push/key");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(publicKey) });
      await api("/push/subscribe", { body: sub.toJSON() });
      setState("on");
    } catch (e: any) { setErr(e.message || "Couldn't enable push notifications"); }
  };
  const disable = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await api("/push/unsubscribe", { body: { endpoint: sub.endpoint } }); await sub.unsubscribe(); }
    setState("off");
  };

  const note: Record<string, string> = {
    checking: "Checking…", unsupported: "This browser doesn't support push notifications. On iPhone, add the site to your Home Screen first.",
    disabled: "Push notifications aren't enabled on this server yet.", denied: "Notifications are blocked in your browser settings.",
  };
  return (
    <div className="flex items-center justify-between gap-4">
      <div><p className="text-sm font-semibold">Browser push notifications</p><p className="text-xs text-stone-500">{note[state] ?? "Get alerted about new messages and offers even when you're not on the site."}</p>{err && <p className="text-xs text-red-600">{err}</p>}</div>
      {state === "off" && <button className="btn-primary" onClick={enable}>Enable</button>}
      {state === "on" && <button className="btn-outline" onClick={disable}>Turn off</button>}
    </div>
  );
}
