"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Empty, ListingCard, Spinner } from "@/components/ui";
import type { Listing } from "@/lib/types";

export default function Favorites() {
  const ready = useRequireAuth();
  const { me } = useAuth();
  const [items, setItems] = useState<Listing[] | null>(null);
  useEffect(() => { if (me) api<Listing[]>("/favorites").then(setItems); }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready || !items) return <Spinner />;
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Saved trucks</h1>
      {items.length ? <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((l) => <ListingCard key={l.id} l={l} />)}</div> : <Empty title="Nothing saved yet">Tap “Save” on a listing to keep it here.</Empty>}
    </div>
  );
}
