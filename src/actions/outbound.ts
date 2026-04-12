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
    `SELECT id, roll_code, weight_kg, machine_number, operator_code, created_at
     FROM rolls
     WHERE status = 'IN_STOCK'
     ORDER BY created_at DESC`
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
  // Jalankan satu per satu agar kompatibel dengan semua versi libSQL
  const fetchedRolls: { id: string; weight_kg: number; status: string }[] = [];
  for (const id of rollIds) {
    const res = await db.execute({
      sql: `SELECT id, weight_kg, status FROM rolls WHERE id = ?`,
      args: [id],
    });
    if (res.rows[0]) {
      fetchedRolls.push(JSON.parse(JSON.stringify(res.rows[0])));
    }
  }

  // Validasi: semua harus IN_STOCK
  for (const r of fetchedRolls) {
    if (r.status !== "IN_STOCK") {
      throw new Error(`Roll ${r.id} sudah terjual atau tidak valid!`);
    }
  }

  const totalWeightKg = fetchedRolls.reduce((acc, r) => acc + r.weight_kg, 0);
  const totalRolls = fetchedRolls.length;

  const saleId = uuidv4();

  // 1. Insert header surat jalan
  await db.execute({
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

  // 2. Insert sale_items satu per satu
  for (const rollId of rollIds) {
    await db.execute({
      sql: `INSERT INTO sale_items (sale_id, roll_id) VALUES (?, ?)`,
      args: [saleId, rollId],
    });
  }

  // 3. Update status setiap roll menjadi SOLD satu per satu
  for (const rollId of rollIds) {
    await db.execute({
      sql: `UPDATE rolls SET status = 'SOLD' WHERE id = ?`,
      args: [rollId],
    });
  }

  // 4. Kurangi stok global real-time
  await db.execute({
    sql: `UPDATE system_stats SET current_stock_kg = current_stock_kg - ? WHERE id = 1`,
    args: [totalWeightKg],
  });

  revalidatePath("/");
  revalidatePath("/outbound");

  return { success: true, saleId };
}
