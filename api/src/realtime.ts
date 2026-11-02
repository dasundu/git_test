import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { config } from "./config";
import { verify } from "./lib/jwt";

let io: Server | null = null;

export function initRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: config.webUrl, credentials: true } });
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const p = token ? verify(token, "socket") : null;
    if (!p) return next(new Error("unauthorized"));
    socket.data.userId = p.sub;
    next();
  });
  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function isOnline(userId: string) {
  const room = io?.sockets.adapter.rooms.get(`user:${userId}`);
  return !!room && room.size > 0;
}
