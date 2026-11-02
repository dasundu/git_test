import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { config } from "../config";
import { wrap, HttpError } from "../lib/http";
import { requireAuth, requireSeller } from "../middleware/auth";
import { cleanSpecs, SpecField } from "../lib/specs";
import { freeListingQuota } from "../lib/settings";
import { listingInclude, toListingDto } from "../lib/listingView";
import { getOrCreateConversation, postMessage } from "../lib/chat";
import { notify } from "../lib/notify";

export const listingsRouter = Router();

const num = (max = 1e10) => z.coerce.number().int().min(0).max(max);

const imageUrl = z
  .string()
  .refine((u) => u.startsWith(`${config.apiUrl}/uploads/`), "Images must be uploaded through the platform");

const listingBody = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(10).max(5000),
  categoryId: z.string(),
  brandId: z.string().nullable().optional(),
  price: num(),
  negotiable: z.boolean().default(true),
  year: z.coerce.number().int().min(1960).max(new Date().getFullYear() + 1).nullable().optional(),
  mileageKm: num(5_000_000).nullable().optional(),
  condition: z.enum(["USED", "JAPAN_SURPLUS", "REPAIRED"]).default("USED"),
  province: z.string().trim().max(60).nullable().optional(),
  city: z.string().trim().max(60).nullable().optional(),
  specs: z.record(z.string(), z.unknown()).optional(),
  images: z.array(imageUrl).min(1, "Add at least one photo").max(12),
});

async function loadOwned(req: any, id: string) {
  const l = await prisma.listing.findUnique({ where: { id } });
  if (!l || l.moderation === "REMOVED") throw new HttpError(404, "Listing not found");
  if (l.sellerId !== req.user.id && req.user.role !== "ADMIN") throw new HttpError(403, "Not your listing");
  return l;
}

// ---------- search ----------
listingsRouter.get(
  "/",
  wrap(async (req, res) => {
    const q = z
      .object({
        q: z.string().trim().optional(),
        category: z.string().optional(), // slug
        brand: z.string().optional(), // slug
        dealer: z.string().optional(), // dealership slug
        minPrice: z.coerce.number().optional(),
        maxPrice: z.coerce.number().optional(),
        minYear: z.coerce.number().optional(),
        maxYear: z.coerce.number().optional(),
        province: z.string().optional(),
        city: z.string().optional(),
        condition: z.enum(["USED", "JAPAN_SURPLUS", "REPAIRED"]).optional(),
        status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "all"]).optional(),
        sort: z.enum(["newest", "price_asc", "price_desc", "year_desc"]).default("newest"),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(48).default(18),
      })
      .parse(req.query);

    const and: Prisma.ListingWhereInput[] = [{ moderation: "ACTIVE" }];
    if (q.q) {
      and.push({
        OR: [
          { title: { contains: q.q, mode: "insensitive" } },
          { description: { contains: q.q, mode: "insensitive" } },
          { brand: { name: { contains: q.q, mode: "insensitive" } } },
          { category: { name: { contains: q.q, mode: "insensitive" } } },
        ],
      });
    }
    if (q.category) and.push({ category: { slug: q.category } });
    if (q.brand) and.push({ brand: { slug: q.brand } });
    if (q.dealer) and.push({ dealership: { slug: q.dealer } });
    if (q.province) and.push({ province: { equals: q.province, mode: "insensitive" } });
    if (q.city) and.push({ city: { equals: q.city, mode: "insensitive" } });
    if (q.condition) and.push({ condition: q.condition });
    if (q.minPrice !== undefined || q.maxPrice !== undefined) and.push({ price: { gte: q.minPrice, lte: q.maxPrice } });
    if (q.minYear !== undefined || q.maxYear !== undefined) and.push({ year: { gte: q.minYear, lte: q.maxYear } });
    if (!q.status) and.push({ status: { in: ["AVAILABLE", "RESERVED"] } });
    else if (q.status !== "all") and.push({ status: q.status });
    // spec_<key>=value filters (select-type fields marked filterable in the category schema)
    for (const [k, v] of Object.entries(req.query)) {
      if (k.startsWith("spec_") && typeof v === "string" && /^[a-zA-Z0-9]+$/.test(k.slice(5))) {
        and.push({ specs: { path: [k.slice(5)], equals: v } });
      }
    }

    const orderBy: Prisma.ListingOrderByWithRelationInput[] =
      q.sort === "price_asc" ? [{ price: "asc" }] :
      q.sort === "price_desc" ? [{ price: "desc" }] :
      q.sort === "year_desc" ? [{ year: { sort: "desc", nulls: "last" } }] :
      [{ createdAt: "desc" }];

    const where = { AND: and };
    const [total, items] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({ where, orderBy, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: listingInclude }),
    ]);
    res.json({ total, page: q.page, pageSize: q.pageSize, items: items.map((l) => toListingDto(l)) });
  })
);

