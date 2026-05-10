import { getMonthlyInsightsByMonthYear } from "@/actions/insights";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export default async function InsightMesinBulanan({ monthYear }: { monthYear: string }) {
  const insights = await getMonthlyInsightsByMonthYear(monthYear);

  if (insights.length === 0) return null;

  return (
    <div className="mt-12 break-inside-avoid">
      <div className="border-b-[3px] border-black pb-2 mb-4">
        <h3 className="text-lg font-bold text-gray-800 uppercase">Rekap Insight Mesin Harian</h3>
        <p className="text-xs text-gray-600">Mesin dengan Produksi dan Afalan tertinggi per hari</p>
      </div>

      <table className="w-full text-xs text-left border-collapse border border-gray-400">
        <thead>
          <tr className="bg-gray-100 text-black border-y border-gray-400">
            <th className="py-2 px-2 border-r border-gray-400 w-[120px]">Tanggal</th>
            <th className="py-2 px-2 border-r border-gray-400 text-center">Produksi Tertinggi</th>
            <th className="py-2 px-2 text-center">Afalan Tertinggi</th>
          </tr>
        </thead>
        <tbody>
          {insights.map((insight) => (
            <tr key={insight.date} className="border-b border-gray-300">
              <td className="py-2 px-2 border-r border-gray-300 font-semibold">
                {format(parseISO(insight.date), "dd MMM yyyy", { locale: id })}
              </td>
              <td className="py-2 px-2 border-r border-gray-300 text-center bg-emerald-50/50">
                {insight.topProductionMachine ? (
                  <div className="flex items-center justify-center gap-1 text-emerald-800">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-bold">Mesin {insight.topProductionMachine}</span>
                    <span className="text-emerald-600">({insight.topProductionKg.toLocaleString("id-ID")} kg)</span>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="py-2 px-2 text-center bg-red-50/50">
                {insight.topAfalanMachine ? (
                  <div className="flex items-center justify-center gap-1 text-red-800">
                    <TrendingDown className="w-3 h-3" />
                    <span className="font-bold">Mesin {insight.topAfalanMachine}</span>
                    <span className="text-red-600">({insight.topAfalanKg.toLocaleString("id-ID")} kg)</span>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
