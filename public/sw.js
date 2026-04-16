const CACHE_NAME = 'stok-rafia-cache-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Hanya cache asset yang esensial untuk fallback offline awal
      return cache.addAll([
        '/',
        '/manifest.webmanifest',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Bersihkan cache versi lama saat service worker baru aktif
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya proses metode GET untuk caching
  if (event.request.method !== 'GET') return;

  // STRATEGI NETWORK-FIRST
  // Ini diperuntukkan untuk PWA atau App yang memiliki konten sangat dinamis dan
  // meminimalisir freeze Javascript ketika kode berubah (saat development / update).
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Jika koneksi berhasil (Online), salin response yang masuk ke Cache terbaru
        if (networkResponse.ok && event.request.url.startsWith('http')) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika Fetch gagal (Offline / Server Mati), kembalikan dari Cache jika ada
        return caches.match(event.request);
      })
  );
});
