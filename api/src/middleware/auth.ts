import { NextFunction, Request, Response } from "express";
import { Role, User } from "@prisma/client";
import { prisma } from "../db";
import { verify } from "../lib/jwt";
import { HttpError } from "../lib/http";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

function tokenFrom(req: Request) {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return req.cookies?.token as string | undefined;
}

export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const t = tokenFrom(req);
    const p = t ? verify(t, "session") : null;
    if (p) {
      const user = await prisma.user.findUnique({ where: { id: p.sub } });
      if (user && !user.suspended) req.user = user;
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Please log in"));
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Please log in"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "Not allowed"));
    next();
  };

export const requireSeller = requireRole("SELLER", "DEALER", "ADMIN");
export const requireAdmin = requireRole("ADMIN");
