import webpush from "web-push";
import { prisma } from "../db";
import { config } from "../config";

const enabled = !!(config.vapid.publicKey && config.vapid.privateKey);
if (enabled) webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);

export const pushEnabled = enabled;
export const vapidPublicKey = config.vapid.publicKey;

export async function sendPush(userId: string, payload: { title: string; body: string; link?: string }) {
  if (!enabled) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );
}
