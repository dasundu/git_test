import { Router } from "express";
import { prisma } from "../db";
import { wrap } from "../lib/http";
import { featuredWhere, listingInclude, toListingDto } from "../lib/listingView";

export const catalogRouter = Router();

const live = { moderation: "ACTIVE" as const, status: { in: ["AVAILABLE", "RESERVED"] as ("AVAILABLE" | "RESERVED")[] } };

catalogRouter.get(
  "/categories",
  wrap(async (_req, res) => {
    const cats = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { listings: { where: live } } } } });
    res.json(cats.map(({ _count, ...c }) => ({ ...c, count: _count.listings })));
  })
);

catalogRouter.get(
  "/brands",
  wrap(async (_req, res) => {
    const brands = await prisma.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { listings: { where: live } } } } });
    res.json(brands.map(({ _count, ...b }) => ({ ...b, count: _count.listings })));
  })
);

catalogRouter.get(
  "/home",
  wrap(async (_req, res) => {
    const [brands, cats, featured, dealers, latest, soldGroups] = await Promise.all([
      prisma.brand.findMany({ include: { _count: { select: { listings: { where: live } } } } }),
      prisma.category.findMany({ include: { _count: { select: { listings: { where: live } } } } }),
      prisma.listing.findMany({ where: { ...live, ...featuredWhere() }, orderBy: { createdAt: "desc" }, take: 8, include: listingInclude }),
      prisma.dealership.findMany({
        where: { featured: true, OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }] },
        take: 6,
        include: { listings: { where: live, take: 4, orderBy: { createdAt: "desc" }, include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } }, _count: { select: { listings: { where: live } } } },
      }),
      prisma.listing.findMany({ where: live, orderBy: { createdAt: "desc" }, take: 12, include: listingInclude }),
      prisma.listing.groupBy({ by: ["brandId", "categoryId"], where: { status: "SOLD", moderation: "ACTIVE", brandId: { not: null } }, _count: true, orderBy: { _count: { brandId: "desc" } }, take: 6 }),
    ]);

    // "Frequently sold" comes from real SOLD listings only — empty until the marketplace has sales data.
    const brandMap = new Map((await prisma.brand.findMany()).map((b) => [b.id, b]));
    const catMap = new Map((await prisma.category.findMany()).map((c) => [c.id, c]));
    const frequentlySold = soldGroups.map((g) => ({
      brand: brandMap.get(g.brandId!)!, category: catMap.get(g.categoryId)!, sold: g._count,
    }));

    res.json({
      trendingBrands: brands.filter((b) => b._count.listings > 0).sort((a, b) => b._count.listings - a._count.listings).slice(0, 12).map(({ _count, ...b }) => ({ ...b, count: _count.listings })),
      popularTypes: cats.filter((c) => c._count.listings > 0).sort((a, b) => b._count.listings - a._count.listings).slice(0, 10).map(({ _count, specSchema, ...c }) => ({ ...c, count: _count.listings })),
      featuredTrucks: featured.map((l) => toListingDto(l)),
      featuredDealerships: dealers.map(({ listings, _count, ...d }) => ({ ...d, inventoryCount: _count.listings, preview: listings })),
      latest: latest.map((l) => toListingDto(l)),
      frequentlySold,
    });
  })
);
