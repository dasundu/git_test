/**
 * Demo / mock data for local testing. Safe to run repeatedly (everything is upserted by a fixed id or email).
 * Run:  npm run db:seed:demo      (after `npm run db:seed`)
 *
 * Creates dealers, sellers, buyers, ~24 listings (with generated placeholder photos), favorites,
 * conversations, offers and notifications. All demo accounts use the password below.
 * Photos are generated into api/uploads on the machine that runs this script — run it where the API runs.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PASSWORD = "Demo1234!";
const API_URL = process.env.API_URL || "http://localhost:4000";
const UPLOADS = path.resolve(__dirname, "../uploads");
fs.mkdirSync(UPLOADS, { recursive: true });

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000);

// ---------- placeholder photos ----------
const PALETTE: Record<string, [string, string]> = {
  "dump-trucks": ["#c2410c", "#7c2d12"], "wing-vans": ["#1d4ed8", "#1e3a8a"], "boom-trucks": ["#b45309", "#78350f"],
  "closed-vans": ["#0f766e", "#134e4a"], dropsides: ["#4d7c0f", "#365314"], "tractor-heads": ["#7e22ce", "#581c87"],
  excavators: ["#ca8a04", "#713f12"], "wheel-loaders": ["#ea580c", "#9a3412"], "flatbed-trucks": ["#0369a1", "#0c4a6e"],
  "mixer-trucks": ["#be123c", "#881337"], "refrigerated-vans": ["#0891b2", "#155e75"], "tanker-trucks": ["#475569", "#1e293b"],
  trailers: ["#57534e", "#292524"], forklifts: ["#d97706", "#92400e"], "mobile-cranes": ["#dc2626", "#7f1d1d"],
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function makePhoto(file: string, cat: string, title: string, variant: number) {
  const [c1, c2] = PALETTE[cat] ?? ["#57534e", "#292524"];
  const heavy = ["excavators", "wheel-loaders", "forklifts", "mobile-cranes"].includes(cat);
  const body = heavy
    ? `<rect x="330" y="330" width="420" height="150" rx="14" fill="#fff" opacity=".92"/><rect x="560" y="250" width="190" height="110" rx="10" fill="#fff" opacity=".92"/><path d="M330 400 L190 250 L240 215 L400 360Z" fill="#fff" opacity=".85"/>
       <rect x="280" y="470" width="540" height="64" rx="32" fill="#111" opacity=".85"/>`
    : `<rect x="240" y="300" width="470" height="190" rx="12" fill="#fff" opacity=".92"/><path d="M710 360h130l70 80v50H710z" fill="#fff" opacity=".92"/>
       <circle cx="340" cy="500" r="46" fill="#111"/><circle cx="600" cy="500" r="46" fill="#111"/><circle cx="820" cy="500" r="46" fill="#111"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${variant ? c2 : c1}"/><stop offset="1" stop-color="${variant ? c1 : c2}"/></linearGradient></defs>
    <rect width="1200" height="800" fill="url(#g)"/><rect y="560" width="1200" height="240" fill="#000" opacity=".25"/>
    ${body}
    <text x="60" y="110" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="#fff">${esc(title.slice(0, 34))}</text>
    <text x="60" y="160" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#fff" opacity=".8">${variant ? "Side view" : "Front view"} · demo photo</text>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 72 }).toFile(path.join(UPLOADS, file));
  return `${API_URL}/uploads/${file}`;
}
async function makeLogo(file: string, name: string, color: string) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${color}"/><text x="200" y="245" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="700" fill="#fff">${initials}</text></svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(path.join(UPLOADS, file));
  return `${API_URL}/uploads/${file}`;
}
async function makeCover(file: string, c1: string, c2: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1800" height="500" fill="url(#g)"/></svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 75 }).toFile(path.join(UPLOADS, file));
  return `${API_URL}/uploads/${file}`;
}

// ---------- people ----------
const dealers = [
  { key: "subic", email: "subic.dealer@demo.truckmarket.ph", owner: "Marco Reyes", name: "Subic Bay Truck Center", city: "Subic", province: "Zambales", phone: "0917 555 0101", years: 12, verified: true, featured: true, color: "#c2410c", c2: "#7c2d12", lat: 14.8, lng: 120.27, about: "Importer and reseller of Japan-surplus Isuzu, Hino and Fuso trucks since 2013, based at the Subic Freeport. All units come with complete import papers and a 7-day inspection window." },
  { key: "pampanga", email: "pampanga.dealer@demo.truckmarket.ph", owner: "Liza Santos", name: "Pampanga Heavy Equipment Co.", city: "San Fernando", province: "Pampanga", phone: "0918 555 0102", years: 8, verified: true, featured: true, color: "#1d4ed8", c2: "#1e3a8a", lat: 15.03, lng: 120.69, about: "Excavators, loaders, cranes and other heavy equipment from Japan and Korea. Financing partners available. Showroom along the MacArthur Highway." },
  { key: "clark", email: "clark.dealer@demo.truckmarket.ph", owner: "Ben Dizon", name: "Clark Surplus Motors", city: "Mabalacat", province: "Pampanga", phone: "0919 555 0103", years: 5, verified: false, featured: false, color: "#0f766e", c2: "#134e4a", lat: 15.18, lng: 120.55, about: "Quality used vans, dropsides and light trucks near Clark. New dealership — verification pending." },
  { key: "luzon", email: "luzon.dealer@demo.truckmarket.ph", owner: "Carlo Mendoza", name: "Luzon Trucks Trading", city: "Quezon City", province: "Metro Manila", phone: "0920 555 0104", years: 15, verified: true, featured: false, color: "#7e22ce", c2: "#581c87", lat: 14.676, lng: 121.044, about: "Tractor heads, trailers and mixers for construction and logistics fleets across Luzon." },
];
const sellers = [
  { key: "juan", email: "juan.seller@demo.truckmarket.ph", name: "Juan dela Cruz", phone: "0921 555 0201", messenger: "https://m.me/juandelacruz.trucks" },
  { key: "maria", email: "maria.seller@demo.truckmarket.ph", name: "Maria Villanueva", phone: "0922 555 0202", messenger: null },
];
const buyers = [
  { key: "bea", email: "bea.buyer@demo.truckmarket.ph", name: "Bea Navarro" },
  { key: "rico", email: "rico.buyer@demo.truckmarket.ph", name: "Rico Aquino" },
  { key: "tess", email: "tess.buyer@demo.truckmarket.ph", name: "Tess Ramos" },
];

// ---------- listings ----------
type L = { owner: string; cat: string; brand: string; title: string; price: number; year: number; km?: number; cond?: "USED" | "JAPAN_SURPLUS" | "REPAIRED"; city: string; prov: string; specs: Record<string, string | number>; desc: string; status?: "AVAILABLE" | "RESERVED" | "SOLD"; featured?: boolean; neg?: boolean; age: number; views: number };
const S = "Subic", Z = "Zambales", P = "Pampanga";
const listings: L[] = [
  { owner: "subic", cat: "dump-trucks", brand: "isuzu", title: "2015 Isuzu Giga 10-wheeler Dump Truck", price: 2_650_000, year: 2015, km: 118000, cond: "JAPAN_SURPLUS", city: S, prov: Z, specs: { capacityTons: 15, transmission: "Manual", fuel: "Diesel", wheelConfig: "10x4" as any, engine: "6WG1", horsepower: 380, bodyLengthM: 6.2 }, desc: "Japan surplus, one owner in Japan. Hydraulic dump in perfect order, new tires. Complete import papers, ready for registration.", featured: true, age: 3, views: 182 },
  { owner: "subic", cat: "dump-trucks", brand: "hino", title: "2013 Hino 500 Ranger Dump Truck 6-wheeler", price: 1_480_000, year: 2013, km: 205000, cond: "JAPAN_SURPLUS", city: S, prov: Z, specs: { capacityTons: 8, transmission: "Manual", fuel: "Diesel", wheelConfig: "6x2", engine: "J08E", horsepower: 260 }, desc: "Strong 6-wheeler dump, ideal for hauling aggregates. Recently serviced, no leaks.", age: 9, views: 96 },
  { owner: "subic", cat: "wing-vans", brand: "mitsubishi-fuso", title: "2016 Mitsubishi Fuso Super Great Wing Van", price: 3_100_000, year: 2016, km: 150000, cond: "JAPAN_SURPLUS", city: "Olongapo", prov: Z, specs: { capacityTons: 12, transmission: "Manual", fuel: "Diesel", wheelConfig: "6x2", bodyLengthM: 9.5 }, desc: "Aluminum wing body with air-ride suspension. Perfect for long-haul logistics.", featured: true, age: 5, views: 143 },
  { owner: "subic", cat: "closed-vans", brand: "isuzu", title: "2014 Isuzu Forward Closed Van 6-wheeler", price: 1_750_000, year: 2014, km: 168000, cond: "JAPAN_SURPLUS", city: S, prov: Z, specs: { capacityTons: 6, transmission: "Manual", fuel: "Diesel", wheelConfig: "6x2", bodyLengthM: 7.3 }, desc: "Clean aluminum closed van, tail lift included.", status: "RESERVED", age: 14, views: 77 },
  { owner: "subic", cat: "dropsides", brand: "isuzu", title: "2012 Isuzu Elf Dropside 4-wheeler", price: 780_000, year: 2012, km: 190000, cond: "USED", city: "Olongapo", prov: Z, specs: { capacityTons: 3, transmission: "Manual", fuel: "Diesel", wheelConfig: "4x2" }, desc: "Reliable light truck, good for deliveries. Stainless dropside body.", age: 20, views: 54 },
  { owner: "subic", cat: "dump-trucks", brand: "hino", title: "2011 Hino Ranger Dump Truck (Sold)", price: 1_250_000, year: 2011, km: 240000, cond: "JAPAN_SURPLUS", city: S, prov: Z, specs: { capacityTons: 8, transmission: "Manual", fuel: "Diesel", wheelConfig: "6x2" }, desc: "Sold unit shown for reference.", status: "SOLD", age: 40, views: 210 },

  { owner: "pampanga", cat: "excavators", brand: "komatsu", title: "2017 Komatsu PC200-8 Excavator", price: 3_850_000, year: 2017, cond: "JAPAN_SURPLUS", city: "San Fernando", prov: P, specs: { operatingHours: 4800, operatingWeightTons: 20, engine: "SAA6D107E", horsepower: 148, bucketCapacityM3: 0.9 }, desc: "Low-hour Japan surplus excavator. Undercarriage at 80%, new bucket teeth, aircon working.", featured: true, age: 2, views: 231 },
  { owner: "pampanga", cat: "excavators", brand: "kobelco", title: "2015 Kobelco SK200-8 Excavator", price: 3_200_000, year: 2015, cond: "JAPAN_SURPLUS", city: "San Fernando", prov: P, specs: { operatingHours: 7200, operatingWeightTons: 20, engine: "J05E", horsepower: 138, bucketCapacityM3: 0.8 }, desc: "Well maintained, full service history. Hydraulic breaker line installed.", age: 8, views: 118 },
  { owner: "pampanga", cat: "wheel-loaders", brand: "caterpillar", title: "2014 Caterpillar 950H Wheel Loader", price: 2_900_000, year: 2014, cond: "USED", city: "Angeles", prov: P, specs: { operatingHours: 9100, operatingWeightTons: 18, engine: "C7", horsepower: 211, bucketCapacityM3: 3.1 }, desc: "Solid loader for quarry and yard work. Tires 70%.", age: 12, views: 89 },
  { owner: "pampanga", cat: "mobile-cranes", brand: "tadano", title: "2010 Tadano GR-250N Rough Terrain Crane 25 tons", price: 5_400_000, year: 2010, cond: "JAPAN_SURPLUS", city: "San Fernando", prov: P, specs: { liftCapacityTons: 25, boomLengthM: 31, wheelConfig: "4x4", engine: "6D34" }, desc: "Rough terrain crane with load moment indicator. Boom recently inspected.", age: 17, views: 64 },
  { owner: "pampanga", cat: "boom-trucks", brand: "kato", title: "2012 Kato 5-ton Boom Truck", price: 2_350_000, year: 2012, cond: "JAPAN_SURPLUS", city: "Angeles", prov: P, specs: { liftCapacityTons: 5, boomLengthM: 17, wheelConfig: "6x2", engine: "J08C" }, desc: "Compact boom truck on Hino chassis. Ready to work.", status: "RESERVED", age: 6, views: 71 },
  { owner: "pampanga", cat: "forklifts", brand: "toyota", title: "2016 Toyota 3-ton Diesel Forklift", price: 640_000, year: 2016, cond: "JAPAN_SURPLUS", city: "San Fernando", prov: P, specs: { operatingHours: 5600, operatingWeightTons: 4.5, engine: "1DZ", horsepower: 55 }, desc: "Triple mast, side shift. Great for warehouses.", age: 25, views: 40 },

  { owner: "clark", cat: "closed-vans", brand: "isuzu", title: "2013 Isuzu Elf Closed Van 4-wheeler", price: 920_000, year: 2013, km: 175000, cond: "USED", city: "Mabalacat", prov: P, specs: { capacityTons: 3, transmission: "Manual", fuel: "Diesel", wheelConfig: "4x2", bodyLengthM: 4.8 }, desc: "Good for last-mile delivery. Fresh paint, new battery.", age: 4, views: 58 },
  { owner: "clark", cat: "dropsides", brand: "fuso", title: "2014 Fuso Canter Dropside", price: 860_000, year: 2014, km: 160000, cond: "JAPAN_SURPLUS", city: "Mabalacat", prov: P, specs: { capacityTons: 3, transmission: "Manual", fuel: "Diesel", wheelConfig: "4x2" }, desc: "Clean unit, aluminum dropsides.", age: 11, views: 33 },
  { owner: "clark", cat: "refrigerated-vans", brand: "hino", title: "2015 Hino 300 Refrigerated Van", price: 1_450_000, year: 2015, km: 130000, cond: "JAPAN_SURPLUS", city: "Angeles", prov: P, specs: { capacityTons: 4, transmission: "Manual", fuel: "Diesel", wheelConfig: "4x2", bodyLengthM: 5.2 }, desc: "-20°C freezer body, standby power. Perfect for frozen goods.", age: 7, views: 47 },

  { owner: "luzon", cat: "tractor-heads", brand: "hino", title: "2012 Hino Profia Tractor Head", price: 2_950_000, year: 2012, km: 410000, cond: "JAPAN_SURPLUS", city: "Quezon City", prov: "Metro Manila", specs: { transmission: "Manual", fuel: "Diesel", wheelConfig: "6x4", engine: "E13C", horsepower: 420, fifthWheel: "Yes" }, desc: "Heavy-duty prime mover, rebuilt engine with receipts.", featured: true, age: 1, views: 120 },
  { owner: "luzon", cat: "tractor-heads", brand: "mitsubishi-fuso", title: "2014 Fuso Super Great Tractor Head", price: 3_400_000, year: 2014, km: 295000, cond: "JAPAN_SURPLUS", city: "Quezon City", prov: "Metro Manila", specs: { transmission: "Manual", fuel: "Diesel", wheelConfig: "6x4", engine: "6R10", horsepower: 460, fifthWheel: "Yes" }, desc: "Low-mileage tractor head, air-conditioned cab, ready for the road.", age: 13, views: 92 },
  { owner: "luzon", cat: "trailers", brand: "other", title: "40ft Tri-axle Container Trailer", price: 1_200_000, year: 2018, cond: "USED", city: "Valenzuela", prov: "Metro Manila", specs: { capacityTons: 30, axles: "3", lengthM: 12.2 }, desc: "Twist locks, new brake chambers.", age: 18, views: 38 },
  { owner: "luzon", cat: "mixer-trucks", brand: "isuzu", title: "2013 Isuzu Giga Concrete Mixer 6m³", price: 2_200_000, year: 2013, km: 190000, cond: "JAPAN_SURPLUS", city: "Caloocan", prov: "Metro Manila", specs: { capacityTons: 12, transmission: "Manual", fuel: "Diesel", wheelConfig: "6x4", engine: "6HK1" }, desc: "Drum in great shape, new blades. Ready for deployment.", age: 22, views: 61 },

  { owner: "juan", cat: "dropsides", brand: "isuzu", title: "2010 Isuzu Elf Dropside - Owner Selling", price: 520_000, year: 2010, km: 230000, cond: "USED", city: "Tarlac City", prov: "Tarlac", specs: { capacityTons: 2.5, transmission: "Manual", fuel: "Diesel", wheelConfig: "4x2" }, desc: "Own use, selling because I'm upgrading. Papers complete. Serious buyers only.", age: 6, views: 29 },
  { owner: "juan", cat: "closed-vans", brand: "toyota", title: "2009 Toyota Dyna Closed Van", price: 450_000, year: 2009, km: 280000, cond: "USED", city: "Tarlac City", prov: "Tarlac", specs: { capacityTons: 2, transmission: "Manual", fuel: "Diesel", wheelConfig: "4x2" }, desc: "Cheap and strong delivery van.", age: 15, views: 22 },
  { owner: "maria", cat: "flatbed-trucks", brand: "hino", title: "2011 Hino 500 Flatbed 6-wheeler", price: 1_150_000, year: 2011, km: 260000, cond: "USED", city: "Balanga", prov: "Bataan", specs: { capacityTons: 8, transmission: "Manual", fuel: "Diesel", wheelConfig: "6x2", bodyLengthM: 7.0 }, desc: "Steel flatbed, well kept. Available for viewing in Balanga.", age: 10, views: 35 },
  { owner: "maria", cat: "excavators", brand: "hitachi", title: "2008 Hitachi ZX120 Mini Excavator", price: 1_350_000, year: 2008, cond: "JAPAN_SURPLUS", city: "Balanga", prov: "Bataan", specs: { operatingHours: 11200, operatingWeightTons: 12, engine: "4JJ1", horsepower: 90, bucketCapacityM3: 0.5 }, desc: "Compact excavator, ideal for small jobs.", age: 30, views: 26 },
];

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const brandBySlug = new Map((await prisma.brand.findMany()).map((b) => [b.slug, b.id]));
  const catBySlug = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  if (!catBySlug.size) throw new Error("No categories found — run `npm run db:seed` first.");
  // The "Other" brand placeholder:
  if (!brandBySlug.has("other")) {
    const b = await prisma.brand.upsert({ where: { slug: "other" }, update: {}, create: { slug: "other", name: "Other" } });
    brandBySlug.set("other", b.id);
  }

  const users = new Map<string, string>();
  const dealerIds = new Map<string, string>();

  for (const d of dealers) {
    const u = await prisma.user.upsert({
      where: { email: d.email }, update: {},
      create: { email: d.email, name: d.owner, phone: d.phone, role: "DEALER", passwordHash: hash },
    });
    users.set(d.key, u.id);
    const logoUrl = await makeLogo(`demo-logo-${d.key}.webp`, d.name, d.color);
    const coverUrl = await makeCover(`demo-cover-${d.key}.webp`, d.color, d.c2);
    const slug = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const dl = await prisma.dealership.upsert({
      where: { userId: u.id },
      update: { logoUrl, coverUrl },
      create: {
        userId: u.id, name: d.name, slug, description: d.about, logoUrl, coverUrl, city: d.city, province: d.province,
        address: `${d.city}, ${d.province}`, latitude: d.lat, longitude: d.lng, phone: d.phone,
        messengerUrl: `https://m.me/${slug}`, facebookUrl: `https://facebook.com/${slug}`, yearsInBusiness: d.years,
        verified: d.verified, verifiedAt: d.verified ? daysAgo(30) : null,
        featured: d.featured, featuredUntil: d.featured ? new Date(Date.now() + 60 * 86400_000) : null,
      },
    });
    dealerIds.set(d.key, dl.id);
  }
  for (const s of sellers) {
    const u = await prisma.user.upsert({
      where: { email: s.email }, update: {},
      create: { email: s.email, name: s.name, phone: s.phone, messengerUrl: s.messenger, role: "SELLER", passwordHash: hash },
    });
    users.set(s.key, u.id);
  }
  for (const b of buyers) {
    const u = await prisma.user.upsert({ where: { email: b.email }, update: {}, create: { email: b.email, name: b.name, role: "BUYER", passwordHash: hash } });
    users.set(b.key, u.id);
  }

  const listingIds: string[] = [];
  for (const [i, l] of listings.entries()) {
    const id = `demo-listing-${String(i + 1).padStart(2, "0")}`;
    const imgs = [await makePhoto(`demo-${id}-a.webp`, l.cat, l.title, 0), await makePhoto(`demo-${id}-b.webp`, l.cat, l.title, 1)];
    const data = {
      sellerId: users.get(l.owner)!, dealershipId: dealerIds.get(l.owner) ?? null,
      categoryId: catBySlug.get(l.cat)!, brandId: brandBySlug.get(l.brand) ?? null,
      title: l.title, description: l.desc, price: l.price, negotiable: l.neg ?? true, year: l.year, mileageKm: l.km ?? null,
      condition: l.cond ?? "USED", province: l.prov, city: l.city, specs: l.specs,
      status: l.status ?? "AVAILABLE", availabilityConfirmedAt: daysAgo(Math.min(l.age, 4)), views: l.views,
      featured: !!l.featured, featuredUntil: l.featured ? new Date(Date.now() + 30 * 86400_000) : null, createdAt: daysAgo(l.age),
    };
    await prisma.listing.upsert({ where: { id }, update: { ...data }, create: { id, ...data } });
    await prisma.listingImage.deleteMany({ where: { listingId: id } });
    await prisma.listingImage.createMany({ data: imgs.map((url, n) => ({ listingId: id, url, sortOrder: n })) });
    listingIds.push(id);
  }

  // favorites
  for (const [buyer, idxs] of [["bea", [0, 6, 2]], ["rico", [6, 14]], ["tess", [0, 12]]] as const) {
    for (const i of idxs) await prisma.favorite.upsert({ where: { userId_listingId: { userId: users.get(buyer)!, listingId: listingIds[i] } }, update: {}, create: { userId: users.get(buyer)!, listingId: listingIds[i] } });
  }

  // conversations (only created once)
  const convo = async (buyer: string, li: number, msgs: [string, string, number][], offers: { amount: number; fromSeller: boolean; status: any; note?: string }[]) => {
    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: listingIds[li] } });
    const buyerId = users.get(buyer)!;
    if (await prisma.conversation.findUnique({ where: { listingId_buyerId: { listingId: listing.id, buyerId } } })) return;
    const c = await prisma.conversation.create({ data: { listingId: listing.id, buyerId, sellerId: listing.sellerId, lastMessageAt: daysAgo(0), buyerReadAt: daysAgo(0), sellerReadAt: daysAgo(1) } });
    for (const [who, body, ago] of msgs) await prisma.message.create({ data: { conversationId: c.id, senderId: who === "b" ? buyerId : listing.sellerId, body, createdAt: new Date(Date.now() - ago * 3600_000) } });
    let parent: string | undefined;
    for (const o of offers) {
      const off = await prisma.offer.create({ data: { conversationId: c.id, listingId: listing.id, buyerId, sellerId: listing.sellerId, amount: o.amount, note: o.note, status: o.status, fromSeller: o.fromSeller, parentOfferId: parent, respondedAt: o.status === "PENDING" ? null : daysAgo(0) } });
      parent = off.id;
      await prisma.message.create({ data: { conversationId: c.id, senderId: o.fromSeller ? listing.sellerId : buyerId, type: "OFFER", offerId: off.id, body: `${o.fromSeller ? "Countered with" : "Offered"} ₱${o.amount.toLocaleString("en-PH")}${o.note ? ` — ${o.note}` : ""}` } });
    }
    await prisma.notification.create({ data: { userId: listing.sellerId, type: "message", title: "New message", body: `${listing.title}: ${msgs[msgs.length - 1][1].slice(0, 100)}`, link: `/inbox/${c.id}` } });
  };
  await convo("bea", 0, [["b", "Hi! Is the Giga still available? Can I inspect on Saturday?", 30], ["s", "Yes, still available. Saturday morning works — we're at the Subic Freeport.", 28]], [{ amount: 2_400_000, fromSeller: false, status: "COUNTERED" }, { amount: 2_550_000, fromSeller: true, status: "PENDING", note: "Best I can do with the new tires" }]);
  await convo("rico", 6, [["b", "Interested in the PC200. What's the undercarriage condition?", 6], ["s", "80% remaining, I can send a video walkaround.", 5]], [{ amount: 3_600_000, fromSeller: false, status: "PENDING" }]);
  await convo("tess", 12, [["b", "Hello, is this van still available?", 3]], []);

  console.log(`Demo data ready: ${dealers.length} dealers, ${sellers.length} sellers, ${buyers.length} buyers, ${listings.length} listings.`);
  console.log(`All demo accounts use the password: ${PASSWORD}`);
  console.log("Dealers:  " + dealers.map((d) => d.email).join(", "));
  console.log("Sellers:  " + sellers.map((d) => d.email).join(", "));
  console.log("Buyers:   " + buyers.map((d) => d.email).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
