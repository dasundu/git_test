import jwt from "jsonwebtoken";
import { config } from "../config";

export interface TokenPayload {
  sub: string;
  role: string;
  kind: "session" | "socket";
}

export function signSession(userId: string, role: string) {
  return jwt.sign({ sub: userId, role, kind: "session" } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: "30d",
  });
}

export function signSocket(userId: string, role: string) {
  return jwt.sign({ sub: userId, role, kind: "socket" } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: "10m",
  });
}

export function verify(token: string, kind: "session" | "socket"): TokenPayload | null {
  try {
    const p = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return p.kind === kind ? p : null;
  } catch {
    return null;
  }
}

export function signReset(userId: string, hashFragment: string) {
  return jwt.sign({ sub: userId, h: hashFragment, kind: "reset" }, config.jwtSecret, { expiresIn: "1h" });
}

export function verifyReset(token: string): { sub: string; h: string } | null {
  try {
    const p = jwt.verify(token, config.jwtSecret) as any;
    return p.kind === "reset" ? { sub: p.sub, h: p.h } : null;
  } catch {
    return null;
  }
}
