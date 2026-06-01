"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getPendingRolls,
  getPendingWastes,
  removePendingRoll,
  removePendingWaste,
  getPendingCount,
  type PendingRoll,
} from "@/lib/offlineDb";

/**
 * useSyncManager — Custom hook untuk mengelola sinkronisasi offline
 * 
 * Fitur:
 * - Mendeteksi status online/offline
 * - Auto-sync saat kembali online (fallback untuk Safari yang tidak support Background Sync)
 * - Menyediakan pending count untuk badge
 * - Mendengarkan pesan dari Service Worker saat Background Sync selesai
 */
export function useSyncManager() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncEvent, setLastSyncEvent] = useState<number>(0);
  const syncingRef = useRef(false);

  // Refresh pending count dari IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB mungkin belum tersedia
    }
  }, []);

  // Sinkronisasi manual (dipanggil saat kembali online)
  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      // === SYNC ROLLS ===
      const pendingRolls = await getPendingRolls();
      if (pendingRolls.length > 0) {
        const res = await fetch("/api/sync-rolls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rolls: pendingRolls }),
        });
        if (res.ok) {
          const result = await res.json();
          for (const id of result.syncedIds || []) {
            await removePendingRoll(id);
          }
        }
      }

      // === SYNC WASTES ===
      const pendingWastes = await getPendingWastes();
      if (pendingWastes.length > 0) {
        const res = await fetch("/api/sync-wastes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wastes: pendingWastes }),
        });
        if (res.ok) {
          const result = await res.json();
          for (const id of result.syncedIds || []) {
            await removePendingWaste(id);
          }
        }
      }

      setLastSyncEvent(Date.now());
    } catch (err) {
      console.error("[SyncManager] Sync failed:", err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  // Register Background Sync (Chromium only)
  const registerBackgroundSync = useCallback(async (tag: string) => {
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg && "sync" in reg) {
        await (reg as any).sync.register(tag);
      }
    } catch {
      // Background Sync tidak didukung (Safari/Firefox) — fallback ke auto-sync saat online
    }
  }, []);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    // Event handlers
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync saat kembali online (fallback untuk Safari)
      syncNow();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen SW messages (Background Sync completed)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        setLastSyncEvent(Date.now());
        refreshPendingCount();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, [syncNow, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncEvent,
    syncNow,
    refreshPendingCount,
    registerBackgroundSync,
  };
}
