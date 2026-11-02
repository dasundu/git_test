import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverGet } from "@/lib/api";
import { ListingCard, VerifiedBadge } from "@/components/ui";
import type { Dealership, Listing, Paged } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/dealers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await serverGet<Dealership>(`/dealerships/${slug}`);
  return d ? { title: d.name, description: d.description?.slice(0, 160) ?? `Trucks for sale from ${d.name}` } : { title: "Dealership not found" };
}

export default async function DealerPage({ params }: PageProps<"/dealers/[slug]">) {
  const { slug } = await params;
  const d = await serverGet<Dealership>(`/dealerships/${slug}`);
  if (!d) notFound();
  const inv = await serverGet<Paged<Listing>>(`/listings?dealer=${slug}&pageSize=48&status=all`);
  const mapQ = d.latitude != null && d.longitude != null ? `${d.latitude},${d.longitude}` : [d.address, d.city, d.province].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-stone-800 to-stone-600 sm:h-56">{d.coverUrl && <img src={d.coverUrl} alt="" className="h-full w-full object-cover" />}</div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="-mt-14 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border-4 border-white bg-stone-100 text-3xl font-bold text-stone-400 shadow sm:-mt-16 sm:h-28 sm:w-28">
            {d.logoUrl ? <img src={d.logoUrl} alt={d.name} className="h-full w-full object-cover" /> : d.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-extrabold">{d.name}</h1>{d.verified && <VerifiedBadge />}</div>
            <p className="text-sm text-stone-500">{[d.city, d.province].filter(Boolean).join(", ")}{d.yearsInBusiness ? ` · ${d.yearsInBusiness} years in business` : ""} · {d.inventoryCount} available</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {d.phone && <a className="btn-outline" href={`tel:${d.phone}`}>📞 {d.phone}</a>}
            {d.messengerUrl && <a className="btn-outline" href={d.messengerUrl} target="_blank" rel="noopener noreferrer">Messenger</a>}
            {d.facebookUrl && <a className="btn-outline" href={d.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a>}
            {d.websiteUrl && <a className="btn-outline" href={d.websiteUrl} target="_blank" rel="noopener noreferrer">Website</a>}
          </div>
        </div>
      </div>

      {(d.description || mapQ) && (
        <div className="grid gap-4 md:grid-cols-2">
          {d.description && <div className="card p-5"><h2 className="mb-2 font-bold">About</h2><p className="whitespace-pre-line text-sm text-stone-700">{d.description}</p></div>}
          {mapQ && (
            <div className="card overflow-hidden">
              <iframe title="Dealership location" className="h-64 w-full border-0" loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(mapQ)}&output=embed`} />
              {d.address && <p className="p-3 text-sm text-stone-600">{d.address}</p>}
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xl font-extrabold">Inventory</h2>
        {inv && inv.items.length ? (
          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{inv.items.map((l) => <ListingCard key={l.id} l={l} />)}</div>
        ) : <p className="card p-8 text-center text-stone-500">No trucks listed yet.</p>}
      </section>
    </div>
  );
}
