"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function searchRollsAction(query: string) {
  try {
    const likeQuery = `%${query}%`;
    const res = await db.execute({
      sql: `
        SELECT 
          r.id, r.roll_code, r.weight_kg, r.operator_code, r.machine_number, r.status, r.created_at,
          s.date_opened, s.shift_number 
        FROM rolls r
        JOIN shift_sessions s ON r.session_id = s.id
        WHERE r.status = 'IN_STOCK'
          AND (r.roll_code LIKE ? OR r.weight_kg LIKE ? OR r.operator_code LIKE ?)
        ORDER BY r.created_at DESC
        LIMIT 50
      `,
      args: [likeQuery, likeQuery, likeQuery]
    });

    return { success: true, data: res.rows };
  } catch (error: any) {
    console.error("Failed to search rolls:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteRollAction(rollId: string) {
  try {
    // 1. Dapatkan detail roll
    const rollRes = await db.execute({
      sql: `SELECT weight_kg, session_id, status FROM rolls WHERE id = ?`,
      args: [rollId]
    });

    if (rollRes.rows.length === 0) {
      return { success: false, error: "Roll tidak ditemukan." };
    }

    const roll = rollRes.rows[0];
    const weight = Number(roll.weight_kg);
    const sessionId = roll.session_id;

    if (roll.status === "SOLD") {
      return { success: false, error: "Roll sudah terjual (SOLD) dan tidak bisa dihapus." };
    }

    // 2. Jalankan Database Transaction untuk menjaga konsistensi data
    await db.batch([
      {
        sql: `UPDATE shift_sessions SET total_produksi_kg = total_produksi_kg - ?, total_roll_pcs = total_roll_pcs - 1 WHERE id = ?`,
        args: [weight, sessionId]
      },
      {
        sql: `UPDATE system_stats SET current_stock_kg = current_stock_kg - ?, current_hr_kg = current_hr_kg - ? WHERE id = 1`,
        args: [weight, weight]
      },
      {
        sql: `DELETE FROM rolls WHERE id = ?`,
        args: [rollId]
      }
    ]);

    // Revalidate halaman dashboard dan koreksi data
    revalidatePath("/");
    revalidatePath("/koreksi-data");
    revalidatePath("/shift");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete roll:", error);
    return { success: false, error: error.message };
  }
}
