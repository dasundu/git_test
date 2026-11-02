import { prisma } from "../db";
import { config } from "../config";
import { emitToUser, isOnline } from "../realtime";
import { sendMail } from "./mailer";
import { sendPush } from "./push";

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  /** Skip email when the user is currently connected (used for chat messages). */
  emailOnlyIfOffline?: boolean;
}

export async function notify(n: NotifyInput) {
  const row = await prisma.notification.create({
    data: { userId: n.userId, type: n.type, title: n.title, body: n.body, link: n.link },
  });
  emitToUser(n.userId, "notification:new", row);

  const online = isOnline(n.userId);
  // Push only when the user isn't looking at the site.
  if (!online) void sendPush(n.userId, { title: n.title, body: n.body, link: n.link });

  if (!(n.emailOnlyIfOffline && online)) {
    const user = await prisma.user.findUnique({ where: { id: n.userId } });
    if (user?.emailNotify) {
      const url = n.link ? `${config.webUrl}${n.link}` : config.webUrl;
      void sendMail(user.email, n.title, `${n.body}\n\nOpen: ${url}`);
    }
  }
  return row;
}
