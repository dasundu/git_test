"use client";
import { AuthProvider } from "@/lib/auth";
import { RealtimeProvider } from "@/lib/realtime";
export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><RealtimeProvider>{children}</RealtimeProvider></AuthProvider>;
}
