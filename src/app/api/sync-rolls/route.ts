import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * POST /api/sync-rolls
 * Digunakan oleh Service Worker (Background Sync) dan useSyncManager
 * untuk menyinkronkan roll yang tersimpan di IndexedDB ke Turso.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rolls: Array<{
      id: string;
      roll_code: string;
      weight_kg: number;
      operator_code: string;
      machine_number: number;
      session_id: string;
    }> = body.rolls;

    if (!rolls || !Array.isArray(rolls) || rolls.length === 0) {
      return NextResponse.json({ success: false, error: "No rolls provided" }, { status: 400 });
    }

    const db = getDb();
    const syncedIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const roll of rolls) {
      try {
        // Check apakah roll sudah ada (duplikat prevention: by id or by roll_code)
        const existing = await db.execute({
          sql: `SELECT id FROM rolls WHERE id = ? OR roll_code = ?`,
          args: [roll.id, roll.roll_code],
        });

        if (existing.rows.length > 0) {
          // Sudah ada, skip tapi tetap anggap sukses (agar dihapus dari IndexedDB)
          syncedIds.push(roll.id);
          continue;
        }

        // 1. LATE SYNC PROTECTION: Periksa apakah session_id masih OPEN
        const sessionRes = await db.execute({
          sql: `SELECT status FROM shift_sessions WHERE id = ?`,
          args: [roll.session_id],
        });

        if (sessionRes.rows.length === 0 || sessionRes.rows[0].status !== "OPEN") {
          console.warn(
            `[SyncRolls] Late sync rejected: Roll ${roll.roll_code} (${roll.weight_kg} kg). Sesi ${roll.session_id} sudah DITUTUP. Roll dibuang agar tidak menjadi roll hantu.`
          );
          // Tetap tandai syncedIds agar dihapus dari IndexedDB klien sehingga tidak loop sync
          syncedIds.push(roll.id);
          continue;
        }

        // 2. COOLDOWN LOCK PROTECTION: Cegah double sync kembar dalam 90 detik
        const cooldownCheck = await db.execute({
          sql: `SELECT id, roll_code FROM rolls 
                WHERE session_id = ? 
                  AND machine_number = ? 
                  AND ABS(weight_kg - ?) < 0.05 
                  AND (strftime('%s', 'now') - strftime('%s', created_at)) < 90
                LIMIT 1`,
          args: [roll.session_id, roll.machine_number, roll.weight_kg],
        });

        if (cooldownCheck.rows.length > 0) {
          console.warn(
            `[SyncRolls] Cooldown lock rejected: Roll kembar ${roll.roll_code} pada mesin ${roll.machine_number} diabaikan.`
          );
          syncedIds.push(roll.id);
          continue;
        }

        // BATCH: Insert roll + update stok (sama dengan submitRoll server action)
        await db.batch([
          {
            sql: `INSERT INTO rolls (id, roll_code, weight_kg, operator_code, machine_number, session_id, status)
                  VALUES (?, ?, ?, ?, ?, ?, 'IN_STOCK')`,
            args: [roll.id, roll.roll_code, roll.weight_kg, roll.operator_code, roll.machine_number, roll.session_id],
          },
          {
            sql: `UPDATE system_stats SET current_stock_kg = current_stock_kg + ? WHERE id = 1`,
            args: [roll.weight_kg],
          },
        ]);

        syncedIds.push(roll.id);
      } catch (err: any) {
        errors.push({ id: roll.id, error: err.message });
      }
    }

    // Revalidate jika ada yang tersinkronisasi
    if (syncedIds.length > 0) {
      revalidatePath("/");
      revalidatePath("/shift");
    }

    return NextResponse.json({ success: true, syncedIds, errors });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
