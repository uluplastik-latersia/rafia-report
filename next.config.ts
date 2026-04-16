import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // allowedDevOrigins was removed since it triggers TS type errors in Next 15+ builds on Vercel
  },
  async headers() {
    return [
      {
        // Terapkan ke semua route
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY", // Mencegah clickjacking (iframe embedding)
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Mencegah MIME-type sniffing
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", // Membatasi info referrer ke pihak ketiga
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block", // Aktifkan XSS filter bawaan browser
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()", // Blokir akses hardware yang tidak dibutuhkan
          },
        ],
      },
    ];
  },
};

export default nextConfig;
