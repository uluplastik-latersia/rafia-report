/**
 * offlineDb.ts — IndexedDB helper untuk PWA Offline Queue
 * Compatible dengan Window dan Service Worker context
 * Tidak menggunakan library eksternal (native IndexedDB API)
 */

const DB_NAME = "rafia-offline-queue";
const DB_VERSION = 1;
const STORE_ROLLS = "pendingRolls";
const STORE_WASTES = "pendingWastes";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ROLLS)) {
        db.createObjectStore(STORE_ROLLS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_WASTES)) {
        db.createObjectStore(STORE_WASTES, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ==================== PENDING ROLLS ====================

export interface PendingRoll {
  id: string;           // UUID generated client-side
  roll_code: string;    // Generated client-side
  weight_kg: number;
  operator_code: string;
  machine_number: number;
  session_id: string;
  created_at: string;   // ISO string
}

export async function addPendingRoll(roll: PendingRoll): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ROLLS, "readwrite");
    tx.objectStore(STORE_ROLLS).add(roll);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getPendingRolls(): Promise<PendingRoll[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ROLLS, "readonly");
    const req = tx.objectStore(STORE_ROLLS).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function removePendingRoll(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ROLLS, "readwrite");
    tx.objectStore(STORE_ROLLS).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearPendingRolls(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ROLLS, "readwrite");
    tx.objectStore(STORE_ROLLS).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ==================== PENDING WASTES ====================

export interface PendingWaste {
  id: string;           // Composite key for dedup
  session_id: string;
  machine_number: number;
  afalan_kg: number;
  prongkalan_kg: number;
  created_at: string;
}

export async function addPendingWaste(waste: PendingWaste): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WASTES, "readwrite");
    // Use put instead of add to overwrite duplicates (same machine in same session)
    tx.objectStore(STORE_WASTES).put(waste);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getPendingWastes(): Promise<PendingWaste[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WASTES, "readonly");
    const req = tx.objectStore(STORE_WASTES).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function removePendingWaste(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WASTES, "readwrite");
    tx.objectStore(STORE_WASTES).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ROLLS, STORE_WASTES], "readonly");
    const rollReq = tx.objectStore(STORE_ROLLS).count();
    const wasteReq = tx.objectStore(STORE_WASTES).count();
    let rollCount = 0;
    let wasteCount = 0;
    rollReq.onsuccess = () => { rollCount = rollReq.result; };
    wasteReq.onsuccess = () => { wasteCount = wasteReq.result; };
    tx.oncomplete = () => { db.close(); resolve(rollCount + wasteCount); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
