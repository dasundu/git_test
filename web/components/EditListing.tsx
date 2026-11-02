"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { Listing } from "@/lib/types";
import ListingForm from "./ListingForm";
import { Spinner } from "./ui";

export default function EditListing({ id }: { id: string }) {
  const ready = useRequireAuth(["SELLER", "DEALER", "ADMIN"]);
  const [l, setL] = useState<Listing | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (ready) api<Listing>(`/listings/${id}`).then(setL).catch((e) => setErr(e.message)); }, [ready, id]);
  if (err) return <p className="card mx-auto max-w-md p-8 text-center">{err}</p>;
  if (!ready || !l) return <Spinner />;
  return <ListingForm existing={l} />;
}
