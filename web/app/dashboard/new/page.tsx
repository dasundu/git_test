"use client";
import ListingForm from "@/components/ListingForm";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Spinner } from "@/components/ui";

export default function NewListing() {
  const ready = useRequireAuth(["SELLER", "DEALER", "ADMIN"]);
  if (!ready) return <Spinner />;
  return <ListingForm />;
}
