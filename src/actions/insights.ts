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
        for (let i = 1; i <= 10; i++) {
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
      if (machine >= 1 && machine <= 10) {
        dataByDate[date][machine].prod = weight;
      }
    }

    // Populasi data waste
    for (const row of wasteRes.rows) {
      const date = String(row.prod_date);
      const machine = Number(row.machine_number);
      const waste = Number(row.total_afalan);
      initDate(date);
      if (machine >= 1 && machine <= 10) {
        dataByDate[date][machine].waste = waste;
      }
    }

    // Membentuk struktur DailyInsightDetail
    const dailyDetails: DailyInsightDetail[] = [];
    const sortedDates = Object.keys(dataByDate).sort();

    // Kalkulasi total untuk rata-rata
    const totalProdPerMachine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const totalWastePerMachine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const daysCount = sortedDates.length;

    for (const date of sortedDates) {
      const dayData = dataByDate[date];
      const machines: MachineData[] = [];
      
      for (let i = 1; i <= 10; i++) {
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
    for (let i = 1; i <= 10; i++) {
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

export type ShiftMachineData = {
  machineNumber: number;
  productionKg: number;
  rollCount: number;
  afalanKg: number;
  prongkalanKg: number;
  qcFailedCount: number;
  operators: string[];
};

export type ShiftInsightDetail = {
  sessionId: string;
  shiftNumber: number;
  status: string;
  dateOpened: string;
  dateClosed: string | null;
  adminName: string;
  machines: ShiftMachineData[];
  totalShiftProductionKg: number;
  totalShiftRolls: number;
  totalShiftQcFailed: number;
};

export type ShiftMachineAverage = {
  machineNumber: number;
  avgProductionKg: number;
  avgAfalanKg: number;
  avgRollCount: number;
  totalQcFailed: number;
  activeShiftsCount: number;
};

export type ShiftInsightDashboardData = {
  shiftDetails: ShiftInsightDetail[];
  averages: ShiftMachineAverage[];
  shiftsCount: number;
};

/**
 * Mendapatkan insight mesin berbasis PER SHIFT (bukan gabungan 1 hari)
 * Default: 20 shift terakhir atau rentang waktu tertentu
 */
export async function getShiftMachineInsights(limitShift = 20): Promise<ShiftInsightDashboardData> {
  try {
    // 1. Ambil shift_sessions terakhir
    const shiftRes = await db.execute({
      sql: `SELECT id, shift_number, status, date_opened, date_closed, admin_name
            FROM shift_sessions 
            ORDER BY date_opened DESC 
            LIMIT ?`,
      args: [limitShift]
    });

    if (shiftRes.rows.length === 0) {
      return { shiftDetails: [], averages: [], shiftsCount: 0 };
    }

    const sessionIds = shiftRes.rows.map(r => String(r.id));
    const placeholders = sessionIds.map(() => '?').join(',');

    // 2. Ambil data roll & QC per mesin per shift
    const prodRes = await db.execute({
      sql: `SELECT 
              r.session_id,
              r.machine_number,
              COUNT(r.id) as roll_count,
              SUM(r.weight_kg) as total_produksi,
              SUM(CASE WHEN r.weight_kg > 75.99 THEN 1 ELSE 0 END) as qc_failed_count,
              GROUP_CONCAT(DISTINCT r.operator_code) as operator_codes
            FROM rolls r
            WHERE r.session_id IN (${placeholders})
            GROUP BY r.session_id, r.machine_number`,
      args: sessionIds
    });

    // 3. Ambil data waste per mesin per shift
    const wasteRes = await db.execute({
      sql: `SELECT 
              session_id,
              machine_number,
              afalan_kg,
              prongkalan_kg
            FROM machine_wastes
            WHERE session_id IN (${placeholders})`,
      args: sessionIds
    });

    // 4. Ambil daftar operator name untuk mapping kode
    const opRes = await db.execute("SELECT code, name FROM operators");
    const opMap = new Map<string, string>();
    for (const r of opRes.rows) {
      opMap.set(String(r.code), String(r.name));
    }

    // Mapping prod & waste per session & machine
    const prodMap: Record<string, Record<number, {
      rollCount: number;
      totalKg: number;
      qcFailed: number;
      operators: string[];
    }>> = {};

    for (const row of prodRes.rows) {
      const sid = String(row.session_id);
      const m = Number(row.machine_number);
      if (!prodMap[sid]) prodMap[sid] = {};
      
      const opCodes = row.operator_codes ? String(row.operator_codes).split(",") : [];
      const opNames = opCodes.map(c => opMap.get(c.trim()) || c.trim());

      prodMap[sid][m] = {
        rollCount: Number(row.roll_count || 0),
        totalKg: Number(row.total_produksi || 0),
        qcFailed: Number(row.qc_failed_count || 0),
        operators: opNames
      };
    }

    const wasteMap: Record<string, Record<number, { afalan: number; prongkalan: number }>> = {};
    for (const row of wasteRes.rows) {
      const sid = String(row.session_id);
      const m = Number(row.machine_number);
      if (!wasteMap[sid]) wasteMap[sid] = {};
      wasteMap[sid][m] = {
        afalan: Number(row.afalan_kg || 0),
        prongkalan: Number(row.prongkalan_kg || 0)
      };
    }

    // Susun shiftDetails
    const shiftDetails: ShiftInsightDetail[] = [];
    const totalProdPerMachine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const totalRollsPerMachine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const totalAfalanPerMachine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const totalQcFailedPerMachine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const activeShiftsCountPerMachine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };

    for (const sRow of shiftRes.rows) {
      const sid = String(sRow.id);
      const machines: ShiftMachineData[] = [];
      let shiftTotalKg = 0;
      let shiftTotalRolls = 0;
      let shiftTotalQc = 0;

      for (let m = 1; m <= 10; m++) {
        const p = prodMap[sid]?.[m] || { rollCount: 0, totalKg: 0, qcFailed: 0, operators: [] };
        const w = wasteMap[sid]?.[m] || { afalan: 0, prongkalan: 0 };

        machines.push({
          machineNumber: m,
          productionKg: p.totalKg,
          rollCount: p.rollCount,
          afalanKg: w.afalan,
          prongkalanKg: w.prongkalan,
          qcFailedCount: p.qcFailed,
          operators: p.operators
        });

        shiftTotalKg += p.totalKg;
        shiftTotalRolls += p.rollCount;
        shiftTotalQc += p.qcFailed;

        if (p.rollCount > 0 || p.totalKg > 0 || w.afalan > 0) {
          totalProdPerMachine[m] += p.totalKg;
          totalRollsPerMachine[m] += p.rollCount;
          totalAfalanPerMachine[m] += w.afalan;
          totalQcFailedPerMachine[m] += p.qcFailed;
          activeShiftsCountPerMachine[m] += 1;
        }
      }

      shiftDetails.push({
        sessionId: sid,
        shiftNumber: Number(sRow.shift_number),
        status: String(sRow.status),
        dateOpened: String(sRow.date_opened),
        dateClosed: sRow.date_closed ? String(sRow.date_closed) : null,
        adminName: sRow.admin_name && String(sRow.admin_name) !== '-' ? String(sRow.admin_name) : 'Admin',
        machines,
        totalShiftProductionKg: shiftTotalKg,
        totalShiftRolls: shiftTotalRolls,
        totalShiftQcFailed: shiftTotalQc
      });
    }

    const averages: ShiftMachineAverage[] = [];
    for (let m = 1; m <= 10; m++) {
      const activeCount = activeShiftsCountPerMachine[m];
      averages.push({
        machineNumber: m,
        avgProductionKg: activeCount > 0 ? totalProdPerMachine[m] / activeCount : 0,
        avgAfalanKg: activeCount > 0 ? totalAfalanPerMachine[m] / activeCount : 0,
        avgRollCount: activeCount > 0 ? totalRollsPerMachine[m] / activeCount : 0,
        totalQcFailed: totalQcFailedPerMachine[m],
        activeShiftsCount: activeCount
      });
    }

    return {
      shiftDetails,
      averages,
      shiftsCount: shiftDetails.length
    };
  } catch (error) {
    console.error("Gagal mendapatkan shift machine insights:", error);
    return { shiftDetails: [], averages: [], shiftsCount: 0 };
  }
}

