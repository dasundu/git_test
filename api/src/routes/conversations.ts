import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { wrap, HttpError } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { assertParticipant, getOrCreateConversation, otherParty, postMessage } from "../lib/chat";
import { emitToUser } from "../realtime";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

const convoInclude = {
  listing: {
    select: {
      id: true, title: true, price: true, status: true, moderation: true,
      images: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { url: true } },
    },
  },
  buyer: { select: { id: true, name: true } },
  seller: { select: { id: true, name: true, messengerUrl: true } },
};

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

conversationsRouter.get(
  "/",
  wrap(async (req, res) => {
    const uid = req.user!.id;
    const convos = await prisma.conversation.findMany({
      where: { OR: [{ buyerId: uid }, { sellerId: uid }] },
      orderBy: { lastMessageAt: "desc" },
      include: { ...convoInclude, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    res.json(
      convos.map(({ messages, ...c }) => ({
        ...c,
        lastMessage: messages[0] ?? null,
        unread: c.buyerId === uid ? c.lastMessageAt > c.buyerReadAt : c.lastMessageAt > c.sellerReadAt,
        role: c.buyerId === uid ? "buyer" : "seller",
      }))
    );
  })
);

// Start (or reopen) a conversation about a listing — the "Chat with Seller" button.
conversationsRouter.post(
  "/",
  wrap(async (req, res) => {
    const d = z.object({ listingId: z.string(), body: z.string().trim().min(1).max(2000).optional() }).parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id: d.listingId } });
    if (!listing || listing.moderation !== "ACTIVE") throw new HttpError(404, "Listing not found");
    const c = await getOrCreateConversation(listing, req.user!.id);
    if (d.body) await postMessage({ conversation: c, senderId: req.user!.id, body: d.body });
    res.status(201).json({ id: c.id });
  })
);

conversationsRouter.get(
  "/:id",
  wrap(async (req, res) => {
    const uid = req.user!.id;
    const c = await prisma.conversation.findUnique({ where: { id: req.params.id }, include: convoInclude });
    if (!c) throw new HttpError(404, "Conversation not found");
    assertParticipant(c, uid);
    const [messages, offers] = await Promise.all([
      prisma.message.findMany({ where: { conversationId: c.id }, orderBy: { createdAt: "asc" } }),
      prisma.offer.findMany({ where: { conversationId: c.id }, orderBy: { createdAt: "asc" } }),
    ]);
    await prisma.conversation.update({
      where: { id: c.id },
      data: c.buyerId === uid ? { buyerReadAt: new Date() } : { sellerReadAt: new Date() },
    });
    res.json({ conversation: { ...c, role: c.buyerId === uid ? "buyer" : "seller" }, messages, offers });
  })
);

conversationsRouter.post(
  "/:id/messages",
  wrap(async (req, res) => {
    const { body } = z.object({ body: z.string().trim().min(1).max(2000) }).parse(req.body);
    const c = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!c) throw new HttpError(404, "Conversation not found");
    assertParticipant(c, req.user!.id);
    res.status(201).json(await postMessage({ conversation: c, senderId: req.user!.id, body }));
  })
);

// ---------- offers ----------
conversationsRouter.post(
  "/:id/offers",
  wrap(async (req, res) => {
    const d = z.object({ amount: z.coerce.number().int().min(1).max(1e10), note: z.string().trim().max(500).optional() }).parse(req.body);
    const c = await prisma.conversation.findUnique({ where: { id: req.params.id }, include: { listing: true } });
    if (!c) throw new HttpError(404, "Conversation not found");
    if (c.buyerId !== req.user!.id) throw new HttpError(403, "Only the buyer can start an offer");
    if (c.listing.status === "SOLD") throw new HttpError(409, "This truck has been sold");
    if (await prisma.offer.findFirst({ where: { conversationId: c.id, status: "PENDING" } }))
      throw new HttpError(409, "There is already an open offer on this truck");
    const offer = await prisma.offer.create({
      data: { conversationId: c.id, listingId: c.listingId, buyerId: c.buyerId, sellerId: c.sellerId, amount: d.amount, note: d.note, fromSeller: false },
    });
    await postMessage({
      conversation: c, senderId: req.user!.id, type: "OFFER", offerId: offer.id,
      body: `Offered ${peso(d.amount)}${d.note ? ` — ${d.note}` : ""}`,
      notifyRecipient: { type: "offer", title: `New offer: ${peso(d.amount)}`, body: `${req.user!.name} offered ${peso(d.amount)} for ${c.listing.title}.` },
    });
    res.status(201).json(offer);
  })
);

