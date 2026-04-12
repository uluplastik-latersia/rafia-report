import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'STOK RAFIA UPL',
    short_name: 'Stok Rafia',
    description: 'Aplikasi pencatatan produksi (inbound), manajemen inventaris, dan penjualan (outbound) tali rafia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0d9488', // Teal/Emerald
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
