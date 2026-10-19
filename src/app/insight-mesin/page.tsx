import { getDetailedMachineInsights, getShiftMachineInsights, getCurrentWeekInsights } from "@/actions/insights";
import { ArrowLeft, Settings, Calendar, TrendingUp, TrendingDown, BarChart2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export const dynamic = "force-dynamic";

function parseWkt(dbDate: string | null) {
  if (!dbDate) return { d: "-", t: "-" };
  const safeIso = dbDate.includes("T") ? dbDate : dbDate.replace(" ", "T") + "Z";
  const dt = new Date(safeIso);
  const d = dt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });
  const t = dt.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
  return { d, t };
}

export default async function InsightMesinPage() {
  const data = await getShiftMachineInsights(100);

  return (
    <div className="space-y-6 pb-12 w-full lg:max-w-6xl xl:max-w-[95%] 2xl:max-w-[1800px] mx-auto px-4 lg:px-8">
      {/* HEADER */}
      <div className="flex items-center gap-4 bg-surface p-4 lg:p-6 lg:px-8 rounded-b-3xl shadow-sm border-b border-border">
        <Link href="/" className="p-2 bg-background border border-border rounded-xl active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-500" />
            Insight Mesin (Per Shift)
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Analisis akurat hasil produksi, afalan & QC per shift operasional</p>
        </div>
      </div>

      <div className="px-4 lg:px-8 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        
        {/* RATA-RATA PER SHIFT */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm lg:col-span-4 lg:sticky lg:top-6">
          <h2 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-amber-700" />
            Rata-rata per Shift Aktif
          </h2>
          <p className="text-xs text-amber-800/80 mb-4">
            Dihitung dari {data.shiftsCount} shift operasional terakhir.
          </p>
          
          <div className="bg-white rounded-xl overflow-hidden border border-amber-100 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-amber-100/60 text-amber-900 text-xs">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-center w-16">Mesin</th>
                  <th className="py-2.5 px-2 font-semibold text-right">Avg Hasil</th>
                  <th className="py-2.5 px-2 font-semibold text-right">Avg Roll</th>
                  <th className="py-2.5 px-2 font-semibold text-right">Avg Afalan</th>
                  <th className="py-2.5 px-2 font-semibold text-center text-red-700">QC &gt;76</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {data.averages.map((avg) => (
                  <tr key={avg.machineNumber} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-2 px-3 text-center font-bold text-gray-700">M-{avg.machineNumber}</td>
                    <td className="py-2 px-2 text-right font-semibold text-emerald-700">
                      {avg.avgProductionKg > 0 ? avg.avgProductionKg.toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "-"} <span className="text-[10px] font-normal text-gray-500">kg</span>
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-blue-700">
                      {avg.avgRollCount > 0 ? avg.avgRollCount.toFixed(1) : "-"}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-red-700">
                      {avg.avgAfalanKg > 0 ? avg.avgAfalanKg.toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "-"} <span className="text-[10px] font-normal text-gray-500">kg</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {avg.totalQcFailed > 0 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                          {avg.totalQcFailed}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-amber-700 mt-3 italic text-center">
            *Rata-rata dihitung hanya pada shift saat mesin tersebut beroperasi aktif.
          </p>
        </section>

        {/* DAFTAR PER SHIFT */}
        <section className="space-y-4 lg:col-span-8">
          <h2 className="text-sm font-bold text-foreground-muted flex items-center justify-between pl-1">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Riwayat Hasil per Shift Operasional
            </span>
            <span className="text-xs font-normal bg-gray-100 px-2.5 py-1 rounded-full text-gray-600">
              {data.shiftsCount} Shift Terakhir
            </span>
          </h2>

          {data.shiftDetails.length === 0 ? (
            <div className="text-center py-10 bg-surface border border-dashed border-border rounded-2xl text-foreground-muted text-sm">
              Belum ada riwayat shift yang tercatat.
            </div>
          ) : (
            data.shiftDetails.map((shift) => {
              const wkt = parseWkt(shift.dateOpened);
              return (
                <div key={shift.sessionId} className="bg-surface rounded-2xl p-4 md:p-5 shadow-sm border border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-border pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-primary/10 text-primary font-black px-3 py-1.5 rounded-xl text-sm">
                        Shift {shift.shiftNumber}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">
                          {wkt.d} <span className="text-gray-400 font-normal">({wkt.t} WIB)</span>
                        </h3>
                        <p className="text-xs text-gray-500">
                          Pencatat: <span className="font-semibold text-gray-700">{shift.adminName}</span>
                        </p>
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
                          className={`rounded-xl p-2.5 border transition-all ${
                            isOperating 
                              ? 'bg-gray-50/80 border-gray-200' 
                              : 'bg-gray-50/30 border-gray-100 opacity-40'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-gray-200">
                            <span className="font-black text-gray-800 text-xs">
                              M-{m.machineNumber}
                            </span>
                            {m.operators.length > 0 && (
                              <span className="text-[10px] text-gray-500 truncate max-w-[80px]" title={m.operators.join(", ")}>
                                {m.operators.join(", ")}
                              </span>
                            )}
                          </div>

                          {isOperating ? (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                  <TrendingUp className="w-3 h-3 text-emerald-500" /> Hasil
                                </span>
                                <span className="text-xs font-bold text-emerald-700">
                                  {m.productionKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-400">Roll</span>
                                <span className="text-xs font-semibold text-blue-700">{m.rollCount} roll</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                  <TrendingDown className="w-3 h-3 text-red-500" /> Afalan
                                </span>
                                <span className="text-xs font-bold text-red-700">
                                  {m.afalanKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg
                                </span>
                              </div>
                              {m.qcFailedCount > 0 && (
                                <div className="mt-1 pt-1 border-t border-red-200 flex justify-between items-center text-[10px] text-red-600 font-bold bg-red-50 px-1 rounded">
                                  <span>Gagal QC</span>
                                  <span>{m.qcFailedCount} roll</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-2 text-center text-[10px] text-gray-400 italic">
                              Tidak jalan
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>

      </div>
    </div>
  );
}
