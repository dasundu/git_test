"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth";
import type { Role } from "./types";

/** Redirects to /login when logged out (or / when the role isn't allowed). Returns true once access is confirmed. */
export function useRequireAuth(roles?: Role[]) {
  const { me, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const allowed = !!me && (!roles || roles.includes(me.role));
  useEffect(() => {
    if (loading) return;
    if (!me) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (!allowed) router.replace("/");
  }, [loading, me, allowed, router, path]);
  return allowed;
}
