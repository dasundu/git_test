export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Browser-side API client. Requests go to /api/* which Next proxies to the Node API. */
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
    credentials: "include",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || "Something went wrong");
  return data as T;
}

export const SERVER_API = process.env.API_URL || "http://localhost:4000";

/** Server-component fetch (no auth, never cached). Returns null on 404. */
export async function serverGet<T = any>(path: string): Promise<T | null> {
  const res = await fetch(`${SERVER_API}${path}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}
