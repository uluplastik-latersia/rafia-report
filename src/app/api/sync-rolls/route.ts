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
        // Check apakah roll sudah ada (duplikat prevention)
        const existing = await db.execute({
          sql: `SELECT id FROM rolls WHERE id = ?`,
          args: [roll.id],
        });

        if (existing.rows.length > 0) {
          // Sudah ada, skip tapi tetap anggap sukses (agar dihapus dari IndexedDB)
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
