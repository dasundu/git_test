import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverGet } from "@/lib/api";
import { peso } from "@/lib/format";
import ListingDetail from "@/components/ListingDetail";
import type { Listing } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const l = await serverGet<Listing>(`/listings/${id}`);
  if (!l) return { title: "Listing not found" };
  const desc = `${peso(l.price)} · ${[l.year, l.brand?.name, l.category.name, l.city, l.province].filter(Boolean).join(" · ")}`;
  return { title: l.title, description: desc, openGraph: { title: l.title, description: desc, images: l.images[0] ? [l.images[0].url] : [] } };
}

export default async function ListingPage({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  const listing = await serverGet<Listing>(`/listings/${id}`);
  if (!listing) notFound();
  return <ListingDetail initial={listing} />;
}
