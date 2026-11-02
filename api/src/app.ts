import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { config } from "./config";
import { HttpError } from "./lib/http";
import { loadUser } from "./middleware/auth";
import { UPLOAD_DIR } from "./lib/upload";
import { authRouter } from "./routes/auth";
import { listingsRouter } from "./routes/listings";
import { catalogRouter } from "./routes/catalog";
import { dealershipsRouter } from "./routes/dealerships";
import { conversationsRouter, offersRouter } from "./routes/conversations";
import { favoritesRouter, notificationsRouter, pushRouter, uploadsRouter } from "./routes/misc";
import { adminRouter } from "./routes/admin";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: config.webUrl, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "30d", immutable: true }));

  const limiter = (windowMs: number, max: number) =>
    rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test" });
  app.use("/auth/login", limiter(15 * 60_000, 30));
  app.use("/auth/register", limiter(60 * 60_000, 20));
  app.use("/auth/forgot", limiter(60 * 60_000, 10));
  app.use(limiter(60_000, 300));

  app.use(loadUser);
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/auth", authRouter);
  app.use("/listings", listingsRouter);
  app.use("/", catalogRouter);
  app.use("/dealerships", dealershipsRouter);
  app.use("/conversations", conversationsRouter);
  app.use("/offers", offersRouter);
  app.use("/favorites", favoritesRouter);
  app.use("/notifications", notificationsRouter);
  app.use("/push", pushRouter);
  app.use("/uploads-api", uploadsRouter);
  app.use("/admin", adminRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid input", issues: err.issues });
    }
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ error: "Not found" });
    }
    if ((err as any)?.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File too large (max 12MB)" });
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  });
  return app;
}
