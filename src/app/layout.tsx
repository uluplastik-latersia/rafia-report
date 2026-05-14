import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "STOK RAFIA UPL",
  description: "Aplikasi PWA Manajemen Produksi & Stok Rafia",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stok Rafia",
  },
  formatDetection: {
    telephone: false,
  },
};

import { PwaRegister } from "./PwaRegister";
import Link from "next/link";
import { Home } from "lucide-react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} min-h-screen bg-background text-foreground pb-20`}>
        <PwaRegister />
        {/* APP BAR (Header) */}
        <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-50 print:hidden">
          <div className="w-full max-w-md lg:max-w-[95%] xl:max-w-[1800px] mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-wide">📦 Rafia UPL</h1>
            <div className="flex items-center gap-3">
              <Link href="/" className="bg-white/20 p-2 rounded-full hover:bg-white/30 active:scale-95 transition-all text-white">
                <Home className="w-4 h-4" />
              </Link>
              <div className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                <span className="font-semibold">V 1.0</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="w-full max-w-md lg:max-w-[95%] xl:max-w-[1800px] mx-auto p-4 lg:p-8 print:max-w-none print:w-full print:p-0">
          {children}
        </main>
      </body>
    </html>
  );
}