export const offersRouter = Router();
offersRouter.use(requireAuth);

async function loadOffer(id: string, uid: string) {
  const offer = await prisma.offer.findUnique({ where: { id }, include: { conversation: { include: { listing: true } } } });
  if (!offer || (offer.buyerId !== uid && offer.sellerId !== uid)) throw new HttpError(404, "Offer not found");
  return offer;
}
const broadcast = (o: { buyerId: string; sellerId: string }, offer: unknown) => {
  emitToUser(o.buyerId, "offer:update", offer);
  emitToUser(o.sellerId, "offer:update", offer);
};

offersRouter.post(
  "/:id/respond",
  wrap(async (req, res) => {
    const d = z
      .object({ action: z.enum(["ACCEPT", "REJECT", "COUNTER"]), amount: z.coerce.number().int().min(1).max(1e10).optional(), note: z.string().trim().max(500).optional() })
      .parse(req.body);
    const uid = req.user!.id;
    const offer = await loadOffer(req.params.id, uid);
    const responderId = offer.fromSeller ? offer.buyerId : offer.sellerId;
    if (uid !== responderId) throw new HttpError(403, "You can't respond to your own offer");
    if (offer.status !== "PENDING") throw new HttpError(409, "This offer has already been answered");
    const c = offer.conversation;
    const title = c.listing.title;

    if (d.action === "COUNTER") {
      if (!d.amount) throw new HttpError(400, "Counter amount is required");
      const [old, counter] = await prisma.$transaction([
        prisma.offer.update({ where: { id: offer.id }, data: { status: "COUNTERED", respondedAt: new Date() } }),
        prisma.offer.create({
          data: { conversationId: c.id, listingId: c.listingId, buyerId: offer.buyerId, sellerId: offer.sellerId, amount: d.amount, note: d.note, fromSeller: !offer.fromSeller, parentOfferId: offer.id },
        }),
      ]);
      broadcast(offer, old);
      await postMessage({
        conversation: c, senderId: uid, type: "OFFER", offerId: counter.id,
        body: `Countered with ${peso(d.amount)}${d.note ? ` — ${d.note}` : ""}`,
        notifyRecipient: { type: "offer", title: `Counter offer: ${peso(d.amount)}`, body: `${req.user!.name} countered with ${peso(d.amount)} on ${title}.` },
      });
      return res.json(counter);
    }

    const status = d.action === "ACCEPT" ? "ACCEPTED" : "REJECTED";
    const updated = await prisma.offer.update({ where: { id: offer.id }, data: { status, respondedAt: new Date() } });
    broadcast(offer, updated);
    const verb = d.action === "ACCEPT" ? "accepted" : "declined";
    await postMessage({
      conversation: c, senderId: uid, type: "SYSTEM",
      body: `${req.user!.name} ${verb} the offer of ${peso(offer.amount)}.${d.action === "ACCEPT" ? " Agree on payment and handover details in chat." : ""}`,
      notifyRecipient: { type: "offer", title: `Offer ${verb}`, body: `Your offer of ${peso(offer.amount)} on ${title} was ${verb}.` },
    });
    res.json(updated);
  })
);

offersRouter.post(
  "/:id/withdraw",
  wrap(async (req, res) => {
    const uid = req.user!.id;
    const offer = await loadOffer(req.params.id, uid);
    const creatorId = offer.fromSeller ? offer.sellerId : offer.buyerId;
    if (uid !== creatorId) throw new HttpError(403, "Only the sender can withdraw an offer");
    if (offer.status !== "PENDING") throw new HttpError(409, "This offer has already been answered");
    const updated = await prisma.offer.update({ where: { id: offer.id }, data: { status: "WITHDRAWN", respondedAt: new Date() } });
    broadcast(offer, updated);
    await postMessage({
      conversation: offer.conversation, senderId: uid, type: "SYSTEM",
      body: `${req.user!.name} withdrew the offer of ${peso(offer.amount)}.`,
      notifyRecipient: { type: "offer", title: "Offer withdrawn", body: `The offer of ${peso(offer.amount)} was withdrawn.` },
    });
    res.json(updated);
  })
);
