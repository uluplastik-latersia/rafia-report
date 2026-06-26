/**
 * One-time migration script: Set HR Mesin Juli 2026 starting value to 2994.1 kg
 * 
 * Alasan: User lupa tutup buku Juni 2026, sehingga produksi hari ini
 * (2994.1 kg) terakumulasi di HR bulan lama. Setelah tutup buku dilakukan,
 * HR Juli reset ke 0. Script ini mengoreksi dengan menambahkan 2994.1 kg
 * sebagai starting point Juli 2026.
 * 
 * Jalankan: node scripts/fix-hr-juli.mjs
 */

import { createClient } from "@libsql/client";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function main() {
  // 1. Baca kondisi saat ini
  const before = await db.execute("SELECT current_hr_kg, current_month_year FROM system_stats WHERE id = 1");
  const row = before.rows[0];
  console.log("=== SEBELUM UPDATE ===");
  console.log(`  current_month_year: ${row.current_month_year}`);
  console.log(`  current_hr_kg: ${row.current_hr_kg}`);

  // 2. Update HR Mesin ke 2994.1
  await db.execute({
    sql: `UPDATE system_stats SET current_hr_kg = ? WHERE id = 1`,
    args: [2994.1],
  });

  // 3. Verifikasi
  const after = await db.execute("SELECT current_hr_kg, current_month_year FROM system_stats WHERE id = 1");
  const rowAfter = after.rows[0];
  console.log("\n=== SESUDAH UPDATE ===");
  console.log(`  current_month_year: ${rowAfter.current_month_year}`);
  console.log(`  current_hr_kg: ${rowAfter.current_hr_kg}`);
  console.log("\n✅ HR Mesin Juli 2026 berhasil di-set ke 2994.1 kg");
}

main().catch(console.error);
