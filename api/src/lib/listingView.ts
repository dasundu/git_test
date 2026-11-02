import { Prisma } from "@prisma/client";

export const listingInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  category: { select: { id: true, slug: true, name: true } },
  brand: { select: { id: true, slug: true, name: true } },
  dealership: {
    select: {
      id: true, name: true, slug: true, logoUrl: true, verified: true, city: true, province: true,
      phone: true, messengerUrl: true, facebookUrl: true,
    },
  },
  seller: { select: { id: true, name: true, role: true, messengerUrl: true, createdAt: true } },
} satisfies Prisma.ListingInclude;

export type ListingFull = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

export const isFeatured = (l: { featured: boolean; featuredUntil: Date | null }) =>
  l.featured && (!l.featuredUntil || l.featuredUntil > new Date());

export function toListingDto(l: ListingFull, extra: Record<string, unknown> = {}) {
  const { seller, ...rest } = l;
  return { ...rest, featured: isFeatured(l), seller, ...extra };
}

export const featuredWhere = (): Prisma.ListingWhereInput => ({
  featured: true,
  OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
});
