import { db } from "../lib/db";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function migrate() {
  console.log("🚀 Menjalankan migrasi database untuk Laporan Bulanan...");

  try {
    // 1. Tambah kolom total_produksi_kg
    console.log("Menambahkan kolom total_produksi_kg...");
    try {
      await db.execute("ALTER TABLE shift_sessions ADD COLUMN total_produksi_kg REAL DEFAULT 0");
    } catch (e: any) {
      console.log("Kolom total_produksi_kg sudah ada atau gagal:", e.message);
    }

    // 2. Tambah kolom total_roll_pcs
    console.log("Menambahkan kolom total_roll_pcs...");
    try {
      await db.execute("ALTER TABLE shift_sessions ADD COLUMN total_roll_pcs INTEGER DEFAULT 0");
    } catch (e: any) {
      console.log("Kolom total_roll_pcs sudah ada atau gagal:", e.message);
    }

    // 3. Tambah kolom month_year_book
    console.log("Menambahkan kolom month_year_book...");
    try {
      await db.execute("ALTER TABLE shift_sessions ADD COLUMN month_year_book TEXT");
    } catch (e: any) {
      console.log("Kolom month_year_book sudah ada atau gagal:", e.message);
    }

    // 4. Backfill data
    console.log("Memigrasikan data shift_sessions yang lama...");
    const statsResult = await db.execute("SELECT * FROM system_stats WHERE id = 1");
    const currentMonthYear = statsResult.rows[0]?.current_month_year || '4-2026';

    const closedShifts = await db.execute("SELECT id FROM shift_sessions WHERE status = 'CLOSED'");
    
    let updated = 0;
    for (const row of closedShifts.rows) {
      const sessionId = row.id;

      // Hitung agregat roll untuk session ini
      const rollsRes = await db.execute({
        sql: "SELECT COUNT(id) as pcs, SUM(weight_kg) as kg FROM rolls WHERE session_id = ?",
        args: [sessionId]
      });

      const pcs = (rollsRes.rows[0]?.pcs as number) || 0;
      const kg = (rollsRes.rows[0]?.kg as number) || 0;

      // Update shift (karena kita ga tau pastinya dia disahkan di buku mana,
      // kalau belum dipasang month_year_book, kita paksa masuk ke currentMonthYear, 
      // toh baru saja dibuat)
      await db.execute({
        sql: `UPDATE shift_sessions 
              SET total_produksi_kg = ?, total_roll_pcs = ?, month_year_book = COALESCE(month_year_book, ?)
              WHERE id = ?`,
        args: [kg, pcs, currentMonthYear, sessionId]
      });

      updated++;
    }

    // Untuk shift yang open (akan masuk buku saat ini)
    await db.execute({
      sql: `UPDATE shift_sessions 
            SET month_year_book = ? 
            WHERE status != 'CLOSED' AND month_year_book IS NULL`,
      args: [currentMonthYear]
    });

    console.log(`✅ Berhasil! ${updated} shift yang sudah ditutup di-backfill.`);
    process.exit(0);

  } catch (error) {
    console.error("❌ Terjadi kesalahan fatal:", error);
    process.exit(1);
  }
}

migrate();
