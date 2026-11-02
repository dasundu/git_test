import { HttpError } from "./http";

export interface SpecField {
  key: string;
  label: string;
  type: "number" | "text" | "select";
  unit?: string;
  options?: string[];
  filterable?: boolean;
}

/** Validates + normalises category-specific specs against the category's schema. Unknown keys are dropped. */
export function cleanSpecs(schema: SpecField[], input: Record<string, unknown> | undefined) {
  const out: Record<string, string | number> = {};
  if (!input) return out;
  for (const f of schema) {
    const v = input[f.key];
    if (v === undefined || v === null || v === "") continue;
    if (f.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new HttpError(400, `${f.label} must be a number`);
      out[f.key] = n;
    } else if (f.type === "select") {
      if (!f.options?.includes(String(v))) throw new HttpError(400, `${f.label} must be one of: ${f.options?.join(", ")}`);
      out[f.key] = String(v);
    } else {
      out[f.key] = String(v).slice(0, 120);
    }
  }
  return out;
}
