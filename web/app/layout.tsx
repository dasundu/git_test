import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "TruckMarket PH";

export const metadata: Metadata = {
  title: { default: `${SITE} — Used & Japan-surplus trucks in the Philippines`, template: `%s | ${SITE}` },
  description: "Buy and sell used, Japan-surplus and secondhand commercial trucks and heavy equipment in the Philippines. Chat with sellers and make offers directly.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#d97706" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
