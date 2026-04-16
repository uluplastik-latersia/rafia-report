"use server";

import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

export async function getActiveShift() {
  const result = await db.execute("SELECT * FROM shift_sessions WHERE status = 'OPEN' LIMIT 1");
  const row = result.rows[0];
  if (!row) return null;
  return JSON.parse(JSON.stringify(row));
}

export async function openShift() {
  // Pastikan tidak ada shift yang masih open
  const active = await getActiveShift();
  if (active) {
    throw new Error("Gagal memulai: Masih ada shift yang aktif/Open!");
  }

  // Tentukan nomor shift berdasarkan jam saat ini
  const now = new Date();
  // Format spesifik ke WIB (UTC+7) terlepas dari zona waktu server tempat aplikasi di-deploy.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    hour12: false // Pakai format 24 jam (pukul 1 s/d 24)
  });
  
  const localHourStr = formatter.format(now);
  let localHour = parseInt(localHourStr, 10);
  
  // Karena 'hour12: false' di beberapa environment mengembalikan jam 00 sebagai 24
  if (localHour === 24) {
    localHour = 0;
  }
  
  // Shift 1: 07:00 - 18:59 | Shift 2: 19:00 - 06:59
  const shiftNumber = (localHour >= 7 && localHour < 19) ? 1 : 2;

  const sessionId = uuidv4();

  await db.execute({
    sql: `INSERT INTO shift_sessions (id, shift_number, status) VALUES (?, ?, 'OPEN')`,
    args: [sessionId, shiftNumber],
  });

  revalidatePath("/");
  revalidatePath("/shift");
  return { success: true, sessionId, shiftNumber };
}

export async function closeShift(
  sessionId: string, 
  data: { 
    bahanBaku: number; 
    sisaSablon: number;
    ppHijau: number; 
    sapuan: number; 
    sapuanKotor: number;
    adminName: string;
    karyawan: number;
  }
) {
  // Hitung total roll diproduksi di shift ini untuk data (Opsional)
  const statsRes = await db.execute({
    sql: `SELECT SUM(weight_kg) as total_kg FROM rolls WHERE session_id = ?`,
    args: [sessionId]
  });
  const shiftProductionKg = (statsRes.rows[0]?.total_kg as number) || 0;

  // Jalankan kedua update secara serentak dalam satu transaksi BATCH
  await db.batch([
    {
      sql: `UPDATE shift_sessions 
            SET status = 'CLOSED', 
                date_closed = CURRENT_TIMESTAMP,
                bahan_baku_a_karung = ?,
                sisa_sablon_a_karung = ?,
                pp_hijau_muda_kg = ?,
                sapuan_kg = ?,
                sapuan_kotor_kg = ?,
                admin_name = ?,
                jumlah_karyawan = ?
            WHERE id = ?`,
      args: [
        data.bahanBaku, 
        data.sisaSablon,
        data.ppHijau, 
        data.sapuan, 
        data.sapuanKotor,
        data.adminName, 
        data.karyawan,
        sessionId
      ]
    },
    {
      sql: `UPDATE system_stats SET current_hr_kg = current_hr_kg + ? WHERE id = 1`,
      args: [shiftProductionKg]
    }
  ]);

  revalidatePath("/");
  revalidatePath("/shift");
  return { success: true };
}
