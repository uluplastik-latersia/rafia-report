import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#f59e0b", // Amber 500 theme
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Monitor Rafia",
  description: "Pantauan Hasil Produksi Mesin & Insight Per Shift Rafia UPL",
  manifest: "/mesin/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Monitor Rafia",
  },
};

export default function MesinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mt-4 lg:-mt-8 -mx-4 lg:-mx-8">
      {/* Explicit PWA Head Tags untuk browser mobile (Chrome Android & iOS Safari) */}
      <link rel="manifest" href="/mesin/manifest.json" />
      <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
      <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      <meta name="apple-mobile-web-app-title" content="Monitor Rafia" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="theme-color" content="#f59e0b" />

      {/* Khusus di /mesin, kita beri container tersendiri yang clean & modern */}
      {children}
    </div>
  );
}
