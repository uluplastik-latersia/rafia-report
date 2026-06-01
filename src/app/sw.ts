import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ==================== BACKGROUND SYNC ====================
// IndexedDB helper langsung di SW context (tanpa import external)

const DB_NAME = "rafia-offline-queue";
const DB_VERSION = 1;

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pendingRolls")) {
        db.createObjectStore("pendingRolls", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pendingWastes")) {
        db.createObjectStore("pendingWastes", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(storeName: string): Promise<any[]> {
  return openOfflineDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => { db.close(); resolve(req.result); };
        req.onerror = () => { db.close(); reject(req.error); };
      })
  );
}

function deleteFromStore(storeName: string, id: string): Promise<void> {
  return openOfflineDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      })
  );
}

// Sync rolls dari IndexedDB ke server
async function syncPendingRolls() {
  const pendingRolls = await getAllFromStore("pendingRolls");
  if (pendingRolls.length === 0) return;

  const response = await fetch("/api/sync-rolls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rolls: pendingRolls }),
  });

  if (response.ok) {
    const result = await response.json();
    // Hapus yang sudah berhasil disinkronisasi dari IndexedDB
    for (const id of result.syncedIds || []) {
      await deleteFromStore("pendingRolls", id);
    }
    // Beri tahu semua client bahwa sync selesai
    const clients = await self.clients.matchAll({ type: "window" });
    for (const client of clients) {
      client.postMessage({ type: "SYNC_COMPLETE", store: "rolls", syncedIds: result.syncedIds });
    }
  }
}

// Sync wastes dari IndexedDB ke server
async function syncPendingWastes() {
  const pendingWastes = await getAllFromStore("pendingWastes");
  if (pendingWastes.length === 0) return;

  const response = await fetch("/api/sync-wastes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wastes: pendingWastes }),
  });

  if (response.ok) {
    const result = await response.json();
    for (const id of result.syncedIds || []) {
      await deleteFromStore("pendingWastes", id);
    }
    const clients = await self.clients.matchAll({ type: "window" });
    for (const client of clients) {
      client.postMessage({ type: "SYNC_COMPLETE", store: "wastes", syncedIds: result.syncedIds });
    }
  }
}

// Listen for Background Sync events
self.addEventListener("sync", (event: any) => {
  if (event.tag === "sync-rolls") {
    event.waitUntil(syncPendingRolls());
  } else if (event.tag === "sync-wastes") {
    event.waitUntil(syncPendingWastes());
  }
});
