import { prisma } from "../db";

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "dealer";
}

export async function uniqueDealerSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let i = 1;
  while (await prisma.dealership.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}
