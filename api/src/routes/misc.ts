import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { wrap, HttpError } from "../lib/http";
import { requireAuth, requireSeller } from "../middleware/auth";
import { upload, saveImage } from "../lib/upload";
import { listingInclude, toListingDto } from "../lib/listingView";
import { pushEnabled, vapidPublicKey } from "../lib/push";

// ---------- uploads ----------
export const uploadsRouter = Router();
uploadsRouter.post(
  "/",
  requireSeller,
  upload.array("files", 12),
  wrap(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) throw new HttpError(400, "No files uploaded");
    const urls = await Promise.all(files.map((f) => saveImage(f.buffer)));
    res.status(201).json({ urls });
  })
);

// ---------- favorites ----------
export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);
favoritesRouter.get(
  "/",
  wrap(async (req, res) => {
    const favs = await prisma.favorite.findMany({
      where: { userId: req.user!.id, listing: { moderation: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      include: { listing: { include: listingInclude } },
    });
    res.json(favs.map((f) => toListingDto(f.listing, { favorited: true })));
  })
);
favoritesRouter.post(
  "/:listingId",
  wrap(async (req, res) => {
    const l = await prisma.listing.findUnique({ where: { id: req.params.listingId } });
    if (!l || l.moderation !== "ACTIVE") throw new HttpError(404, "Listing not found");
    await prisma.favorite.upsert({
      where: { userId_listingId: { userId: req.user!.id, listingId: l.id } },
      update: {},
      create: { userId: req.user!.id, listingId: l.id },
    });
    res.status(201).json({ ok: true });
  })
);
favoritesRouter.delete(
  "/:listingId",
  wrap(async (req, res) => {
    await prisma.favorite.deleteMany({ where: { userId: req.user!.id, listingId: req.params.listingId } });
    res.json({ ok: true });
  })
);

// ---------- notifications ----------
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
notificationsRouter.get(
  "/",
  wrap(async (req, res) => {
    const items = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, take: 50 });
    res.json(items);
  })
);
notificationsRouter.post(
  "/read-all",
  wrap(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } });
    res.json({ ok: true });
  })
);
notificationsRouter.post(
  "/:id/read",
  wrap(async (req, res) => {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { readAt: new Date() } });
    res.json({ ok: true });
  })
);

// ---------- web push ----------
export const pushRouter = Router();
pushRouter.get("/key", (_req, res) => res.json({ enabled: pushEnabled, publicKey: vapidPublicKey }));
pushRouter.post(
  "/subscribe",
  requireAuth,
  wrap(async (req, res) => {
    const d = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) }).parse(req.body);
    await prisma.pushSubscription.upsert({
      where: { endpoint: d.endpoint },
      update: { userId: req.user!.id, p256dh: d.keys.p256dh, auth: d.keys.auth },
      create: { userId: req.user!.id, endpoint: d.endpoint, p256dh: d.keys.p256dh, auth: d.keys.auth },
    });
    res.status(201).json({ ok: true });
  })
);
pushRouter.post(
  "/unsubscribe",
  requireAuth,
  wrap(async (req, res) => {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user!.id } });
    res.json({ ok: true });
  })
);
