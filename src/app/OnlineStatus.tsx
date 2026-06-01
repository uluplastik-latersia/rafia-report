"use client";

import { useState, useEffect } from "react";
import { getPendingCount } from "@/lib/offlineDb";

/**
 * OnlineStatus — Badge Online/Offline + Pending Sync Count
 * Ditempatkan di header layout.tsx
 */
export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const refreshCount = async () => {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch { /* IndexedDB belum tersedia */ }
    };

    refreshCount();

    const handleOnline = () => { setIsOnline(true); refreshCount(); };
    const handleOffline = () => { setIsOnline(false); };

    // Listen for sync completion from SW
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        refreshCount();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    // Poll pending count setiap 5 detik (untuk update saat ShiftClient menyimpan offline)
    const interval = setInterval(refreshCount, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {/* Online/Offline dot */}
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          isOnline ? "bg-emerald-400" : "bg-red-500 animate-pulse-slow"
        }`}
        title={isOnline ? "Online" : "Offline"}
      />
      <span className="text-[10px] font-semibold opacity-90">
        {isOnline ? "Online" : "Offline"}
      </span>

      {/* Pending sync badge */}
      {pendingCount > 0 && (
        <span
          className="ml-0.5 bg-amber-400 text-amber-900 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-pulse-slow"
          title={`${pendingCount} data menunggu sinkronisasi`}
        >
          {pendingCount}
        </span>
      )}
    </div>
  );
}
