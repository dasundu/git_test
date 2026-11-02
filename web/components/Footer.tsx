import Link from "next/link";
const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "TruckMarket PH";
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {SITE}. A marketplace for used &amp; Japan-surplus trucks and heavy equipment in the Philippines.</p>
        <nav className="flex gap-4">
          <Link href="/terms" className="hover:text-stone-900">Terms</Link>
          <Link href="/privacy" className="hover:text-stone-900">Privacy</Link>
          <Link href="/safety" className="hover:text-stone-900">Buying safely</Link>
          <Link href="/register" className="hover:text-stone-900">Sell with us</Link>
        </nav>
      </div>
    </footer>
  );
}
