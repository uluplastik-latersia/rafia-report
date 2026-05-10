"use server";

import { db } from "@/lib/db";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

export type DailyInsight = {
  date: string;
  topProductionMachine: number | null;
  topProductionKg: number;
  topAfalanMachine: number | null;
  topAfalanKg: number;
};

/**
 * Mendapatkan insight mesin harian dalam satu rentang tanggal tertentu
 */
export async function getMachineInsights(startDateStr: string, endDateStr: string): Promise<DailyInsight[]> {
  try {
    // Pastikan kita mengambil data bedasarkan rentang waktu
    // startDate dan endDate dalam format YYYY-MM-DD
    
    // 1. Ambil data produksi per mesin per hari
    const prodQuery = `
      SELECT 
        DATE(s.date_opened, 'localtime') as prod_date,
        r.machine_number,
        SUM(r.weight_kg) as total_produksi
      FROM rolls r
      JOIN shift_sessions s ON r.session_id = s.id
      WHERE DATE(s.date_opened, 'localtime') >= ? AND DATE(s.date_opened, 'localtime') <= ?
      GROUP BY prod_date, r.machine_number
    `;
    
    // 2. Ambil data afalan per mesin per hari
    const wasteQuery = `
      SELECT 
        DATE(s.date_opened, 'localtime') as prod_date,
        w.machine_number,
        SUM(w.afalan_kg) as total_afalan
      FROM machine_wastes w
      JOIN shift_sessions s ON w.session_id = s.id
      WHERE DATE(s.date_opened, 'localtime') >= ? AND DATE(s.date_opened, 'localtime') <= ?
      GROUP BY prod_date, w.machine_number
    `;

    const [prodRes, wasteRes] = await db.batch([
      { sql: prodQuery, args: [startDateStr, endDateStr] },
      { sql: wasteQuery, args: [startDateStr, endDateStr] }
    ]);

    // Mengelompokkan berdasarkan tanggal
    const dataByDate: Record<string, {
      production: Record<number, number>,
      waste: Record<number, number>
    }> = {};

    // Inisialisasi data map untuk setiap baris produksi
    for (const row of prodRes.rows) {
      const date = String(row.prod_date);
      const machine = Number(row.machine_number);
      const weight = Number(row.total_produksi);
      
      if (!dataByDate[date]) {
        dataByDate[date] = { production: {}, waste: {} };
      }
      dataByDate[date].production[machine] = weight;
    }

    // Inisialisasi data map untuk setiap baris waste
    for (const row of wasteRes.rows) {
      const date = String(row.prod_date);
      const machine = Number(row.machine_number);
      const waste = Number(row.total_afalan);
      
      if (!dataByDate[date]) {
        dataByDate[date] = { production: {}, waste: {} };
      }
      dataByDate[date].waste[machine] = waste;
    }

    // Mencari pemenang (Insight) per hari
    const insights: DailyInsight[] = [];
    
    // Urutkan tanggal dari yang terlama ke terbaru
    const sortedDates = Object.keys(dataByDate).sort();

    for (const date of sortedDates) {
      const dayData = dataByDate[date];
      
      let topProdMachine = null;
      let topProdKg = 0;
      
      let topAfalanMachine = null;
      let topAfalanKg = 0;
      
      // Cari mesin dengan produksi tertinggi hari itu
      for (const [machineStr, kg] of Object.entries(dayData.production)) {
        if (kg > topProdKg) {
          topProdKg = kg;
          topProdMachine = Number(machineStr);
        }
      }
      
      // Cari mesin dengan afalan tertinggi hari itu
      for (const [machineStr, kg] of Object.entries(dayData.waste)) {
        if (kg > topAfalanKg) {
          topAfalanKg = kg;
          topAfalanMachine = Number(machineStr);
        }
      }
      
      insights.push({
        date,
        topProductionMachine: topProdMachine,
        topProductionKg: topProdKg,
        topAfalanMachine: topAfalanMachine,
        topAfalanKg: topAfalanKg
      });
    }

    // Urutkan kembali descending (terbaru di atas)
    return insights.reverse();
  } catch (error) {
    console.error("Gagal mendapatkan machine insights:", error);
    return [];
  }
}

/**
 * Mendapatkan insight untuk minggu ini (Minggu - Sabtu)
 */
export async function getCurrentWeekInsights() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 0 }); // 0 = Sunday
  const end = endOfWeek(now, { weekStartsOn: 0 });
  
  const startDateStr = format(start, "yyyy-MM-dd");
  const endDateStr = format(end, "yyyy-MM-dd");
  
  return await getMachineInsights(startDateStr, endDateStr);
}

/**
 * Mendapatkan insight untuk laporan bulanan berdasarkan month_year string (e.g. "4-2026")
 */
export async function getMonthlyInsightsByMonthYear(monthYearStr: string) {
  // Parsing "M-YYYY" to Date
  const parts = monthYearStr.split("-");
  if (parts.length !== 2) return [];
  
  const monthIndex = parseInt(parts[0], 10) - 1;
  const year = parseInt(parts[1], 10);
  
  const dateObj = new Date(year, monthIndex, 1);
  const start = startOfMonth(dateObj);
  const end = endOfMonth(dateObj);
  
  const startDateStr = format(start, "yyyy-MM-dd");
  const endDateStr = format(end, "yyyy-MM-dd");
  
  return await getMachineInsights(startDateStr, endDateStr);
}