// ---------- seller's own listings ----------
listingsRouter.get(
  "/mine",
  requireAuth,
  wrap(async (req, res) => {
    const items = await prisma.listing.findMany({
      where: { sellerId: req.user!.id, moderation: { not: "REMOVED" } },
      orderBy: { createdAt: "desc" },
      include: { ...listingInclude, _count: { select: { conversations: true, offers: true, favorites: true } } },
    });
    res.json(
      items.map((l) => toListingDto(l, { inquiries: l._count.conversations, offerCount: l._count.offers, saves: l._count.favorites }))
    );
  })
);

// ---------- detail ----------
listingsRouter.get(
  "/:id",
  wrap(async (req, res) => {
    const l = await prisma.listing.findUnique({ where: { id: req.params.id }, include: listingInclude });
    const isOwner = l && req.user && (l.sellerId === req.user.id || req.user.role === "ADMIN");
    if (!l || (l.moderation !== "ACTIVE" && !isOwner)) throw new HttpError(404, "Listing not found");
    const favorited = req.user
      ? !!(await prisma.favorite.findUnique({ where: { userId_listingId: { userId: req.user.id, listingId: l.id } } }))
      : false;
    res.json(toListingDto(l, { favorited }));
  })
);

// Called once per page visit by the browser (not by server-side rendering or the owner).
listingsRouter.post(
  "/:id/view",
  wrap(async (req, res) => {
    await prisma.listing.updateMany({
      where: { id: req.params.id, moderation: "ACTIVE", ...(req.user ? { sellerId: { not: req.user.id } } : {}) },
      data: { views: { increment: 1 } },
    });
    res.json({ ok: true });
  })
);

// ---------- create / update / delete ----------
listingsRouter.post(
  "/",
  requireSeller,
  wrap(async (req, res) => {
    const d = listingBody.parse(req.body);
    const quota = await freeListingQuota(req.user!.id);
    // Pricing beyond the free allowance is undecided, so for now sellers are simply capped.
    if (req.user!.role !== "ADMIN" && quota.remaining <= 0)
      throw new HttpError(402, `You have used all ${quota.limit} free listings. Paid listings are coming soon.`);
    const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
    if (!category) throw new HttpError(400, "Unknown category");
    if (d.brandId && !(await prisma.brand.findUnique({ where: { id: d.brandId } }))) throw new HttpError(400, "Unknown brand");
    const dealership = await prisma.dealership.findUnique({ where: { userId: req.user!.id } });

    const listing = await prisma.listing.create({
      data: {
        sellerId: req.user!.id,
        dealershipId: dealership?.id,
        categoryId: d.categoryId,
        brandId: d.brandId ?? null,
        title: d.title,
        description: d.description,
        price: d.price,
        negotiable: d.negotiable,
        year: d.year ?? null,
        mileageKm: d.mileageKm ?? null,
        condition: d.condition,
        province: d.province ?? null,
        city: d.city ?? null,
        specs: cleanSpecs(category.specSchema as unknown as SpecField[], d.specs),
        images: { create: d.images.map((url, i) => ({ url, sortOrder: i })) },
      },
      include: listingInclude,
    });
    res.status(201).json(toListingDto(listing));
  })
);

