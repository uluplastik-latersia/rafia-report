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
      {/* Khusus di /mesin, kita beri container tersendiri yang clean & modern */}
      {children}
    </div>
  );
}
