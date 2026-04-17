import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken: authToken || undefined });

async function resetDatabase() {
  console.log("🚀 Memulai proses RESET TOTAL Database STOK RAFIA UPL...");
  console.log("⚠️ Peringatan: Semua data transaksi, sesi, roll, dan histori akan dihapus permanen!");
  console.log(`📍 Database URL: ${url}`);
  console.log("");

  try {
    // Mulai menghapus data (urutannya dari child ke parent untuk menghindari FK error jika ada pragma)
    console.log("🧹 1/7: Membersihkan item penjualan (sale_items)...");
    await client.execute("DELETE FROM sale_items");

    console.log("🧹 2/7: Membersihkan riwayat penjualan (sales)...");
    await client.execute("DELETE FROM sales");

    console.log("🧹 3/7: Membersihkan data mesin waste (machine_wastes)...");
    await client.execute("DELETE FROM machine_wastes");

    console.log("🧹 4/7: Membersihkan stok roll (rolls)...");
    await client.execute("DELETE FROM rolls");

    console.log("🧹 5/7: Membersihkan riwayat shift (shift_sessions)...");
    await client.execute("DELETE FROM shift_sessions");

    console.log("🧹 6/7: Membersihkan riwayat tutup buku bulanan (monthly_closures)...");
    await client.execute("DELETE FROM monthly_closures");

    // Reset tabel system_stats (mengembalikan stock dan HR menjadi 0)
    console.log("🧹 7/7: Meng-nol-kan statistik sistem (system_stats)...");
    const now = new Date();
    const monthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
    await client.execute({
      sql: `UPDATE system_stats SET current_stock_kg = 0, current_hr_kg = 0, current_month_year = ? WHERE id = 1`,
      args: [monthYear],
    });

    console.log("\n📊 Verifikasi Hasil Reset:");
    const statsResult = await client.execute("SELECT * FROM system_stats");
    const opCount = await client.execute("SELECT COUNT(*) as total FROM operators");
    const rollsCount = await client.execute("SELECT COUNT(*) as total FROM rolls");
    const shiftsCount = await client.execute("SELECT COUNT(*) as total FROM shift_sessions");

    console.log(`  ✅ system_stats:`, statsResult.rows[0]);
    console.log(`  ✅ Total Operator tersisa:`, opCount.rows[0].total, "orang (Aman)");
    console.log(`  ✅ Total Rolls tersisa:`, rollsCount.rows[0].total);
    console.log(`  ✅ Total Shifts tersisa:`, shiftsCount.rows[0].total);

    console.log("\n✅ Reset sukses! Database dalam kondisi 0 (KOSONG) dan SIAP DIGUNAKAN UNTUK UMUM.");
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat mereset database:", error);
  } finally {
    client.close();
  }
}

resetDatabase();
