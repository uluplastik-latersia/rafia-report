"use client";

import { useState, useMemo } from "react";
import { 
  Cpu, 
  BarChart2, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Clock, 
  User, 
  RefreshCw,
  Calendar,
  Filter,
  Layers,
  ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ShiftInsightDashboardData, ShiftInsightDetail } from "@/actions/insights";

// Helper konversi format DB UTC ke WIB
function getTzDate(dbStr: string | null) {
  const safeDateStr = dbStr ? (dbStr.includes("T") ? dbStr : dbStr.replace(" ", "T") + "Z") : new Date().toISOString();
  return new Date(safeDateStr);
}

function parseWkt(dbDate: string | null) {
  if (!dbDate) return { d: "-", t: "-" };
  const dt = getTzDate(dbDate);
  const d = dt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });
  const t = dt.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
  return { d, t };
}

// Helper ekstraksi metadata waktu untuk pengelompokan
function getShiftDateMeta(shift: ShiftInsightDetail) {
  const dt = getTzDate(shift.dateOpened);
  const year = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", year: "numeric" });
  const month = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", month: "long" });
  const dayName = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long" });
  const dayDate = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });

  // Hitung minggu ke-N dalam bulan (Senin = awal minggu)
  const localParts = dt.toLocaleString("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "numeric", day: "numeric" }).split("/");
  const localDate = new Date(Number(localParts[2]), Number(localParts[0]) - 1, Number(localParts[1]));
  const dayOfMonth = localDate.getDate();
  const firstOfMonth = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
  const firstDayAdj = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;
  const weekNum = Math.ceil((dayOfMonth + firstDayAdj) / 7);

  return {
    year,
    month,
    weekKey: `Minggu ke-${weekNum} (${month} ${year})`,
    monthKey: `${month} ${year}`,
    yearKey: `Tahun ${year}`,
    dayKey: `${dayName}, ${dayDate}`,
  };
}

