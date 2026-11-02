import { Suspense } from "react";
import Browse from "@/components/Browse";
import { Spinner } from "@/components/ui";

export const metadata = { title: "Browse trucks & heavy equipment" };

export default function BrowsePage() {
  return <Suspense fallback={<Spinner />}><Browse /></Suspense>;
}
