import { getClosedMonths, getActiveMonth } from "@/actions/report";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarCheck, Calendar } from "lucide-react";

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

export default async function LaporanBulananPage() {
  const activeMonth = await getActiveMonth();
  const closedMonths = await getClosedMonths();

  return (
    <div className="space-y-6 pb-12 slide-in mt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 bg-surface rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Buku Bulanan
          </h1>
          <p className="text-xs text-foreground-muted">Rekapitulasi total laporan produksi</p>
        </div>
      </div>

      <div className="space-y-4">
        {activeMonth && (
          <div className="bg-white border-2 border-emerald-500/20 rounded-2xl p-1 shadow-sm">
            <Link 
              href={`/laporan-bulanan/${activeMonth}`}
              className="block p-4 flex items-center justify-between rounded-xl hover:bg-emerald-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Buku Aktif</p>
                  <h3 className="font-bold text-gray-900">{getMonthName(activeMonth)}</h3>
                </div>
              </div>
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </Link>
          </div>
        )}

        <div className="bg-white border border-border rounded-2xl p-4 overflow-hidden">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Arsip Buku Tertutup</h3>
           
           {closedMonths.length === 0 ? (
             <div className="text-center py-6">
                <p className="text-sm text-foreground-muted">Belum ada buku produksi bulan sebelumnya yang ditutup.</p>
             </div>
           ) : (
             <div className="space-y-2">
                {closedMonths.map((m: any) => {
                  const dateStr = new Date(m.closed_at).toLocaleDateString("id-ID", {
                    day: 'numeric', month: 'short', year: 'numeric'
                  });

                  return (
                    <Link 
                      key={m.id}
                      href={`/laporan-bulanan/${m.month_year}`}
                      className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 hover:border-gray-300 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-gray-200 text-gray-500 rounded-lg flex items-center justify-center">
                          <CalendarCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{getMonthName(m.month_year)}</h3>
                          <p className="text-[11px] text-gray-500 mt-0.5">Disahkan pada {dateStr}</p>
                        </div>
                      </div>
                      <BookOpen className="w-5 h-5 text-gray-300" />
                    </Link>
                  )
                })}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
