export const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
export const km = (n: number) => `${n.toLocaleString("en-PH")} km`;
export const conditionLabel = (c: string) => ({ USED: "Used", JAPAN_SURPLUS: "Japan Surplus", REPAIRED: "Repaired" } as Record<string, string>)[c] ?? c;

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export const PROVINCES = [
  "Zambales", "Pampanga", "Bataan", "Tarlac", "Bulacan", "Nueva Ecija", "Pangasinan", "Cavite", "Laguna", "Rizal",
  "Metro Manila", "Batangas", "Cebu", "Davao del Sur",
];
