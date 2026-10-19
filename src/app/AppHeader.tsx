"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { OnlineStatus } from "./OnlineStatus";
import pkg from "../../package.json";

export function AppHeader() {
  const pathname = usePathname();

  // Jika sedang membuka sub-PWA /mesin, sembunyikan sepenuhnya Header PWA Utama
  // agar user tidak memiliki navigasi/link ke Home atau modul stok & penjualan.
  if (pathname?.startsWith("/mesin")) {
    return null;
  }

  return (
    <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-50 print:hidden">
      <div className="w-full max-w-md lg:max-w-[95%] xl:max-w-[1800px] mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-wide">📦 Rafia UPL</h1>
        <div className="flex items-center gap-3">
          <OnlineStatus />
          <Link
            href="/"
            className="bg-white/20 p-2 rounded-full hover:bg-white/30 active:scale-95 transition-all text-white"
          >
            <Home className="w-4 h-4" />
          </Link>
          <div className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
            <span className="font-semibold">V {pkg.version}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
