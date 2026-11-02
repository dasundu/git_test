"use client";
import { createContext, useContext, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "./api";
import { useAuth } from "./auth";

const Ctx = createContext<{ socket: () => Socket | null }>({ socket: () => null });

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { me, refresh } = useAuth();
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    if (!me?.id) return;
    let dead = false;
    (async () => {
      try {
        const { token } = await api<{ token: string }>("/auth/socket-token");
        if (dead) return;
        const s = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", { auth: { token }, transports: ["websocket", "polling"] });
        // Tokens are short-lived; fetch a fresh one on every reconnect.
        s.io.on("reconnect_attempt", async () => {
          try { s.auth = { token: (await api<{ token: string }>("/auth/socket-token")).token }; } catch {}
        });
        s.on("notification:new", () => refresh());
        s.on("message:new", () => refresh());
        ref.current = s;
      } catch {}
    })();
    return () => { dead = true; ref.current?.disconnect(); ref.current = null; };
  }, [me?.id, refresh]);

  return <Ctx.Provider value={{ socket: () => ref.current }}>{children}</Ctx.Provider>;
}

/** Subscribe to a socket event; re-subscribes if the socket connects after mount. */
export function useSocketEvent<T = any>(event: string, handler: (payload: T) => void) {
  const { socket } = useContext(Ctx);
  const { me } = useAuth();
  const h = useRef(handler);
  h.current = handler;
  useEffect(() => {
    if (!me?.id) return;
    let off: (() => void) | null = null;
    const attach = () => {
      const s = socket();
      if (!s) return false;
      const fn = (p: T) => h.current(p);
      s.on(event, fn);
      off = () => s.off(event, fn);
      return true;
    };
    let timer: ReturnType<typeof setInterval> | null = null;
    if (!attach()) timer = setInterval(() => { if (attach() && timer) clearInterval(timer); }, 400);
    return () => { if (timer) clearInterval(timer); off?.(); };
  }, [event, me?.id, socket]);
}
