import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { wrap, HttpError } from "../lib/http";
import { requireRole } from "../middleware/auth";
import { upload, saveImage } from "../lib/upload";

export const dealershipsRouter = Router();

const url = z.string().trim().url().max(300).nullable().optional().or(z.literal(""));
const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === "" ? null : v]));

dealershipsRouter.get(
  "/",
  wrap(async (req, res) => {
    const verified = req.query.verified === "1";
    const list = await prisma.dealership.findMany({
      where: { ...(verified ? { verified: true } : {}), user: { suspended: false } },
      orderBy: [{ verified: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { listings: { where: { moderation: "ACTIVE", status: { in: ["AVAILABLE", "RESERVED"] } } } } } },
    });
    res.json(list.map(({ _count, userId, ...d }) => ({ ...d, inventoryCount: _count.listings })));
  })
);

dealershipsRouter.patch(
  "/me",
  requireRole("DEALER"),
  wrap(async (req, res) => {
    const d = z
      .object({
        name: z.string().trim().min(2).max(100).optional(),
        description: z.string().trim().max(3000).nullable().optional(),
        address: z.string().trim().max(200).nullable().optional(),
        city: z.string().trim().max(60).nullable().optional(),
        province: z.string().trim().max(60).nullable().optional(),
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
        phone: z.string().trim().max(60).nullable().optional(),
        messengerUrl: url,
        facebookUrl: url,
        websiteUrl: url,
        yearsInBusiness: z.number().int().min(0).max(150).nullable().optional(),
      })
      .parse(req.body);
    const updated = await prisma.dealership.update({ where: { userId: req.user!.id }, data: clean(d) });
    res.json(updated);
  })
);

dealershipsRouter.post(
  "/me/images",
  requireRole("DEALER"),
  upload.fields([{ name: "logo", maxCount: 1 }, { name: "cover", maxCount: 1 }]),
  wrap(async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]>;
    const data: { logoUrl?: string; coverUrl?: string } = {};
    if (files.logo?.[0]) data.logoUrl = await saveImage(files.logo[0].buffer, { maxWidth: 600 });
    if (files.cover?.[0]) data.coverUrl = await saveImage(files.cover[0].buffer, { maxWidth: 1800 });
    if (!Object.keys(data).length) throw new HttpError(400, "Upload a logo and/or cover photo");
    res.json(await prisma.dealership.update({ where: { userId: req.user!.id }, data }));
  })
);

dealershipsRouter.get(
  "/:slug",
  wrap(async (req, res) => {
    const d = await prisma.dealership.findUnique({ where: { slug: req.params.slug }, include: { user: { select: { suspended: true } } } });
    if (!d || d.user.suspended) throw new HttpError(404, "Dealership not found");
    const { user, userId, ...pub } = d;
    const inventoryCount = await prisma.listing.count({ where: { dealershipId: d.id, moderation: "ACTIVE", status: { in: ["AVAILABLE", "RESERVED"] } } });
    res.json({ ...pub, inventoryCount });
  })
);
