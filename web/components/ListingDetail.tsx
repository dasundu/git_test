"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { conditionLabel, km, peso, timeAgo } from "@/lib/format";
import type { Category, Listing, ListingStatus, SpecField } from "@/lib/types";
import { ErrorNote, FeaturedTag, StatusBadge, VerifiedBadge } from "./ui";

export default function ListingDetail({ initial }: { initial: Listing }) {
  const { me, loading } = useAuth();
  const router = useRouter();
  const [l, setL] = useState<Listing>(initial);
  const [schema, setSchema] = useState<SpecField[]>([]);
  const [idx, setIdx] = useState(0);
  const [modal, setModal] = useState<null | "offer" | "report">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Re-fetch with the session cookie to learn if it's favourited / owned, and count the visit once per session.
  useEffect(() => {
    api<Listing>(`/listings/${initial.id}`).then(setL).catch(() => {});
    api<Category[]>("/categories").then((cs) => setSchema(cs.find((c) => c.id === initial.category.id)?.specSchema ?? [])).catch(() => {});
    try {
      const k = `viewed:${initial.id}`;
      if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); api(`/listings/${initial.id}/view`, { method: "POST" }).catch(() => {}); }
    } catch {}
  }, [initial.id, initial.category.id, me?.id]);

  const isOwner = !!me && (me.id === l.seller.id || me.role === "ADMIN");
  const needLogin = () => { router.push(`/login?next=${encodeURIComponent(`/listings/${l.id}`)}`); };
  const guard = (fn: () => Promise<void>) => async () => {
    if (!me) return needLogin();
    setBusy(true); setErr(null); setMsg(null);
    try { await fn(); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const chat = guard(async () => { const c = await api<{ id: string }>("/conversations", { body: { listingId: l.id } }); router.push(`/inbox/${c.id}`); });
  const ask = guard(async () => { await api(`/listings/${l.id}/availability-request`, { method: "POST" }); setMsg("We've asked the seller to confirm. You'll be notified when they reply."); });
  const fav = guard(async () => {
    if (l.favorited) await api(`/favorites/${l.id}`, { method: "DELETE" }); else await api(`/favorites/${l.id}`, { method: "POST" });
    setL({ ...l, favorited: !l.favorited });
  });
  const setStatus = (s: ListingStatus) => guard(async () => setL({ ...l, ...(await api<Listing>(`/listings/${l.id}/status`, { method: "PATCH", body: { status: s } })) }))();
  const confirm = guard(async () => setL({ ...l, ...(await api<Listing>(`/listings/${l.id}/confirm-available`, { method: "POST" })) }));

  const contactMessenger = l.dealership?.messengerUrl ?? l.seller.messengerUrl;
  const location = [l.city, l.province].filter(Boolean).join(", ");
  const sold = l.status === "SOLD";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <nav className="text-sm text-stone-500"><Link href="/browse" className="hover:underline">Browse</Link> / <Link href={`/browse?category=${l.category.slug}`} className="hover:underline">{l.category.name}</Link></nav>

        <div className="card overflow-hidden">
          <div className="relative aspect-[16/10] bg-stone-900">
            {l.images[idx] ? <img src={l.images[idx].url} alt={l.title} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-stone-400">No photos</div>}
            {l.images.length > 1 && (
              <>
                <button aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white" onClick={() => setIdx((idx - 1 + l.images.length) % l.images.length)}>‹</button>
                <button aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white" onClick={() => setIdx((idx + 1) % l.images.length)}>›</button>
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{idx + 1} / {l.images.length}</span>
              </>
            )}
          </div>
          {l.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-2">
              {l.images.map((im, i) => (
                <button key={im.id} onClick={() => setIdx(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded border-2 ${i === idx ? "border-brand" : "border-transparent"}`}>
                  <img src={im.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-lg font-bold">Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Spec k="Category" v={l.category.name} />
            {l.brand && <Spec k="Brand" v={l.brand.name} />}
            <Spec k="Condition" v={conditionLabel(l.condition)} />
            {l.year && <Spec k="Year" v={String(l.year)} />}
            {l.mileageKm != null && <Spec k="Mileage" v={km(l.mileageKm)} />}
            {location && <Spec k="Location" v={location} />}
            {schema.map((f) => l.specs[f.key] !== undefined && <Spec key={f.key} k={f.label} v={`${l.specs[f.key]}${f.unit ? ` ${f.unit}` : ""}`} />)}
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="mb-2 text-lg font-bold">Description</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">{l.description}</p>
        </div>

        <p className="text-xs text-stone-500">
          Always inspect the truck and verify ownership documents (OR/CR, import papers for Japan-surplus units) before paying. <Link href="/safety" className="underline">Buying safely</Link>
        </p>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={l.status} />{l.featured && <FeaturedTag />}
            <span className="ml-auto text-xs text-stone-500">{l.views} views</span>
          </div>
          <h1 className="text-xl font-extrabold leading-snug">{l.title}</h1>
          <p className="text-3xl font-extrabold text-brand-dark">{peso(l.price)}</p>
          <p className="-mt-3 text-xs text-stone-500">{l.negotiable ? "Price negotiable" : "Fixed price"}</p>

          <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
            Availability last confirmed <b>{timeAgo(l.availabilityConfirmedAt)}</b>
          </div>

          {isOwner ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Manage this listing</p>
              <div className="grid grid-cols-3 gap-2">
                {(["AVAILABLE", "RESERVED", "SOLD"] as ListingStatus[]).map((s) => (
                  <button key={s} disabled={busy} onClick={() => setStatus(s)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${l.status === s ? "border-brand bg-amber-50 text-brand-dark" : "border-stone-300 bg-white"}`}>{s[0] + s.slice(1).toLowerCase()}</button>
                ))}
              </div>
              <button className="btn-outline w-full" disabled={busy} onClick={confirm}>Confirm still available</button>
              <Link className="btn-primary w-full" href={`/dashboard/edit/${l.id}`}>Edit listing</Link>
            </div>
          ) : (
            <div className="space-y-2">
              <button className="btn-primary w-full py-3" disabled={busy} onClick={chat}>💬 Chat with seller</button>
              <button className="btn-outline w-full py-3" disabled={busy || sold} onClick={() => (me ? setModal("offer") : needLogin())}>Make an offer</button>
              <button className="btn-outline w-full" disabled={busy} onClick={ask}>Is this still available?</button>
              {contactMessenger && <a className="btn-outline w-full" href={contactMessenger} target="_blank" rel="noopener noreferrer">Message on Messenger</a>}
              {l.dealership?.phone && <a className="btn-outline w-full" href={`tel:${l.dealership.phone}`}>📞 {l.dealership.phone}</a>}
              <div className="flex gap-2 pt-1">
                <button className="btn-outline flex-1" disabled={busy || loading} onClick={fav}>{l.favorited ? "♥ Saved" : "♡ Save"}</button>
                <button className="btn-outline flex-1" onClick={() => (me ? setModal("report") : needLogin())}>⚑ Report</button>
              </div>
            </div>
          )}
          <ErrorNote error={err} />
          {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
        </div>

        <div className="card p-5">
          <p className="label">Seller</p>
          {l.dealership ? (
            <Link href={`/dealers/${l.dealership.slug}`} className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100 font-bold text-stone-400">
                {l.dealership.logoUrl ? <img src={l.dealership.logoUrl} alt="" className="h-full w-full object-cover" /> : l.dealership.name[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold hover:underline">{l.dealership.name}</p>
                <p className="text-xs text-stone-500">{[l.dealership.city, l.dealership.province].filter(Boolean).join(", ")}</p>
                {l.dealership.verified && <div className="mt-1"><VerifiedBadge small /></div>}
              </div>
            </Link>
          ) : (
            <div><p className="font-bold">{l.seller.name}</p><p className="text-xs text-stone-500">Private seller</p></div>
          )}
        </div>
      </aside>

      {modal === "offer" && <OfferModal listing={l} onClose={() => setModal(null)} />}
      {modal === "report" && <ReportModal listingId={l.id} onClose={() => setModal(null)} onDone={() => { setModal(null); setMsg("Thanks — our team will review this listing."); }} />}
    </div>
  );
}

const Spec = ({ k, v }: { k: string; v: string }) => <div><dt className="text-xs text-stone-500">{k}</dt><dd className="font-semibold">{v}</dd></div>;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={onClose}>
      <div className="card w-full max-w-md space-y-4 rounded-b-none p-5 sm:rounded-b-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{title}</h3><button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-stone-400">×</button></div>
        {children}
      </div>
    </div>
  );
}

function OfferModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const c = await api<{ id: string }>("/conversations", { body: { listingId: listing.id } });
      await api(`/conversations/${c.id}/offers`, { body: { amount: Number(amount), note: note || undefined } });
      router.push(`/inbox/${c.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal title="Make an offer" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-stone-500">Asking price: <b>{peso(listing.price)}</b>. The seller can accept, decline or counter. Accepting an offer doesn't complete the sale — you'll arrange the rest in chat.</p>
        <label className="block"><span className="label">Your offer (₱)</span><input className="input" inputMode="numeric" required value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} autoFocus /></label>
        <label className="block"><span className="label">Note (optional)</span><textarea className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <ErrorNote error={err} />
        <button className="btn-primary w-full" disabled={busy || !Number(amount)}>Send offer</button>
      </form>
    </Modal>
  );
}

function ReportModal({ listingId, onClose, onDone }: { listingId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("Suspicious or fake listing");
  const [details, setDetails] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api(`/listings/${listingId}/report`, { body: { reason, details: details || undefined } }); onDone(); } catch (e: any) { setErr(e.message); }
  };
  return (
    <Modal title="Report this listing" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {["Suspicious or fake listing", "Wrong price or details", "Already sold", "Scam or fraud", "Inappropriate content", "Other"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <textarea className="input" rows={3} placeholder="Details (optional)" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
        <ErrorNote error={err} />
        <button className="btn-danger w-full">Submit report</button>
      </form>
    </Modal>
  );
}
