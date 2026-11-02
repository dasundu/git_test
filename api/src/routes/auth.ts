import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { config } from "../config";
import { wrap, HttpError } from "../lib/http";
import { signReset, signSession, signSocket, verifyReset } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";
import { uniqueDealerSlug } from "../lib/slug";
import { freeListingQuota } from "../lib/settings";
import { sendMail } from "../lib/mailer";

export const authRouter = Router();

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.isProd,
  maxAge: 30 * 24 * 3600 * 1000,
  path: "/",
};

const registerSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional(),
  accountType: z.enum(["BUYER", "SELLER", "DEALER"]),
  dealershipName: z.string().trim().min(2).max(100).optional(),
});

export async function me(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { dealership: true } });
  const [unreadNotifications, convos, quota] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: { buyerId: true, buyerReadAt: true, sellerReadAt: true, lastMessageAt: true },
    }),
    user.role === "SELLER" || user.role === "DEALER" ? freeListingQuota(userId) : Promise.resolve(null),
  ]);
  const unreadMessages = convos.filter((c) =>
    c.buyerId === userId ? c.lastMessageAt > c.buyerReadAt : c.lastMessageAt > c.sellerReadAt
  ).length;
  const { passwordHash, ...safe } = user;
  return { ...safe, unreadNotifications, unreadMessages, quota };
}

authRouter.post(
  "/register",
  wrap(async (req, res) => {
    const d = registerSchema.parse(req.body);
    if (d.accountType === "DEALER" && !d.dealershipName) throw new HttpError(400, "Dealership name is required");
    if (await prisma.user.findUnique({ where: { email: d.email } })) throw new HttpError(409, "Email already registered");
    const user = await prisma.user.create({
      data: {
        email: d.email,
        name: d.name,
        phone: d.phone,
        role: d.accountType,
        passwordHash: await bcrypt.hash(d.password, 10),
        ...(d.accountType === "DEALER"
          ? { dealership: { create: { name: d.dealershipName!, slug: await uniqueDealerSlug(d.dealershipName!), phone: d.phone } } }
          : {}),
      },
    });
    res.cookie("token", signSession(user.id, user.role), cookieOpts);
    res.status(201).json(await me(user.id));
  })
);

authRouter.post(
  "/login",
  wrap(async (req, res) => {
    const { email, password } = z
      .object({ email: z.string().email().transform((s) => s.toLowerCase().trim()), password: z.string() })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, "Invalid email or password");
    if (user.suspended) throw new HttpError(403, "This account has been suspended");
    res.cookie("token", signSession(user.id, user.role), cookieOpts);
    res.json(await me(user.id));
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  wrap(async (req, res) => {
    if (!req.user) return res.json(null);
    res.json(await me(req.user.id));
  })
);

authRouter.patch(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const d = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        phone: z.string().trim().max(30).nullable().optional(),
        messengerUrl: z.string().trim().url().max(200).nullable().optional().or(z.literal("")),
        emailNotify: z.boolean().optional(),
      })
      .parse(req.body);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { ...d, messengerUrl: d.messengerUrl === "" ? null : d.messengerUrl },
    });
    res.json(await me(req.user!.id));
  })
);

authRouter.post(
  "/password",
  requireAuth,
  wrap(async (req, res) => {
    const d = z.object({ current: z.string(), next: z.string().min(8).max(100) }).parse(req.body);
    if (!(await bcrypt.compare(d.current, req.user!.passwordHash))) throw new HttpError(400, "Current password is incorrect");
    await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash: await bcrypt.hash(d.next, 10) } });
    res.json({ ok: true });
  })
);

authRouter.get("/socket-token", requireAuth, (req, res) => {
  res.json({ token: signSocket(req.user!.id, req.user!.role) });
});

authRouter.post(
  "/forgot",
  wrap(async (req, res) => {
    const { email } = z.object({ email: z.string().email().transform((s) => s.toLowerCase()) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.suspended) {
      const token = signReset(user.id, user.passwordHash.slice(-10));
      await sendMail(user.email, "Reset your password", `Reset your password: ${config.webUrl}/reset-password?token=${token}\n\nThis link expires in 1 hour.`);
    }
    // Same response either way so emails can't be enumerated.
    res.json({ ok: true });
  })
);

authRouter.post(
  "/reset",
  wrap(async (req, res) => {
    const d = z.object({ token: z.string(), password: z.string().min(8).max(100) }).parse(req.body);
    const p = verifyReset(d.token);
    const user = p ? await prisma.user.findUnique({ where: { id: p.sub } }) : null;
    // Hash fragment makes each reset link single-use (it stops matching once the password changes).
    if (!p || !user || user.passwordHash.slice(-10) !== p.h) throw new HttpError(400, "Reset link is invalid or has expired");
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(d.password, 10) } });
    res.json({ ok: true });
  })
);
