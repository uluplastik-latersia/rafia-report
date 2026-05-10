import { db } from "@/lib/db";
import { getMonthlyReportData } from "@/actions/report";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "./PrintButton";
import InsightMesinBulanan from "./InsightMesinBulanan";

export const dynamic = "force-dynamic";

function getMonthName(str: string) {
  if (!str.includes("-")) return str;
  const parts = str.split("-");
  const monthIndex = parseInt(parts[0], 10) - 1;
  const year = parts[1];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return `${months[monthIndex]} ${year}`;
}

export default async function MonthlyReportPage(props: { params: Promise<{ month_year: string }> }) {
  const params = await props.params;
  const monthYear = params.month_year;
  const data = await getMonthlyReportData(monthYear);

  return (
    <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white text-black font-sans">
      
      {/* Tombol Cetak / Navigasi (Hanya Muncul di Layar) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between px-4 print:hidden">
        <Link href="/laporan-bulanan" className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 shadow border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <PrintButton />
      </div>

      {/* KERTAS A4 */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl print:shadow-none print:w-full px-12 py-16 print:p-0 min-h-[29.7cm]">
        
        {/* KOP LAPORAN */}
        <div className="border-b-[3px] border-black pb-4 mb-6 text-center">
           <h1 className="text-2xl font-black uppercase tracking-wider mb-1">PT Uluplastik Latersia</h1>
           <h2 className="text-lg font-bold text-gray-800 uppercase">Laporan Hasil Produksi Bulanan</h2>
           <p className="text-sm font-semibold text-gray-600 mt-2">Periode Buku: {getMonthName(monthYear)}</p>
        </div>

        {/* TABEL DATA PADA LAYAR MOBILE AGAR BISA DIGESER (SCROLL) */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse mb-10 border border-gray-400 min-w-[700px]">
            <thead>
              <tr className="bg-gray-100 text-black border-y border-gray-400">
                <th className="py-3 px-2 border-r border-gray-400 text-center w-[40px]">No</th>
                <th className="py-3 px-2 border-r border-gray-400 w-[70px]">Tgl Shift</th>
                <th className="py-3 px-2 border-r border-gray-400 text-center">Admin</th>
                <th className="py-3 px-2 border-r border-gray-400 text-right">Jadi(Kg)</th>
                <th className="py-3 px-2 border-r border-gray-400 text-center">Roll</th>
                <th className="py-3 px-2 border-r border-gray-400 text-right">BB(Sak)</th>
                <th className="py-3 px-2 border-r border-gray-400 text-right">Sablon(Sak)</th>
                <th className="py-3 px-2 border-r border-gray-400 text-right">Hijau(Kg)</th>
                <th className="py-3 px-2 border-r border-gray-400 text-right">Sp.Bersih</th>
                <th className="py-3 px-2 border-r border-gray-400 text-right">Sp.Kotor</th>
                <th className="py-3 px-2 border-r border-gray-400 text-right">Af.Pelet</th>
                <th className="py-3 px-2 text-center w-[40px]">Kar</th>
              </tr>
            </thead>
            <tbody>
              {data.shifts.length === 0 ? (
                <tr>
                 <td colSpan={12} className="py-8 text-center text-gray-400 italic">Belum ada riwayat produksi di buku ini.</td>
                </tr>
              ) : (
                data.shifts.map((shift, idx) => {
                  const dt = new Date(shift.date_closed || shift.date_opened);
                  const dStr = dt.toLocaleDateString("id-ID", { day: '2-digit', month: 'short' });
                  
                  return (
                    <tr key={shift.id} className="border-b border-gray-300 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2 border-r border-gray-300 text-center">{idx + 1}</td>
                      <td className="py-2.5 px-2 border-r border-gray-300 font-semibold">{dStr} S{shift.shift_number}</td>
                      <td className="py-2.5 px-2 border-r border-gray-300 text-center truncate max-w-[80px]">{shift.admin_name || '-'}</td>
                      
                      <td className="py-2.5 px-2 border-r border-gray-300 text-right font-bold bg-green-50/30 text-green-800">
                        {(Number(shift.total_produksi_kg)||0).toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 border-r border-gray-300 text-center font-bold bg-green-50/30 text-green-800">
                        {shift.total_roll_pcs || 0}
                      </td>

                      <td className="py-2.5 px-2 border-r border-gray-300 text-right">{shift.bahan_baku_a_karung || 0}</td>
                      <td className="py-2.5 px-2 border-r border-gray-300 text-right">{shift.sisa_sablon_a_karung || 0}</td>
                      <td className="py-2.5 px-2 border-r border-gray-300 text-right">{shift.pp_hijau_muda_kg || 0}</td>
                      <td className="py-2.5 px-2 border-r border-gray-300 text-right">{shift.sapuan_kg || 0}</td>
                      <td className="py-2.5 px-2 border-r border-gray-300 text-right">{shift.sapuan_kotor_kg || 0}</td>
                      <td className="py-2.5 px-2 border-r border-gray-300 text-right">{shift.afalan_pelet_sak || 0}</td>
                      <td className="py-2.5 px-2 text-center text-gray-500">{shift.jumlah_karyawan || 0}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            
            {/* GRAND TOTAL ROW */}
            <tfoot>
              <tr className="bg-gray-800 text-white font-bold border-t-2 border-black">
                <td colSpan={3} className="py-3 px-2 border-r border-gray-600 text-right uppercase tracking-wider">Total Sebulan</td>
                <td className="py-3 px-2 border-r border-gray-600 text-right text-green-300">{data.total_produksi_kg.toFixed(1)}</td>
                <td className="py-3 px-2 border-r border-gray-600 text-center text-green-300">{data.total_roll_pcs}</td>
                <td className="py-3 px-2 border-r border-gray-600 text-right">{data.total_bahan_baku}</td>
                <td className="py-3 px-2 border-r border-gray-600 text-right">{data.total_sisa_sablon}</td>
                <td className="py-3 px-2 border-r border-gray-600 text-right">{data.total_pp_hijau.toFixed(1)}</td>
                <td className="py-3 px-2 border-r border-gray-600 text-right">{data.total_sapuan.toFixed(1)}</td>
                <td className="py-3 px-2 border-r border-gray-600 text-right">{data.total_sapuan_kotor.toFixed(1)}</td>
                <td className="py-3 px-2 border-r border-gray-600 text-right">{data.total_afalan_pelet_sak}</td>
                <td className="py-3 px-2 text-center">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* INSIGHT MESIN MINGGUAN / BULANAN */}
        <InsightMesinBulanan monthYear={monthYear} />

      </div>

    </div>
  );
}
