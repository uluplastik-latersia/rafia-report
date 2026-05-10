import { getCurrentWeekInsights } from "@/actions/insights";
import { TrendingUp, TrendingDown, Calendar, Medal } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export default async function InsightMesin() {
  const insights = await getCurrentWeekInsights();

  return (
    <section className="mt-6 bg-surface rounded-2xl p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
          <Medal className="w-4 h-4 text-amber-500" />
          Insight Mesin (Minggu Ini)
        </h2>
        <span className="text-xs text-foreground-muted">Min - Jum</span>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-6 text-sm text-foreground-muted bg-background rounded-xl border border-dashed border-border">
          Belum ada data produksi minggu ini.
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div key={insight.date} className="bg-background rounded-xl p-3 border border-border flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="flex items-center gap-2 min-w-[120px]">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">
                  {format(parseISO(insight.date), "EEEE, dd MMM", { locale: id })}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 w-full sm:w-auto flex-1 justify-end">
                {/* Top Produksi */}
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex-1 sm:flex-none">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Produksi Tertinggi</p>
                    <p className="text-sm font-bold text-emerald-900">
                      Mesin {insight.topProductionMachine || "-"} <span className="text-xs font-normal text-emerald-700">({insight.topProductionKg.toLocaleString("id-ID")} kg)</span>
                    </p>
                  </div>
                </div>
                
                {/* Top Afalan */}
                <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 flex-1 sm:flex-none">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <div>
                    <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wider">Afalan Tertinggi</p>
                    <p className="text-sm font-bold text-red-900">
                      Mesin {insight.topAfalanMachine || "-"} <span className="text-xs font-normal text-red-700">({insight.topAfalanKg.toLocaleString("id-ID")} kg)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
