import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();
const run = Date.now();
const email = (n: string) => `${n}.${run}@test.ph`;
const agent = () => request.agent(app);

let dealer = agent(), buyer = agent(), admin = agent(), indiv = agent();
let categoryId = "", brandId = "", listingId = "", convoId = "", dealerId = "";

describe("marketplace flow", () => {
  beforeAll(async () => {
    const cat = await prisma.category.findFirstOrThrow({ where: { slug: "dump-trucks" } });
    categoryId = cat.id;
    brandId = (await prisma.brand.findFirstOrThrow({ where: { slug: "isuzu" } })).id;
    const a = await admin.post("/auth/login").send({ email: process.env.ADMIN_EMAIL || "admin@truckmarket.ph", password: process.env.ADMIN_PASSWORD || "ChangeMe123!" });
    expect(a.status).toBe(200);
  });

  it("registers dealer, buyer, individual seller", async () => {
    const d = await dealer.post("/auth/register").send({ email: email("dealer"), password: "password123", name: "Dan Dealer", accountType: "DEALER", dealershipName: `Subic Truck Hub ${run}` });
    expect(d.status).toBe(201);
    expect(d.body.dealership.slug).toBe(`subic-truck-hub-${run}`);
    expect(d.body.quota.remaining).toBe(4);
    dealerId = d.body.dealership.id;
    expect((await buyer.post("/auth/register").send({ email: email("buyer"), password: "password123", name: "Bea Buyer", accountType: "BUYER" })).status).toBe(201);
    expect((await indiv.post("/auth/register").send({ email: email("indiv"), password: "password123", name: "Ivan", accountType: "SELLER" })).status).toBe(201);
    expect((await request(app).post("/auth/register").send({ email: email("dealer"), password: "password123", name: "Xy", accountType: "BUYER" })).status).toBe(409);
  });

  it("uploads an image, creates a listing, enforces buyer cannot sell", async () => {
    const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#f00" } }).png().toBuffer();
    expect((await buyer.post("/uploads-api").attach("files", png, "a.png")).status).toBe(403);
    const up = await dealer.post("/uploads-api").attach("files", png, "a.png");
    expect(up.status).toBe(201);
    const url = up.body.urls[0];
    expect((await buyer.post("/listings").send({})).status).toBe(403);
    const bad = await dealer.post("/listings").send({ title: "Isuzu Giga Dump", description: "Good condition dump truck", categoryId, price: 1500000, images: ["http://evil.com/x.png"] });
    expect(bad.status).toBe(400);
    const r = await dealer.post("/listings").send({
      title: `Isuzu Giga${run} 10-wheeler Dump`, description: "Japan surplus, well maintained", categoryId, brandId, price: 2500000,
      year: 2015, mileageKm: 120000, condition: "JAPAN_SURPLUS", province: "Zambales", city: "Subic",
      specs: { capacityTons: 15, transmission: "Manual", bogus: "dropped" }, images: [url],
    });
    expect(r.status).toBe(201);
    expect(r.body.specs).toEqual({ capacityTons: 15, transmission: "Manual" });
    listingId = r.body.id;
    expect(r.body.dealership.name).toBe(`Subic Truck Hub ${run}`);
  });

  it("enforces the 4 free listing quota", async () => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#0f0" } }).png().toBuffer();
    const url = (await indiv.post("/uploads-api").attach("files", png, "b.png")).body.urls[0];
    const body = { title: "Hino 500 closed van", description: "Clean unit available", categoryId, price: 900000, images: [url] };
    for (let i = 0; i < 4; i++) expect((await indiv.post("/listings").send(body)).status).toBe(201);
    const fifth = await indiv.post("/listings").send(body);
    expect(fifth.status).toBe(402);
    const me = await indiv.get("/auth/me");
    expect(me.body.quota).toMatchObject({ used: 4, remaining: 0, limit: 4 });
  });

  it("searches and filters; hidden listings stay out", async () => {
    const all = await request(app).get(`/listings?q=giga${run}`);
    expect(all.body.total).toBe(1);
    expect((await request(app).get(`/listings?q=giga${run}&brand=isuzu&category=dump-trucks&minPrice=2000000&maxPrice=3000000&spec_transmission=Manual`)).body.total).toBe(1);
    expect((await request(app).get(`/listings?spec_transmission=Automatic&q=giga${run}`)).body.total).toBe(0);
    expect((await request(app).get(`/listings?province=Zambales&q=giga${run}`)).body.total).toBe(1);
    const home = await request(app).get("/home");
    expect(home.status).toBe(200);
    expect(home.body.trendingBrands.some((b: any) => b.slug === "isuzu")).toBe(true);
  });

  it("detail counts views, favorites work", async () => {
    const d = await request(app).get(`/listings/${listingId}`);
    expect(d.status).toBe(200);
    expect(d.body.seller.email).toBeUndefined();
    expect((await buyer.post(`/favorites/${listingId}`)).status).toBe(201);
    expect((await buyer.get("/favorites")).body).toHaveLength(1);
    expect((await buyer.get(`/listings/${listingId}`)).body.favorited).toBe(true);
    const mine = await dealer.get("/listings/mine");
    expect(mine.body[0].views).toBeGreaterThanOrEqual(2);
  });

  it("chat + availability request + notification", async () => {
    const av = await buyer.post(`/listings/${listingId}/availability-request`);
    expect(av.status).toBe(200);
    convoId = av.body.conversationId;
    expect((await dealer.get("/auth/me")).body.unreadMessages).toBe(1);
    expect((await dealer.get("/notifications")).body[0].type).toBe("availability_request");
    expect((await buyer.post(`/conversations/${convoId}/messages`).send({ body: "Hi, can I inspect it?" })).status).toBe(201);
    const thread = await dealer.get(`/conversations/${convoId}`);
    expect(thread.body.messages).toHaveLength(2);
    expect((await agent().get(`/conversations/${convoId}`)).status).toBe(401);
    expect((await indiv.get(`/conversations/${convoId}`)).status).toBe(404);
    // seller marks reserved -> buyer who asked gets update
    expect((await dealer.patch(`/listings/${listingId}/status`).send({ status: "RESERVED" })).status).toBe(200);
    const bn = (await buyer.get("/notifications")).body;
    expect(bn.some((n: any) => n.type === "availability")).toBe(true);
    await dealer.post(`/listings/${listingId}/confirm-available`);
  });

  it("offers: make, counter, accept", async () => {
    const o1 = await buyer.post(`/conversations/${convoId}/offers`).send({ amount: 2000000 });
    expect(o1.status).toBe(201);
    expect((await buyer.post(`/conversations/${convoId}/offers`).send({ amount: 2100000 })).status).toBe(409);
    expect((await buyer.post(`/offers/${o1.body.id}/respond`).send({ action: "ACCEPT" })).status).toBe(403);
    const counter = await dealer.post(`/offers/${o1.body.id}/respond`).send({ action: "COUNTER", amount: 2300000 });
    expect(counter.status).toBe(200);
    expect(counter.body.fromSeller).toBe(true);
    expect((await dealer.post(`/offers/${counter.body.id}/respond`).send({ action: "ACCEPT" })).status).toBe(403);
    const acc = await buyer.post(`/offers/${counter.body.id}/respond`).send({ action: "ACCEPT" });
    expect(acc.body.status).toBe("ACCEPTED");
    expect((await buyer.post(`/offers/${counter.body.id}/respond`).send({ action: "REJECT" })).status).toBe(409);
    const thread = (await buyer.get(`/conversations/${convoId}`)).body;
    expect(thread.offers.map((o: any) => o.status)).toEqual(["COUNTERED", "ACCEPTED"]);
    // accepting does not sell the truck
    expect((await request(app).get(`/listings/${listingId}`)).body.status).toBe("AVAILABLE");
  });

  it("admin: verify dealer, feature, moderate, report, suspend", async () => {
    expect((await dealer.patch(`/admin/dealerships/${dealerId}/verify`).send({ verified: true })).status).toBe(403);
    expect((await admin.patch(`/admin/dealerships/${dealerId}/verify`).send({ verified: true })).body.verified).toBe(true);
    expect((await request(app).get(`/dealerships/subic-truck-hub-${run}`)).body.verified).toBe(true);
    expect((await admin.patch(`/admin/listings/${listingId}`).send({ featured: true, days: 7 })).status).toBe(200);
    expect((await request(app).get("/home")).body.featuredTrucks.some((t: any) => t.id === listingId)).toBe(true);
    expect((await buyer.post(`/listings/${listingId}/report`).send({ reason: "Suspicious" })).status).toBe(201);
    const reports = await admin.get("/admin/reports");
    const mine = reports.body.find((r: any) => r.listing.id === listingId);
    expect(mine).toBeTruthy();
    await admin.patch(`/admin/reports/${mine.id}`).send({ status: "RESOLVED", hideListing: true });
    expect((await request(app).get(`/listings/${listingId}`)).status).toBe(404);
    expect((await request(app).get(`/listings?q=giga${run}`)).body.total).toBe(0);
    expect((await admin.get("/admin/stats")).body.users).toBeGreaterThan(3);
    const users = await admin.get("/admin/users?q=buyer." + run);
    await admin.patch(`/admin/users/${users.body.items[0].id}`).send({ suspended: true });
    expect((await buyer.get("/auth/me")).body).toBeNull();
  });

  it("password reset is single use", async () => {
    const { signReset } = await import("../src/lib/jwt");
    const u = await prisma.user.findUniqueOrThrow({ where: { email: email("indiv") } });
    const t = signReset(u.id, u.passwordHash.slice(-10));
    expect((await request(app).post("/auth/reset").send({ token: t, password: "newpassword1" })).status).toBe(200);
    expect((await request(app).post("/auth/reset").send({ token: t, password: "another12345" })).status).toBe(400);
    expect((await request(app).post("/auth/login").send({ email: email("indiv"), password: "newpassword1" })).status).toBe(200);
  });
});
