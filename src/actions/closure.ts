"use server";

import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

export async function tutupBukuBulanan() {
  // 1. Dapatkan stat saat ini
  const statsRes = await db.execute("SELECT * FROM system_stats WHERE id = 1");
  const stats = statsRes.rows[0];
  
  if (!stats) {
    throw new Error("System stats tidak ditemukan");
  }

  const currentHrKg = Number(stats.current_hr_kg || 0);
  const currentMonthYear = String(stats.current_month_year || "");

  // 2. Arsipkan ke monthly_closures
  const closureId = uuidv4();
  await db.execute({
    sql: `INSERT INTO monthly_closures (id, month_year, total_hr_kg) VALUES (?, ?, ?)`,
    args: [closureId, currentMonthYear, currentHrKg],
  });

  // 3. Kalkulasi bulan selanjutnya (contoh "4-2026" menjadi "5-2026")
  let nextMonthYear = "1-2026"; // Fallback
  if (currentMonthYear.includes("-")) {
    const parts = currentMonthYear.split("-");
    let m = parseInt(parts[0], 10);
    let y = parseInt(parts[1], 10);
    
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    nextMonthYear = `${m}-${y}`;
  } else {
    // Kalau format lama tidak sesuai, pakai default based on today
    const now = new Date();
    nextMonthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
  }

  // 4. Reset HR Mesin jadi 0, dan majukan bulan
  await db.execute({
    sql: `UPDATE system_stats SET current_hr_kg = 0, current_month_year = ? WHERE id = 1`,
    args: [nextMonthYear],
  });

  revalidatePath("/");
  return { success: true, nextMonthYear };
}
