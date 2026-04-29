"use server";

import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

// -------------------------------------------------------
// QUERIES
// -------------------------------------------------------

/** Ambil semua roll yang masih tersedia (IN_STOCK) */
export async function getInStockRolls() {
  const res = await db.execute(
    `SELECT id, roll_code, weight_kg, machine_number, operator_code, session_id, created_at
     FROM rolls
     WHERE status = 'IN_STOCK'
     ORDER BY created_at DESC`
  );
  return res.rows.map((r) => JSON.parse(JSON.stringify(r)));
}

/** Ambil daftar shift yang masih punya roll IN_STOCK (untuk fitur pilih cepat per shift) */
export async function getClosedShiftsWithStock() {
  const res = await db.execute(
    `SELECT 
       s.id, s.shift_number, s.date_opened, s.admin_name,
       COUNT(r.id) as available_rolls,
       SUM(r.weight_kg) as available_weight_kg
     FROM shift_sessions s
     INNER JOIN rolls r ON r.session_id = s.id AND r.status = 'IN_STOCK'
     WHERE s.status = 'CLOSED'
     GROUP BY s.id
     ORDER BY s.date_opened DESC`
  );
  return res.rows.map((r) => JSON.parse(JSON.stringify(r)));
}

/** Cari satu roll berdasarkan kode (untuk pencarian manual) */
export async function findRollByCode(code: string) {
  const res = await db.execute({
    sql: `SELECT id, roll_code, weight_kg, machine_number, operator_code, status
          FROM rolls
          WHERE roll_code = ?`,
    args: [code.trim().toUpperCase()],
  });
  if (!res.rows[0]) return null;
  return JSON.parse(JSON.stringify(res.rows[0]));
}

/** Ambil semua riwayat surat jalan, terbaru di atas */
export async function getSales() {
  const res = await db.execute(
    `SELECT id, pic_name, buyer_name, nopol, sale_datetime, total_weight_kg, total_rolls
     FROM sales
     ORDER BY sale_datetime DESC`
  );
  return res.rows.map((r) => JSON.parse(JSON.stringify(r)));
}

/** Ambil detail satu surat jalan beserta daftar roll-nya */
export async function getSaleDetail(saleId: string) {
  const saleRes = await db.execute({
    sql: `SELECT id, pic_name, buyer_name, nopol, sale_datetime, total_weight_kg, total_rolls
          FROM sales WHERE id = ?`,
    args: [saleId],
  });
  if (!saleRes.rows[0]) return null;
  const sale = JSON.parse(JSON.stringify(saleRes.rows[0]));

  const itemsRes = await db.execute({
    sql: `SELECT r.id, r.roll_code, r.weight_kg, r.machine_number, r.operator_code
          FROM sale_items si
          JOIN rolls r ON si.roll_id = r.id
          WHERE si.sale_id = ?
          ORDER BY r.machine_number ASC, r.roll_code ASC`,
    args: [saleId],
  });
  const items = itemsRes.rows.map((r) => JSON.parse(JSON.stringify(r)));

  return { sale, items };
}

// -------------------------------------------------------
// MUTATIONS
// -------------------------------------------------------

export async function createSale(data: {
  pic_name: string;
  buyer_name: string;
  nopol: string;
  rollIds: string[]; // array of roll IDs
}) {
  // Pastikan rollIds adalah array string biasa (bukan array-like object dari serialisasi)
  const rollIds: string[] = Array.from(data.rollIds || []).map(String);

  if (rollIds.length === 0) {
    throw new Error("Tidak ada roll yang dipilih untuk surat jalan ini.");
  }
  if (!data.pic_name.trim() || !data.buyer_name.trim()) {
    throw new Error("Nama PIC dan Nama Pembeli wajib diisi.");
  }

  // Ambil data lengkap roll yang dipilih untuk validasi & kalkulasi
  if (rollIds.length === 0) return { success: false };

  // Fetch semua rolls secara sekaligus (1 query HTTP)
  const placeHolders = rollIds.map(() => "?").join(",");
  const fetchRes = await db.execute({
    sql: `SELECT id, weight_kg, status FROM rolls WHERE id IN (${placeHolders})`,
    args: rollIds,
  });
  
  const fetchedRolls = fetchRes.rows.map((r) => JSON.parse(JSON.stringify(r)));

  // Validasi: semua harus IN_STOCK
  for (const r of fetchedRolls) {
    if (r.status !== "IN_STOCK") {
      throw new Error(`Roll ${r.id} sudah terjual atau tidak valid!`);
    }
  }

  const totalWeightKg = fetchedRolls.reduce((acc, r) => acc + r.weight_kg, 0);
  const totalRolls = fetchedRolls.length;

  const saleId = uuidv4();

  // BATCH TRANSAKSI (Sangat Cepat! Menyatukan puluhuan query jadi 1 request Vercel -> Turso)
  const batchStatements = [];

  // 1. Insert header surat jalan
  batchStatements.push({
    sql: `INSERT INTO sales (id, pic_name, buyer_name, nopol, total_weight_kg, total_rolls)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      saleId,
      data.pic_name.trim(),
      data.buyer_name.trim(),
      data.nopol.trim(),
      totalWeightKg,
      totalRolls,
    ],
  });

  // 2. Insert sale_items satu per satu ke dalam batch
  for (const rollId of rollIds) {
    batchStatements.push({
      sql: `INSERT INTO sale_items (sale_id, roll_id) VALUES (?, ?)`,
      args: [saleId, rollId],
    });
    // 3. Update status roll ke SOLD di batch yg sama
    batchStatements.push({
      sql: `UPDATE rolls SET status = 'SOLD' WHERE id = ?`,
      args: [rollId],
    });
  }

  // 4. Kurangi stok global real-time
  batchStatements.push({
    sql: `UPDATE system_stats SET current_stock_kg = current_stock_kg - ? WHERE id = 1`,
    args: [totalWeightKg],
  });

  // Jalankan tembakan Batch
  await db.batch(batchStatements);

  revalidatePath("/");
  revalidatePath("/outbound");

  return { success: true, saleId };
}
