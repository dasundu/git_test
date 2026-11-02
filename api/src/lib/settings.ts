import { prisma } from "../db";

const DEFAULTS: Record<string, string> = {
  freeListingLimit: "4",
  // ONE_TIME: lifetime allowance. MONTHLY: allowance resets every calendar month.
  freeListingMode: "ONE_TIME",
};

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const out = { ...DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function setSetting(key: string, value: string) {
  if (!(key in DEFAULTS)) throw new Error(`Unknown setting ${key}`);
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function freeListingQuota(userId: string) {
  const s = await getSettings();
  const limit = Number(s.freeListingLimit);
  const mode = s.freeListingMode;
  const where: any = { sellerId: userId };
  if (mode === "MONTHLY") {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    where.createdAt = { gte: start };
  }
  // Count every listing ever created (including removed) so deleting can't game the quota.
  const used = await prisma.listing.count({ where });
  return { limit, used, remaining: Math.max(0, limit - used), mode };
}
