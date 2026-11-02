import Link from "next/link";
import { serverGet } from "@/lib/api";
import { VerifiedBadge } from "@/components/ui";
import type { Dealership } from "@/lib/types";

export const metadata = { title: "Truck dealerships" };

export default async function DealersPage() {
  const dealers = (await serverGet<Dealership[]>("/dealerships")) ?? [];
  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">Truck dealerships</h1>
      <p className="mb-6 text-sm text-stone-500">Verified dealers have had their business identity and operations checked by our team.</p>
      {dealers.length === 0 ? <p className="card p-8 text-center text-stone-500">No dealerships yet.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dealers.map((d) => (
            <Link key={d.id} href={`/dealers/${d.slug}`} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100 text-2xl font-bold text-stone-400">
                {d.logoUrl ? <img src={d.logoUrl} alt="" className="h-full w-full object-cover" /> : d.name[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold">{d.name}</p>
                <p className="text-xs text-stone-500">{[d.city, d.province].filter(Boolean).join(", ") || "Philippines"}</p>
                <p className="text-xs text-stone-500">{d.inventoryCount} truck{d.inventoryCount === 1 ? "" : "s"} for sale</p>
                {d.verified && <div className="mt-1"><VerifiedBadge small /></div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
