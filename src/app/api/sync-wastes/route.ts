import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/sync-wastes
 * Digunakan oleh Service Worker (Background Sync) dan useSyncManager
 * untuk menyinkronkan waste yang tersimpan di IndexedDB ke Turso.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const wastes: Array<{
      id: string;
      session_id: string;
      machine_number: number;
      afalan_kg: number;
      prongkalan_kg: number;
    }> = body.wastes;

    if (!wastes || !Array.isArray(wastes) || wastes.length === 0) {
      return NextResponse.json({ success: false, error: "No wastes provided" }, { status: 400 });
    }

    const db = getDb();
    const syncedIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const waste of wastes) {
      try {
        // Check if waste entry already exists for this machine & shift
        const check = await db.execute({
          sql: `SELECT id FROM machine_wastes WHERE session_id = ? AND machine_number = ?`,
          args: [waste.session_id, waste.machine_number],
        });

        if (check.rows.length > 0) {
          // Update existing
          await db.execute({
            sql: `UPDATE machine_wastes SET afalan_kg = ?, prongkalan_kg = ? WHERE id = ?`,
            args: [waste.afalan_kg, waste.prongkalan_kg, check.rows[0].id],
          });
        } else {
          // Insert new
          await db.execute({
            sql: `INSERT INTO machine_wastes (id, session_id, machine_number, afalan_kg, prongkalan_kg)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [uuidv4(), waste.session_id, waste.machine_number, waste.afalan_kg, waste.prongkalan_kg],
          });
        }

        syncedIds.push(waste.id);
      } catch (err: any) {
        errors.push({ id: waste.id, error: err.message });
      }
    }

    return NextResponse.json({ success: true, syncedIds, errors });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
