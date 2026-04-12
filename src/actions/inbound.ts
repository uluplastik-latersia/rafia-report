"use server";

import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

// Helper: Generate 3 Huruf Random Kapital (Kecuali Vokal agar unik & bebas kata kotor)
function generateRandomLetters(): string {
  const chars = "BCDFGHJKLMNPQRSTVWXYZ";
  let result = "";
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function submitRoll(data: {
  weight_kg: number;
  operator_code: string;
  machine_number: number;
  session_id: string;
}) {
  const rollId = uuidv4();
  
  // Format Kode: [3 Random]-[Weight]-[OpCode]
  const rnd = generateRandomLetters();
  const rawWeight = data.weight_kg;
  const rollCode = `${rnd}-${rawWeight}-${data.operator_code}`;

  // 1. Insert ke tabel rolls
  await db.execute({
    sql: `INSERT INTO rolls (id, roll_code, weight_kg, operator_code, machine_number, session_id, status)
          VALUES (?, ?, ?, ?, ?, ?, 'IN_STOCK')`,
    args: [rollId, rollCode, rawWeight, data.operator_code, data.machine_number, data.session_id],
  });

  // 2. Tambahkan ke stok global statis secara real-time
  await db.execute({
    sql: `UPDATE system_stats SET current_stock_kg = current_stock_kg + ? WHERE id = 1`,
    args: [rawWeight],
  });

  revalidatePath("/");
  revalidatePath("/shift");

  return { success: true, rollCode };
}

export async function deleteRoll(rollId: string, weight_kg: number) {
  // Hanya bisa delete jika status masih IN_STOCK
  const rollCheck = await db.execute({
    sql: `SELECT status FROM rolls WHERE id = ?`,
    args: [rollId]
  });
  
  if (!rollCheck.rows[0] || rollCheck.rows[0].status !== "IN_STOCK") {
    throw new Error("Roll tidak ditemukan atau sudah terjual!");
  }

  // 1. Delete roll
  await db.execute({
    sql: `DELETE FROM rolls WHERE id = ?`,
    args: [rollId],
  });

  // 2. Kurangi stok global (rollback real-time stock)
  await db.execute({
    sql: `UPDATE system_stats SET current_stock_kg = current_stock_kg - ? WHERE id = 1`,
    args: [weight_kg],
  });

  revalidatePath("/");
  revalidatePath("/shift");
  return { success: true };
}

// Menarik daftar operator untuk Dropdown
export async function getOperators() {
  const res = await db.execute("SELECT code, name FROM operators ORDER BY name ASC");
  return res.rows.map(r => JSON.parse(JSON.stringify(r)));
}

// Menarik riwayat input shift hari ini (berdasarkan session)
export async function getSessionRolls(sessionId: string) {
  const res = await db.execute({
    sql: `SELECT id, roll_code, weight_kg, operator_code, machine_number, created_at
          FROM rolls 
          WHERE session_id = ? 
          ORDER BY created_at DESC`,
    args: [sessionId]
  });
  return res.rows.map(r => JSON.parse(JSON.stringify(r)));
}
