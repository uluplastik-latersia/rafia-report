import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    name: "Monitor Rafia",
    short_name: "Monitor Rafia",
    description: "Pantauan hasil produksi per mesin dan insight per shift",
    start_url: "/mesin",
    scope: "/mesin",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f59e0b", // Amber/Gold theme untuk membedakan dengan Main App (Teal)
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
