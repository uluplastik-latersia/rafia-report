import { getCurrentWeekInsights } from "@/actions/insights";
import { ArrowLeft, Settings, Calendar, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function InsightMesinPage() {
  const data = await getCurrentWeekInsights();

  return (
    <div className="space-y-6 pb-12 max-w-lg mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-4 bg-surface p-4 rounded-b-3xl shadow-sm border-b border-border">
        <Link href="/" className="p-2 bg-background border border-border rounded-xl active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-500" />
            Insight Mesin
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Pantauan Produksi & Afalan per Mesin</p>
        </div>
      </div>

      <div className="px-4 space-y-6">
        
        {/* RATA-RATA MINGGUAN */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Rata-rata Mingguan (Per Hari)
          </h2>
          
          <div className="bg-white rounded-xl overflow-hidden border border-amber-100 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-amber-100/50 text-amber-900 text-xs">
                <tr>
                  <th className="py-2.5 px-3 font-semibold w-20 text-center">Mesin</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Avg Produksi</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Avg Afalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {data.averages.map((avg) => (
                  <tr key={avg.machineNumber} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-2 px-3 text-center font-bold text-gray-700">M-{avg.machineNumber}</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                      {avg.avgProductionKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} <span className="text-xs font-normal">kg</span>
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-red-700">
                      {avg.avgAfalanKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} <span className="text-xs font-normal">kg</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-amber-700 mt-3 italic text-center">
            *Dihitung berdasarkan pembagian total hasil minggu ini dengan jumlah hari operasional ({data.daysCount} hari).
          </p>
        </section>

        {/* DATA HARIAN */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-foreground-muted flex items-center gap-2 pl-1">
            <Calendar className="w-4 h-4" />
            Riwayat Harian (Minggu Ini)
          </h2>

          {data.dailyDetails.length === 0 ? (
            <div className="text-center py-10 bg-surface border border-dashed border-border rounded-2xl text-foreground-muted text-sm">
              Belum ada riwayat produksi minggu ini.
            </div>
          ) : (
            data.dailyDetails.map((day) => (
              <div key={day.date} className="bg-surface rounded-2xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-gray-800">
                    {format(parseISO(day.date), "EEEE, dd MMMM yyyy", { locale: id })}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                  {day.machines.map((machine) => (
                    <div key={machine.machineNumber} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="font-bold text-gray-800 text-xs mb-2 pb-1 border-b border-gray-200">
                        Mesin {machine.machineNumber}
                      </div>
                      
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" /> Hasil
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          {machine.productionKg.toLocaleString("id-ID")} kg
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-red-500" /> Afalan
                        </span>
                        <span className="text-xs font-bold text-red-700">
                          {machine.afalanKg.toLocaleString("id-ID")} kg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

      </div>
    </div>
  );
}
