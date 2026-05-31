import { db } from "@/lib/db";
import { Package, ClipboardList, TimerReset, Settings, Zap, ArrowRight, Grid, PlusCircle, Trash2, Truck, BookOpen } from "lucide-react";
import Link from "next/link";
import CloseBookButton from "./CloseBookButton";
// Force dynamic since dashboard data updates frequently
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Fetch all parallel queries inside a single Turso HTTP transaction for extreme speed
  const [statsRes, rollsRes, sablonRes] = await db.batch([
    "SELECT * FROM system_stats",
    "SELECT count(*) as count FROM rolls WHERE status = 'IN_STOCK'",
    "SELECT sisa_sablon_a_karung FROM shift_sessions WHERE status = 'CLOSED' ORDER BY date_closed DESC LIMIT 1"
  ]);

  const stats: any = statsRes.rows[0] || { current_stock_kg: 0, current_hr_kg: 0 };

  // Parse date string for HR Bulanan based on system_stats
  const getMonthName = (str: string) => {
    if (!str || !str.includes("-")) return "Tidak Diketahui";
    const parts = str.split("-");
    const monthIndex = parseInt(parts[0], 10) - 1;
    const year = parts[1];
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${months[monthIndex]} ${year}`;
  };
  const currentMonthStr = getMonthName(stats.current_month_year);

  // Parse total rolls in stock
  const totalRollsCount = rollsRes.rows[0]?.count || 0;

  // Parse sisa sablon A from last closed shift
  const sisaSablonKarung = Number(sablonRes.rows[0]?.sisa_sablon_a_karung || 0);
  const sisaSablonKg = sisaSablonKarung * 25;

  return (
    <div className="space-y-6">
      {/* STATS HIGHLIGHT */}
      <section className="bg-surface rounded-2xl p-5 shadow-sm border border-border">
        <h2 className="text-sm font-semibold text-foreground-muted mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Ringkasan Database
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-primary/10 rounded-xl p-4 flex justify-between items-center border border-primary/20">
            <div>
              <p className="text-sm font-medium text-primary-dark">Stok Gudang Total</p>
              <h3 className="text-3xl font-bold text-primary">{stats.current_stock_kg.toLocaleString("id-ID", { minimumFractionDigits: 1 })} <span className="text-base font-normal">kg</span></h3>
            </div>
            <Package className="w-10 h-10 text-primary opacity-80" />
          </div>

          <div className="bg-sky-50 rounded-xl p-4 flex justify-between items-center border border-sky-200">
            <div>
              <p className="text-sm font-medium text-sky-700">Total Stok Roll</p>
              <h3 className="text-3xl font-bold text-sky-800">{String(totalRollsCount)} <span className="text-base font-normal">Roll</span></h3>
            </div>
            <Package className="w-10 h-10 text-sky-500 opacity-80" />
          </div>

          <div className="bg-secondary/10 rounded-xl p-4 flex flex-col justify-between border border-secondary/20">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium text-secondary">HR Mesin ({currentMonthStr})</p>
                <h3 className="text-3xl font-bold text-secondary">{stats.current_hr_kg.toLocaleString("id-ID", { minimumFractionDigits: 1 })} <span className="text-base font-normal">kg</span></h3>
              </div>
              <TimerReset className="w-10 h-10 text-secondary opacity-80" />
            </div>
            
            <CloseBookButton currentMonthYear={stats.current_month_year} />
          </div>

          <div className="bg-amber-50 rounded-xl p-4 flex justify-between items-center border border-amber-200">
            <div>
              <p className="text-sm font-medium text-amber-700">Sisa Sablon A</p>
              <h3 className="text-3xl font-bold text-amber-800">{sisaSablonKg} <span className="text-base font-normal">kg</span></h3>
            </div>
            <Package className="w-10 h-10 text-amber-500 opacity-80" />
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS GRID */}
      <section>
        <h2 className="text-sm font-semibold text-foreground-muted mb-3 flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          Aksi Cepat Menu
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {/* Menu 1: Command Center */}
          <Link
            href="/shift"
            className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform shadow-sm"
          >
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full">
              <Package className="w-8 h-8" />
            </div>
            <span className="font-bold text-emerald-800 text-sm text-center">Command Center<br />(Shift & Produksi)</span>
          </Link>

          {/* Menu 2: Arsip Riwayat Produksi */}
          <Link
            href="/ringkasan"
            className="bg-surface border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform shadow-sm"
          >
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
              <ClipboardList className="w-8 h-8" />
            </div>
            <span className="font-semibold text-sm text-center">Ringkasan<br />Produksi</span>
          </Link>

          {/* Menu 3: Arsip Penjualan */}
          <Link
            href="/arsip-penjualan"
            className="bg-surface border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform shadow-sm"
          >
            <div className="bg-orange-100 text-orange-600 p-3 rounded-full">
              <ClipboardList className="w-8 h-8" />
            </div>
            <span className="font-semibold text-sm text-center">Riwayat<br />Penjualan</span>
          </Link>

          {/* Menu 4: Penjualan */}
          <Link
            href="/outbound"
            className="bg-surface border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform shadow-sm"
          >
            <div className="bg-purple-100 text-purple-600 p-3 rounded-full">
              <Truck className="w-8 h-8" />
            </div>
            <span className="font-semibold text-sm text-center">Penjualan<br />(Surat Jalan)</span>
          </Link>
        </div>

        <div className="mt-3 lg:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6">
          <Link
            href="/laporan-bulanan"
            className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="text-left">
                 <h3 className="font-bold text-gray-900 text-sm">Buku Laporan Bulanan</h3>
                 <p className="text-xs text-foreground-muted">Cetak A4 / PDF seluruh hasil produksi bulan ini</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-600" />
          </Link>
          <Link
            href="/insight-mesin"
            className="bg-amber-50 border-2 border-amber-500 rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 text-amber-600 p-3 rounded-xl">
                <Settings className="w-6 h-6" />
              </div>
              <div className="text-left">
                 <h3 className="font-bold text-gray-900 text-sm">Insight Mesin</h3>
                 <p className="text-xs text-foreground-muted">Pantau rata-rata & performa harian per-mesin</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-600" />
          </Link>
          <Link
            href="/koreksi-data"
            className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-100 text-red-600 p-3 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                 <h3 className="font-bold text-gray-900 text-sm">Koreksi Data Roll</h3>
                 <p className="text-xs text-foreground-muted">Hapus data roll produksi yang salah input</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-red-600" />
          </Link>
        </div>
      </section>

    </div>
  );
}
