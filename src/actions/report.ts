"use server";

import { db } from "@/lib/db";

/**
 * Get all past monthly closures
 */
export async function getClosedMonths() {
  const result = await db.execute("SELECT * FROM monthly_closures ORDER BY closed_at DESC");
  return result.rows.map(row => JSON.parse(JSON.stringify(row)));
}

/**
 * Get the current active open month book from system stats
 */
export async function getActiveMonth() {
  const result = await db.execute("SELECT current_month_year FROM system_stats WHERE id = 1");
  return (result.rows[0]?.current_month_year as string) || null;
}

export type MonthlyReportData = {
  shifts: any[];
  total_produksi_kg: number;
  total_roll_pcs: number;
  total_bahan_baku: number;
  total_sapuan: number;
  total_pp_hijau: number;
  total_sisa_sablon: number;
  total_sapuan_kotor: number;
  total_afalan_pelet_sak: number;
};

/**
 * Get aggregated data for a specific month_year_book
 */
export async function getMonthlyReportData(monthYear: string): Promise<MonthlyReportData> {
  const result = await db.execute({
    sql: `SELECT * FROM shift_sessions 
          WHERE month_year_book = ? AND status = 'CLOSED' 
          ORDER BY date_closed ASC`,
    args: [monthYear]
  });

  const shifts = result.rows.map((row) => JSON.parse(JSON.stringify(row)));

  let total_produksi_kg = 0;
  let total_roll_pcs = 0;
  let total_bahan_baku = 0;
  let total_sapuan = 0;
  let total_pp_hijau = 0;
  let total_sisa_sablon = 0;
  let total_sapuan_kotor = 0;
  let total_afalan_pelet_sak = 0;

  for (const shift of shifts) {
    total_produksi_kg += Number(shift.total_produksi_kg) || 0;
    total_roll_pcs += Number(shift.total_roll_pcs) || 0;
    total_bahan_baku += Number(shift.bahan_baku_a_karung) || 0;
    total_sapuan += Number(shift.sapuan_kg) || 0;
    total_pp_hijau += Number(shift.pp_hijau_muda_kg) || 0;
    total_sisa_sablon += Number(shift.sisa_sablon_a_karung) || 0;
    total_sapuan_kotor += Number(shift.sapuan_kotor_kg) || 0;
    total_afalan_pelet_sak += Number(shift.afalan_pelet_sak) || 0;
  }

  return {
    shifts,
    total_produksi_kg,
    total_roll_pcs,
    total_bahan_baku,
    total_sapuan,
    total_pp_hijau,
    total_sisa_sablon,
    total_sapuan_kotor,
    total_afalan_pelet_sak
  };
}