listingsRouter.patch(
  "/:id",
  requireAuth,
  wrap(async (req, res) => {
    const existing = await loadOwned(req, req.params.id);
    const d = listingBody.partial().parse(req.body);
    const categoryId = d.categoryId ?? existing.categoryId;
    const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
    const data: Prisma.ListingUncheckedUpdateInput = {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.categoryId !== undefined && { categoryId: d.categoryId }),
      ...(d.brandId !== undefined && { brandId: d.brandId }),
      ...(d.price !== undefined && { price: d.price }),
      ...(d.negotiable !== undefined && { negotiable: d.negotiable }),
      ...(d.year !== undefined && { year: d.year }),
      ...(d.mileageKm !== undefined && { mileageKm: d.mileageKm }),
      ...(d.condition !== undefined && { condition: d.condition }),
      ...(d.province !== undefined && { province: d.province }),
      ...(d.city !== undefined && { city: d.city }),
      ...(d.specs !== undefined && { specs: cleanSpecs(category.specSchema as unknown as SpecField[], d.specs) }),
    };
    const listing = await prisma.$transaction(async (tx) => {
      if (d.images) {
        await tx.listingImage.deleteMany({ where: { listingId: existing.id } });
        await tx.listingImage.createMany({ data: d.images.map((url, i) => ({ listingId: existing.id, url, sortOrder: i })) });
      }
      return tx.listing.update({ where: { id: existing.id }, data, include: listingInclude });
    });
    res.json(toListingDto(listing));
  })
);

listingsRouter.delete(
  "/:id",
  requireAuth,
  wrap(async (req, res) => {
    const l = await loadOwned(req, req.params.id);
    // Soft delete so the free-listing quota can't be gamed by deleting and re-posting.
    await prisma.listing.update({ where: { id: l.id }, data: { moderation: "REMOVED" } });
    res.json({ ok: true });
  })
);

// ---------- availability ----------
async function notifyAvailabilityWatchers(listingId: string, title: string, status: string) {
  const asked = await prisma.conversation.findMany({ where: { listingId, availabilityAskedAt: { not: null } } });
  for (const c of asked) {
    await prisma.conversation.update({ where: { id: c.id }, data: { availabilityAskedAt: null } });
    await postMessage({
      conversation: c,
      senderId: c.sellerId,
      type: "SYSTEM",
      body: `Seller update: this truck is now ${status.toLowerCase()}.`,
      notifyRecipient: { type: "availability", title: `Availability update: ${title}`, body: `Status is now ${status}.` },
    });
  }
}

listingsRouter.patch(
  "/:id/status",
  requireAuth,
  wrap(async (req, res) => {
    const l = await loadOwned(req, req.params.id);
    const { status } = z.object({ status: z.enum(["AVAILABLE", "RESERVED", "SOLD"]) }).parse(req.body);
    const updated = await prisma.listing.update({
      where: { id: l.id },
      data: { status, availabilityConfirmedAt: new Date() },
      include: listingInclude,
    });
    await notifyAvailabilityWatchers(l.id, l.title, status);
    res.json(toListingDto(updated));
  })
);

listingsRouter.post(
  "/:id/confirm-available",
  requireAuth,
  wrap(async (req, res) => {
    const l = await loadOwned(req, req.params.id);
    const updated = await prisma.listing.update({
      where: { id: l.id },
      data: { status: "AVAILABLE", availabilityConfirmedAt: new Date() },
      include: listingInclude,
    });
    await notifyAvailabilityWatchers(l.id, l.title, "AVAILABLE");
    res.json(toListingDto(updated));
  })
);

listingsRouter.post(
  "/:id/availability-request",
  requireAuth,
  wrap(async (req, res) => {
    const l = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!l || l.moderation !== "ACTIVE") throw new HttpError(404, "Listing not found");
    const c = await getOrCreateConversation(l, req.user!.id);
    await prisma.conversation.update({ where: { id: c.id }, data: { availabilityAskedAt: new Date() } });
    await postMessage({
      conversation: c,
      senderId: req.user!.id,
      type: "SYSTEM",
      body: `${req.user!.name} asked: is this still available?`,
      notifyRecipient: { type: "availability_request", title: `Is "${l.title}" still available?`, body: `${req.user!.name} wants to know if this is still available. Tap to confirm.` },
    });
    res.json({ conversationId: c.id });
  })
);

// ---------- report ----------
listingsRouter.post(
  "/:id/report",
  requireAuth,
  wrap(async (req, res) => {
    const d = z.object({ reason: z.string().trim().min(3).max(80), details: z.string().trim().max(1000).optional() }).parse(req.body);
    const l = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!l) throw new HttpError(404, "Listing not found");
    await prisma.report.create({ data: { listingId: l.id, reporterId: req.user!.id, reason: d.reason, details: d.details } });
    res.status(201).json({ ok: true });
  })
);
