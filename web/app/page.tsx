import Link from "next/link";
import { serverGet } from "@/lib/api";
import { ListingCard, VerifiedBadge } from "@/components/ui";
import type { Brand, Category, Dealership, Listing } from "@/lib/types";

interface Home {
  trendingBrands: Brand[];
  popularTypes: Category[];
  featuredTrucks: Listing[];
  featuredDealerships: (Dealership & { inventoryCount: number; preview: { id: string; title: string; images: { url: string }[] }[] })[];
  latest: Listing[];
  frequentlySold: { brand: Brand; category: Category; sold: number }[];
}

export default async function HomePage() {
  const [home, cats] = await Promise.all([serverGet<Home>("/home"), serverGet<Category[]>("/categories")]);
  if (!home) return null;

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-2xl bg-stone-900 px-6 py-10 text-white sm:px-10 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">Subic · Pampanga · Nationwide soon</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">Find used &amp; Japan-surplus trucks and heavy equipment.</h1>
        <p className="mt-3 max-w-xl text-stone-300">Browse listings from verified dealerships and private sellers. Chat directly, make an offer, and check availability — all in one place.</p>
        <form action="/browse" className="mt-6 flex max-w-xl">
          <input name="q" className="input rounded-r-none border-0 py-3 text-stone-900" placeholder="Try “Isuzu dump truck” or “Komatsu excavator”" />
          <button className="btn-primary rounded-l-none px-6">Search</button>
        </form>
        <div className="mt-5 flex flex-wrap gap-2">
          {(cats ?? []).slice(0, 7).map((c) => (
            <Link key={c.id} href={`/browse?category=${c.slug}`} className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">{c.name}</Link>
          ))}
        </div>
      </section>

      {home.trendingBrands.length > 0 && (
        <Section title="Trending brands">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {home.trendingBrands.map((b) => (
              <Link key={b.id} href={`/browse?brand=${b.slug}`} className="card p-4 text-center transition hover:border-brand hover:shadow-md">
                <p className="font-bold">{b.name}</p>
                <p className="text-xs text-stone-500">{b.count} listing{b.count === 1 ? "" : "s"}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {home.popularTypes.length > 0 && (
        <Section title="Popular truck types">
          <div className="flex flex-wrap gap-2">
            {home.popularTypes.map((c) => (
              <Link key={c.id} href={`/browse?category=${c.slug}`} className="card px-4 py-2 text-sm font-medium transition hover:border-brand">{c.name} <span className="text-stone-400">· {c.count}</span></Link>
            ))}
          </div>
        </Section>
      )}

      {home.frequentlySold.length > 0 && (
        <Section title="Frequently sold models">
          <div className="flex flex-wrap gap-2">
            {home.frequentlySold.map((f, i) => (
              <Link key={i} href={`/browse?brand=${f.brand.slug}&category=${f.category.slug}&status=all`} className="card px-4 py-2 text-sm">
                <b>{f.brand.name}</b> {f.category.name} <span className="text-stone-400">· {f.sold} sold</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {home.featuredTrucks.length > 0 && (
        <Section title="Featured trucks">
          <Grid>{home.featuredTrucks.map((l) => <ListingCard key={l.id} l={l} />)}</Grid>
        </Section>
      )}

      {home.featuredDealerships.length > 0 && (
        <Section title="Featured dealerships" more={{ href: "/dealers", label: "All dealers" }}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {home.featuredDealerships.map((d) => (
              <Link key={d.id} href={`/dealers/${d.slug}`} className="card block overflow-hidden transition hover:shadow-md">
                <div className="flex items-center gap-3 p-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100 text-xl font-bold text-stone-400">
                    {d.logoUrl ? <img src={d.logoUrl} alt="" className="h-full w-full object-cover" /> : d.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{d.name}</p>
                    <p className="text-xs text-stone-500">{[d.city, d.province].filter(Boolean).join(", ") || "Philippines"} · {d.inventoryCount} truck{d.inventoryCount === 1 ? "" : "s"}</p>
                    {d.verified && <div className="mt-1"><VerifiedBadge small /></div>}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-0.5 bg-stone-100">
                  {d.preview.slice(0, 4).map((p) => <div key={p.id} className="aspect-square bg-stone-200">{p.images[0] && <img src={p.images[0].url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />}</div>)}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title="Latest listings" more={{ href: "/browse", label: "Browse all" }}>
        {home.latest.length ? <Grid>{home.latest.map((l) => <ListingCard key={l.id} l={l} />)}</Grid> : (
          <div className="card p-10 text-center text-stone-500">
            <p className="font-semibold text-stone-800">No trucks listed yet.</p>
            <p className="mt-1 text-sm">Be the first — <Link className="font-semibold text-brand-dark underline" href="/register">create a seller account</Link> and list your first 4 trucks free.</p>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, more, children }: { title: string; more?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        {more && <Link href={more.href} className="text-sm font-semibold text-brand-dark hover:underline">{more.label} →</Link>}
      </div>
      {children}
    </section>
  );
}
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
