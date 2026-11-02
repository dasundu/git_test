import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { wrap, HttpError } from "../lib/http";
import { requireAdmin } from "../middleware/auth";
import { getSettings, setSetting } from "../lib/settings";
import { listingInclude, toListingDto } from "../lib/listingView";
import { notify } from "../lib/notify";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const page = (req: any) => {
  const p = Math.max(1, Number(req.query.page) || 1);
  return { skip: (p - 1) * 30, take: 30, page: p };
};
const addDays = (d: number) => new Date(Date.now() + d * 86400_000);

adminRouter.get(
  "/stats",
  wrap(async (_req, res) => {
    const [users, dealers, verified, listings, available, sold, openReports, convos, offers] = await Promise.all([
      prisma.user.count(),
      prisma.dealership.count(),
      prisma.dealership.count({ where: { verified: true } }),
      prisma.listing.count({ where: { moderation: { not: "REMOVED" } } }),
      prisma.listing.count({ where: { moderation: "ACTIVE", status: "AVAILABLE" } }),
      prisma.listing.count({ where: { status: "SOLD" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.conversation.count(),
      prisma.offer.count(),
    ]);
    res.json({ users, dealers, verified, listings, available, sold, openReports, convos, offers });
  })
);

adminRouter.get(
  "/users",
  wrap(async (req, res) => {
    const { skip, take } = page(req);
    const q = String(req.query.q || "").trim();
    const where: Prisma.UserWhereInput = {
      ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
      ...(req.query.role ? { role: req.query.role as any } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, skip, take, orderBy: { createdAt: "desc" },
        select: { id: true, email: true, name: true, phone: true, role: true, suspended: true, createdAt: true, _count: { select: { listings: true } } },
      }),
    ]);
    res.json({ total, items });
  })
);

adminRouter.patch(
  "/users/:id",
  wrap(async (req, res) => {
    const d = z.object({ suspended: z.boolean().optional(), role: z.enum(["BUYER", "SELLER", "DEALER", "ADMIN"]).optional() }).parse(req.body);
    if (req.params.id === req.user!.id) throw new HttpError(400, "You can't change your own account here");
    res.json(await prisma.user.update({ where: { id: req.params.id }, data: d, select: { id: true, email: true, role: true, suspended: true } }));
  })
);

adminRouter.get(
  "/dealerships",
  wrap(async (req, res) => {
    const where: Prisma.DealershipWhereInput = req.query.pending === "1" ? { verified: false } : {};
    const items = await prisma.dealership.findMany({
      where, orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, name: true, phone: true } }, _count: { select: { listings: true } } },
    });
    res.json(items);
  })
);

// Only admins can grant or remove the Verified Dealer badge.
adminRouter.patch(
  "/dealerships/:id/verify",
  wrap(async (req, res) => {
    const { verified } = z.object({ verified: z.boolean() }).parse(req.body);
    const d = await prisma.dealership.update({ where: { id: req.params.id }, data: { verified, verifiedAt: verified ? new Date() : null } });
    await notify({
      userId: d.userId, type: "verification",
      title: verified ? "You're a Verified Dealer!" : "Verified Dealer badge removed",
      body: verified ? "Our team has verified your dealership. The badge now shows on your profile and listings." : "Your Verified Dealer badge has been removed. Contact support for details.",
      link: "/dashboard/profile",
    });
    res.json(d);
  })
);

adminRouter.patch(
  "/dealerships/:id/feature",
  wrap(async (req, res) => {
    const d = z.object({ featured: z.boolean(), days: z.number().int().min(1).max(365).optional() }).parse(req.body);
    res.json(await prisma.dealership.update({ where: { id: req.params.id }, data: { featured: d.featured, featuredUntil: d.featured && d.days ? addDays(d.days) : null } }));
  })
);

adminRouter.get(
  "/listings",
  wrap(async (req, res) => {
    const { skip, take } = page(req);
    const q = String(req.query.q || "").trim();
    const where: Prisma.ListingWhereInput = {
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(req.query.moderation ? { moderation: req.query.moderation as any } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: listingInclude }),
    ]);
    res.json({ total, items: items.map((l) => toListingDto(l, { featuredUntil: l.featuredUntil })) });
  })
);

adminRouter.patch(
  "/listings/:id",
  wrap(async (req, res) => {
    const d = z
      .object({ moderation: z.enum(["ACTIVE", "HIDDEN", "REMOVED"]).optional(), featured: z.boolean().optional(), days: z.number().int().min(1).max(365).optional() })
      .parse(req.body);
    const data: Prisma.ListingUpdateInput = {};
    if (d.moderation) data.moderation = d.moderation;
    if (d.featured !== undefined) {
      data.featured = d.featured;
      data.featuredUntil = d.featured && d.days ? addDays(d.days) : null;
    }
    res.json(await prisma.listing.update({ where: { id: req.params.id }, data }));
  })
);

adminRouter.get(
  "/reports",
  wrap(async (req, res) => {
    const status = (req.query.status as string) || "OPEN";
    res.json(
      await prisma.report.findMany({
        where: { status: status as any }, orderBy: { createdAt: "desc" }, take: 100,
        include: { listing: { select: { id: true, title: true, moderation: true } }, reporter: { select: { id: true, name: true, email: true } } },
      })
    );
  })
);

adminRouter.patch(
  "/reports/:id",
  wrap(async (req, res) => {
    const d = z.object({ status: z.enum(["RESOLVED", "DISMISSED"]), hideListing: z.boolean().optional() }).parse(req.body);
    const r = await prisma.report.update({ where: { id: req.params.id }, data: { status: d.status } });
    if (d.hideListing) await prisma.listing.update({ where: { id: r.listingId }, data: { moderation: "HIDDEN" } });
    res.json(r);
  })
);

adminRouter.get("/settings", wrap(async (_req, res) => res.json(await getSettings())));
adminRouter.put(
  "/settings",
  wrap(async (req, res) => {
    const d = z.object({ freeListingLimit: z.coerce.number().int().min(0).max(1000).optional(), freeListingMode: z.enum(["ONE_TIME", "MONTHLY"]).optional() }).parse(req.body);
    for (const [k, v] of Object.entries(d)) if (v !== undefined) await setSetting(k, String(v));
    res.json(await getSettings());
  })
);
