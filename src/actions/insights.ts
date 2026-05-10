"use server";

import { db } from "@/lib/db";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

export type MachineData = {
  machineNumber: number;
  productionKg: number;
  afalanKg: number;
};

export type DailyInsightDetail = {
  date: string;
  machines: MachineData[];
};

export type WeeklyAverage = {
  machineNumber: number;
  avgProductionKg: number;
  avgAfalanKg: number;
};

export type InsightDashboardData = {
  dailyDetails: DailyInsightDetail[];
  averages: WeeklyAverage[];
  daysCount: number;
};

/**
 * Mendapatkan insight mesin secara detail (semua 7 mesin) dalam rentang waktu
 */
export async function getDetailedMachineInsights(startDateStr: string, endDateStr: string): Promise<InsightDashboardData> {
  try {
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
    const dataByDate: Record<string, Record<number, { prod: number, waste: number }>> = {};

    // Helper untuk inisialisasi date
    const initDate = (date: string) => {
      if (!dataByDate[date]) {
        dataByDate[date] = {};
        for (let i = 1; i <= 7; i++) {
          dataByDate[date][i] = { prod: 0, waste: 0 };
        }
      }
    };

    // Populasi data produksi
    for (const row of prodRes.rows) {
      const date = String(row.prod_date);
      const machine = Number(row.machine_number);
      const weight = Number(row.total_produksi);
      initDate(date);
      if (machine >= 1 && machine <= 7) {
        dataByDate[date][machine].prod = weight;
      }
    }

    // Populasi data waste
    for (const row of wasteRes.rows) {
      const date = String(row.prod_date);
      const machine = Number(row.machine_number);
      const waste = Number(row.total_afalan);
      initDate(date);
      if (machine >= 1 && machine <= 7) {
        dataByDate[date][machine].waste = waste;
      }
    }

    // Membentuk struktur DailyInsightDetail
    const dailyDetails: DailyInsightDetail[] = [];
    const sortedDates = Object.keys(dataByDate).sort();

    // Kalkulasi total untuk rata-rata
    const totalProdPerMachine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const totalWastePerMachine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const daysCount = sortedDates.length;

    for (const date of sortedDates) {
      const dayData = dataByDate[date];
      const machines: MachineData[] = [];
      
      for (let i = 1; i <= 7; i++) {
        const prod = dayData[i].prod;
        const waste = dayData[i].waste;
        
        machines.push({
          machineNumber: i,
          productionKg: prod,
          afalanKg: waste
        });
        
        totalProdPerMachine[i] += prod;
        totalWastePerMachine[i] += waste;
      }
      
      dailyDetails.push({ date, machines });
    }

    // Kalkulasi rata-rata (hanya jika ada hari berjalan)
    const averages: WeeklyAverage[] = [];
    for (let i = 1; i <= 7; i++) {
      averages.push({
        machineNumber: i,
        avgProductionKg: daysCount > 0 ? totalProdPerMachine[i] / daysCount : 0,
        avgAfalanKg: daysCount > 0 ? totalWastePerMachine[i] / daysCount : 0,
      });
    }

    // Urutkan kembali descending (terbaru di atas) untuk tampilan list harian
    return {
      dailyDetails: dailyDetails.reverse(),
      averages,
      daysCount
    };
  } catch (error) {
    console.error("Gagal mendapatkan machine insights:", error);
    return { dailyDetails: [], averages: [], daysCount: 0 };
  }
}

/**
 * Mendapatkan insight untuk minggu ini (Senin - Minggu)
 */
export async function getCurrentWeekInsights() {
  const now = new Date();
  // Menggunakan weekStartsOn: 1 agar minggu dimulai dari Senin dan berakhir di Minggu,
  // atau weekStartsOn: 0 untuk Minggu - Sabtu. Di Indonesia standar kerja biasanya Senin-Sabtu/Minggu.
  const start = startOfWeek(now, { weekStartsOn: 1 }); 
  const end = endOfWeek(now, { weekStartsOn: 1 });
  
  const startDateStr = format(start, "yyyy-MM-dd");
  const endDateStr = format(end, "yyyy-MM-dd");
  
  return await getDetailedMachineInsights(startDateStr, endDateStr);
}
