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
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
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
import { AppHeader } from "./AppHeader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} min-h-screen bg-background text-foreground pb-20`}>
        <PwaRegister />
        {/* APP BAR (Header) - Sembunyi otomatis saat di sub-PWA /mesin */}
        <AppHeader />

        {/* MAIN CONTENT AREA */}
        <main className="w-full max-w-md lg:max-w-[95%] xl:max-w-[1800px] mx-auto p-4 lg:p-8 print:max-w-none print:w-full print:p-0">
          {children}
        </main>
      </body>
    </html>
  );
}