export default function MesinClient({
  currentShift,
  isShiftActive,
  rolls,
  wastes,
  operators,
  insightsData,
}: {
  currentShift: any;
  isShiftActive: boolean;
  rolls: any[];
  wastes: any[];
  operators: any[];
  insightsData: ShiftInsightDashboardData;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"shift" | "insight">("shift");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter Mode: "all" | "date" | "week" | "month" | "year"
  const [filterMode, setFilterMode] = useState<"all" | "date" | "week" | "month" | "year">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Kalkulasi data shift saat ini (Tab 1)
  const totalRollsCount = rolls.length;
  const totalRollsKg = rolls.reduce((acc, r) => acc + r.weight_kg, 0);
  const totalQcFailed = rolls.filter((r) => r.weight_kg > 75.99);

  // Bangun rincian per mesin 1 s/d 10 untuk Shift Ini
  const machineCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => {
    const mRolls = rolls.filter((r) => r.machine_number === m);
    const mWeight = mRolls.reduce((sum, r) => sum + r.weight_kg, 0);
    const mWaste = wastes.find((w) => w.machine_number === m) || { afalan_kg: 0, prongkalan_kg: 0 };
    const mQc = mRolls.filter((r) => r.weight_kg > 75.99);

    const opCodes = Array.from(new Set(mRolls.map((r) => r.operator_code).filter(Boolean)));
    const opNames = opCodes.map((code) => {
      const opObj = operators.find((o) => o.code === code);
      return opObj ? opObj.name : code;
    });

    const isRunning = mRolls.length > 0 || mWeight > 0 || mWaste.afalan_kg > 0;

    return {
      machineNumber: m,
      rolls: mRolls,
      rollCount: mRolls.length,
      totalWeight: mWeight,
      waste: mWaste,
      qcFailed: mQc,
      operators: opNames,
      isRunning,
    };
  });

  const shiftWkt = currentShift ? parseWkt(currentShift.date_opened) : { d: "-", t: "-" };
  const adminName = currentShift?.admin_name && currentShift?.admin_name !== "-" ? currentShift.admin_name : "Admin";

  // ==================== DAFTAR PILIHAN KATEGORI UNTUK DROPDOWN ====================
  const categoryOptions = useMemo(() => {
    if (filterMode === "all") return [];

    const set = new Set<string>();
    insightsData.shiftDetails.forEach((shift) => {
      const meta = getShiftDateMeta(shift);
      if (filterMode === "date") set.add(meta.dayKey);
      else if (filterMode === "week") set.add(meta.weekKey);
      else if (filterMode === "month") set.add(meta.monthKey);
      else if (filterMode === "year") set.add(meta.yearKey);
    });

    return Array.from(set);
  }, [insightsData.shiftDetails, filterMode]);

  // Reset dropdown terpilih saat mode filter berubah
  const handleFilterModeChange = (mode: "all" | "date" | "week" | "month" | "year") => {
    setFilterMode(mode);
    setSelectedCategory("ALL");
  };

  // ==================== FILTER SHIFT DETAILS ====================
  const filteredShifts = useMemo(() => {
    if (filterMode === "all" || selectedCategory === "ALL") {
      return insightsData.shiftDetails;
    }

    return insightsData.shiftDetails.filter((shift) => {
      const meta = getShiftDateMeta(shift);
      if (filterMode === "date") return meta.dayKey === selectedCategory;
      if (filterMode === "week") return meta.weekKey === selectedCategory;
      if (filterMode === "month") return meta.monthKey === selectedCategory;
      if (filterMode === "year") return meta.yearKey === selectedCategory;
      return true;
    });
  }, [insightsData.shiftDetails, filterMode, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* HEADER SUB-PWA: MONITOR RAFIA */}
      <header className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg tracking-tight">Monitor Rafia</h1>
                <span className="text-[10px] bg-amber-900/40 px-2 py-0.5 rounded-full font-semibold border border-amber-300/30">
                  UPL MESIN
                </span>
              </div>
              <p className="text-[11px] text-amber-100">Pantauan Hasil Produksi &amp; Afalan Mesin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-2 bg-white/20 hover:bg-white/30 rounded-xl active:scale-95 transition-all text-white flex items-center gap-1.5 text-xs font-semibold ${
                isRefreshing ? "opacity-60" : ""
              }`}
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="max-w-7xl mx-auto px-4 pt-1 flex gap-2 border-t border-amber-400/40">
          <button
            onClick={() => setActiveTab("shift")}
            className={`flex-1 py-2.5 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border-b-2 ${
              activeTab === "shift"
                ? "border-white text-white font-black"
                : "border-transparent text-amber-100/70 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Hasil Shift Mesin</span>
            {isShiftActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("insight")}
            className={`flex-1 py-2.5 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border-b-2 ${
              activeTab === "insight"
                ? "border-white text-white font-black"
                : "border-transparent text-amber-100/70 hover:text-white"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Insight Mesin (Per Shift)</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* ==================== TAB 1: HASIL SHIFT ==================== */}
        {activeTab === "shift" && (
          <div className="space-y-5">
            {/* STATUS BANNER */}
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      isShiftActive ? "bg-emerald-500 animate-ping" : "bg-slate-400"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                        {isShiftActive ? "Shift Sedang Berjalan" : "Shift Terakhir (Tutup)"}
                      </span>
                      {currentShift && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-black px-2 py-0.5 rounded-md">
                          Shift {currentShift.shift_number}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {shiftWkt.d} — {shiftWkt.t} WIB | Admin: {adminName}
                    </p>
                  </div>
                </div>

                {/* TOTAL STATS PILLS */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-800 font-bold">
                    Total: {totalRollsKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg ({totalRollsCount} Roll)
                  </div>
                  {totalQcFailed.length > 0 ? (
                    <div className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl text-red-700 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      {totalQcFailed.length} Gagal QC (&gt;75.99kg)
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-600 font-medium">
                      QC: 0 Gagal
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* GRID HASIL TIAP MESIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {machineCards.map((m) => (
                <div
                  key={m.machineNumber}
                  className={`rounded-2xl p-4 border transition-all ${
                    m.isRunning
                      ? "bg-white border-slate-200 shadow-sm"
                      : "bg-slate-100/60 border-dashed border-slate-300 opacity-60"
                  }`}
                >
                  {/* Card Header: Mesin & Operator */}
                  <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500 text-white font-black text-xs px-2.5 py-1 rounded-lg">
                        M-{m.machineNumber}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        Mesin {m.machineNumber}
                      </span>
                    </div>
                    {m.isRunning ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Jalan
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                        Mati
                      </span>
                    )}
                  </div>

                  {m.isRunning ? (
                    <div className="space-y-2">
                      {/* Operator info */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold truncate">
                          {m.operators.length > 0 ? m.operators.join(", ") : "Belum ada operator"}
                        </span>
                      </div>

                      {/* Angka Produksi */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl text-center">
                          <span className="text-[10px] text-emerald-700 font-semibold block uppercase">
                            Hasil (kg)
                          </span>
                          <span className="text-base font-black text-emerald-800">
                            {m.totalWeight.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                          </span>
                        </div>
                        <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl text-center">
                          <span className="text-[10px] text-blue-700 font-semibold block uppercase">
                            Total Roll
                          </span>
                          <span className="text-base font-black text-blue-800">
                            {m.rollCount}
                          </span>
                        </div>
                      </div>

                      {/* Afalan & Prongkolan */}
                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Afalan:
                          </span>
                          <span className="font-bold text-red-600">
                            {m.waste.afalan_kg.toFixed(1)} kg
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Prongkolan:</span>
                          <span className="font-semibold text-slate-700">
                            {m.waste.prongkalan_kg.toFixed(1)} kg
                          </span>
                        </div>
                      </div>

                      {/* Catatan Gagal QC */}
                      {m.qcFailed.length > 0 ? (
                        <div className="bg-red-50 border border-red-200 p-2 rounded-xl text-xs text-red-700 space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Gagal QC (&gt;76kg):
                            </span>
                            <span className="bg-red-200/70 text-red-800 px-1.5 py-0.2 rounded font-black text-[11px]">
                              {m.qcFailed.length} Roll
                            </span>
                          </div>
                          <div className="text-[11px] text-red-800/80 leading-relaxed font-mono">
                            {m.qcFailed.map((r) => `${r.weight_kg}kg`).join(", ")}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 text-center py-1 font-medium bg-emerald-50/40 rounded-lg">
                          ✓ Lolos QC Semua
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Mesin tidak jalan pada shift ini.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: INSIGHT MESIN PER SHIFT ==================== */}
        {activeTab === "insight" && (
          <div className="space-y-6">
            {/* RATA-RATA TIAP MESIN */}
            <section className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-amber-600" />
                    Rata-rata Kinerja Mesin (Per 1 Shift Aktif)
                  </h2>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    Dianalisis dari riwayat {insightsData.shiftsCount} shift operasional terakhir
                  </p>
                </div>
                <div className="text-[11px] bg-amber-200/60 text-amber-900 font-bold px-3 py-1 rounded-full">
                  Basis: 1 Shift
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden border border-amber-200/80 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-amber-100/70 text-amber-950 text-xs">
                      <tr>
                        <th className="py-3 px-3.5 font-bold text-center w-20">Mesin</th>
                        <th className="py-3 px-3 font-bold text-right">Avg Hasil / Shift</th>
                        <th className="py-3 px-3 font-bold text-right">Avg Roll / Shift</th>
                        <th className="py-3 px-3 font-bold text-right">Avg Afalan</th>
                        <th className="py-3 px-3 font-bold text-center text-red-700">Total QC &gt;76</th>
                        <th className="py-3 px-3 font-bold text-center">Frekuensi Jalan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/60">
                      {insightsData.averages.map((avg) => (
                        <tr key={avg.machineNumber} className="hover:bg-amber-50/50 transition-colors">
                          <td className="py-2.5 px-3.5 text-center font-black text-slate-800">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-xs">
                              M-{avg.machineNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                            {avg.avgProductionKg > 0 ? (
                              <>
                                {avg.avgProductionKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                                <span className="text-[10px] font-normal text-slate-500">kg</span>
                              </>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                            {avg.avgRollCount > 0 ? avg.avgRollCount.toFixed(1) : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-red-600">
                            {avg.avgAfalanKg > 0 ? (
                              <>
                                {avg.avgAfalanKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                                <span className="text-[10px] font-normal text-slate-500">kg</span>
                              </>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {avg.totalQcFailed > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-xs">
                                {avg.totalQcFailed} roll
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs font-semibold">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-xs text-slate-600 font-semibold">
                            {avg.activeShiftsCount} shift
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[11px] text-amber-800 mt-2.5 italic text-center">
                *Data di atas mengevaluasi performa murni per shift berjalan, tanpa tercampur atau terasumsi dengan shift lain.
              </p>
            </section>

            {/* RIWAYAT DETAIL SHIFT KE SHIFT DENGAN FILTER DROPDOWN KATEGORI */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Rincian Tiap Shift Operasional
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Menampilkan {filteredShifts.length} dari {insightsData.shiftDetails.length} shift tercatat
                  </p>
                </div>

                {/* DROPDOWN KATEGORI */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Pilihan Mode Pengkategorian */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-500 pl-2 pr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-slate-400" /> Kategori:
                    </span>
                    <select
                      value={filterMode}
                      onChange={(e) => handleFilterModeChange(e.target.value as any)}
                      aria-label="Pilih Jenis Kategori Waktu"
                      className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="all">Semua Shift</option>
                      <option value="date">Per Tanggal</option>
                      <option value="week">Per Minggu</option>
                      <option value="month">Per Bulan</option>
                      <option value="year">Per Tahun</option>
                    </select>
                  </div>

                  {/* Dropdown Spesifik sesuai Kategori Terpilih */}
                  {filterMode !== "all" && (
                    <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200 p-1 rounded-xl animate-slide-down">
                      <span className="text-[11px] font-semibold text-amber-900 pl-2 pr-1 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-600" /> Pilih:
                      </span>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        aria-label="Pilih Periode Waktu Spesifik"
                        className="bg-white border border-amber-300 text-xs font-bold text-amber-950 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer max-w-[200px] truncate"
                      >
                        <option value="ALL">Semua ({filterMode.toUpperCase()})</option>
                        {categoryOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {filteredShifts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
                  Tidak ada data shift untuk kategori yang dipilih.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredShifts.map((shift) => {
                    const wkt = parseWkt(shift.dateOpened);
                    return (
                      <div
                        key={shift.sessionId}
                        className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 hover:border-amber-300 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <span className="bg-amber-500 text-white font-black px-3 py-1 rounded-xl text-xs">
                              Shift {shift.shiftNumber}
                            </span>
                            <div>
                              <h3 className="font-bold text-slate-800 text-sm">
                                {wkt.d} <span className="text-slate-400 font-normal">({wkt.t} WIB)</span>
                              </h3>
                              <p className="text-[11px] text-slate-500">Admin: {shift.adminName}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200">
                              Total: {shift.totalShiftProductionKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg ({shift.totalShiftRolls} roll)
                            </span>
                            {shift.totalShiftQcFailed > 0 && (
                              <span className="bg-red-50 text-red-700 font-bold px-2 py-1 rounded-lg border border-red-200 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> {shift.totalShiftQcFailed} QC
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
                          {shift.machines.map((m) => {
                            const isOperating = m.rollCount > 0 || m.productionKg > 0 || m.afalanKg > 0;
                            return (
                              <div
                                key={m.machineNumber}
                                className={`rounded-xl p-2.5 border ${
                                  isOperating
                                    ? "bg-slate-50 border-slate-200"
                                    : "bg-slate-50/30 border-slate-100 opacity-40"
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-200">
                                  <span className="font-black text-slate-800 text-xs">
                                    M-{m.machineNumber}
                                  </span>
                                  {m.operators.length > 0 && (
                                    <span className="text-[10px] text-slate-500 truncate max-w-[80px]" title={m.operators.join(", ")}>
                                      {m.operators.join(", ")}
                                    </span>
                                  )}
                                </div>

                                {isOperating ? (
                                  <div className="space-y-0.5 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-slate-500">Hasil:</span>
                                      <span className="font-bold text-emerald-700">
                                        {m.productionKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-slate-400">Roll:</span>
                                      <span className="font-semibold text-blue-700">{m.rollCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-slate-500">Afalan:</span>
                                      <span className="font-bold text-red-600">
                                        {m.afalanKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg
                                      </span>
                                    </div>
                                    {m.qcFailedCount > 0 && (
                                      <div className="mt-1 pt-1 border-t border-red-200 flex justify-between items-center text-[10px] text-red-600 font-bold">
                                        <span>QC &gt;76:</span>
                                        <span>{m.qcFailedCount} roll</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="py-2 text-center text-[10px] text-slate-400 italic">
                                    Tidak jalan
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
