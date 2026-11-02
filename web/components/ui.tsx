import Link from "next/link";
import { conditionLabel, peso, timeAgo } from "@/lib/format";
import type { Listing, ListingStatus } from "@/lib/types";

export function VerifiedBadge({ small }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 font-semibold text-emerald-800 ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`} title="Our team has checked this dealership's business identity and operations">
      <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
      Verified Dealer
    </span>
  );
}

const STATUS_STYLE: Record<ListingStatus, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  RESERVED: "bg-amber-100 text-amber-800",
  SOLD: "bg-stone-200 text-stone-600",
};
export function StatusBadge({ status }: { status: ListingStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>{status[0] + status.slice(1).toLowerCase()}</span>;
}

export function FeaturedTag() {
  return <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Featured</span>;
}

export function Spinner() {
  return <div className="mx-auto my-10 h-7 w-7 animate-spin rounded-full border-2 border-stone-300 border-t-brand" />;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card mx-auto my-8 max-w-md p-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-stone-500">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-sm">
      <button className="btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="text-stone-600">Page {page} of {pages}</span>
      <button className="btn-outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

export function ListingCard({ l }: { l: Listing }) {
  const img = l.images[0]?.url;
  return (
    <Link href={`/listings/${l.id}`} className="card group block overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-stone-200">
        {img ? <img src={img} alt={l.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-stone-400">No photo</div>}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {l.featured && <FeaturedTag />}
          {l.status !== "AVAILABLE" && <StatusBadge status={l.status} />}
        </div>
        {l.condition === "JAPAN_SURPLUS" && <span className="absolute bottom-2 left-2 rounded bg-stone-900/80 px-2 py-0.5 text-[11px] font-medium text-white">Japan Surplus</span>}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{l.title}</p>
        <p className="text-lg font-bold text-brand-dark">{peso(l.price)}{l.negotiable && <span className="ml-1 text-[11px] font-medium text-stone-500">negotiable</span>}</p>
        <p className="text-xs text-stone-500">
          {[l.year, l.category.name, [l.city, l.province].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
        </p>
        <div className="flex items-center justify-between pt-1 text-xs text-stone-500">
          <span className="truncate">{l.dealership ? <>{l.dealership.name} {l.dealership.verified && <span className="text-emerald-700">✓</span>}</> : "Private seller"}</span>
          <span>{timeAgo(l.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export const ConditionText = ({ c }: { c: string }) => <>{conditionLabel(c)}</>;
