import { Conversation, Listing, MessageType } from "@prisma/client";
import { prisma } from "../db";
import { HttpError } from "./http";
import { emitToUser } from "../realtime";
import { notify } from "./notify";

export async function getOrCreateConversation(listing: Pick<Listing, "id" | "sellerId">, buyerId: string) {
  if (listing.sellerId === buyerId) throw new HttpError(400, "You can't message your own listing");
  return prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId: listing.id, buyerId } },
    update: {},
    create: { listingId: listing.id, buyerId, sellerId: listing.sellerId },
  });
}

export function assertParticipant(c: Pick<Conversation, "buyerId" | "sellerId">, userId: string) {
  if (c.buyerId !== userId && c.sellerId !== userId) throw new HttpError(404, "Conversation not found");
}

export function otherParty(c: Pick<Conversation, "buyerId" | "sellerId">, userId: string) {
  return c.buyerId === userId ? c.sellerId : c.buyerId;
}

/** Stores a message, bumps the conversation, pushes it over the socket to both sides, and notifies the recipient. */
export async function postMessage(opts: {
  conversation: Conversation;
  senderId: string;
  type?: MessageType;
  body: string;
  offerId?: string;
  notifyRecipient?: { type: string; title: string; body?: string };
}) {
  const { conversation: c, senderId } = opts;
  const now = new Date();
  const message = await prisma.message.create({
    data: { conversationId: c.id, senderId, type: opts.type ?? "TEXT", body: opts.body, offerId: opts.offerId },
  });
  const senderIsBuyer = c.buyerId === senderId;
  await prisma.conversation.update({
    where: { id: c.id },
    data: { lastMessageAt: now, ...(senderIsBuyer ? { buyerReadAt: now } : { sellerReadAt: now }) },
  });
  const payload = { conversationId: c.id, message };
  emitToUser(c.buyerId, "message:new", payload);
  emitToUser(c.sellerId, "message:new", payload);

  const recipient = otherParty(c, senderId);
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });
  const listing = await prisma.listing.findUnique({ where: { id: c.listingId }, select: { title: true } });
  const n = opts.notifyRecipient ?? { type: "message", title: `New message from ${sender?.name}` };
  await notify({
    userId: recipient,
    type: n.type,
    title: n.title,
    body: n.body ?? `${listing?.title}: ${opts.body.slice(0, 140)}`,
    link: `/inbox/${c.id}`,
    emailOnlyIfOffline: n.type === "message",
  });
  return message;
}
