import { db } from "@/lib/db";
import { getSessionRolls, getOperators } from "@/actions/inbound";
import { getSessionWastes } from "@/actions/waste";
import SummaryClient from "./SummaryClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SummaryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const shiftId = params.id;
  
  // Ambil data shift berdasarkan ID & system_stats
  const [shiftResult, statsResult] = await db.batch([
    {
      sql: "SELECT * FROM shift_sessions WHERE id = ?",
      args: [shiftId]
    },
    "SELECT * FROM system_stats"
  ]);
  
  const row = shiftResult.rows[0];
  const shift = row ? JSON.parse(JSON.stringify(row)) : null;
  const statsRow = statsResult.rows[0];
  const systemStats = statsRow ? JSON.parse(JSON.stringify(statsRow)) : null;

  if (!shift) {
    return (
      <div className="p-6 text-center mt-10">
        <h2 className="text-xl font-bold mb-2">Data Shift Tidak Ditemukan</h2>
        <p className="text-gray-500 mb-6">Mungkin URL salah atau data telah dihapus.</p>
        <Link href="/ringkasan" className="px-6 py-3 bg-primary text-white rounded-xl font-bold">
          Kembali ke Riwayat
        </Link>
      </div>
    );
  }

  const rolls = await getSessionRolls(shift.id);
  const wastes = await getSessionWastes(shift.id);
  const operators = await getOperators();

  return (
    <div className="bg-background min-h-screen print:bg-white print:p-0">
      <div className="p-4 print:hidden flex items-center justify-between border-b border-border bg-surface">
        <div className="flex items-center gap-3">
            <Link href="/ringkasan" className="p-2 bg-background rounded-full">
            <ArrowLeft className="w-5 h-5 text-foreground-muted" />
            </Link>
            <h1 className="font-bold text-lg">Arsip Laporan Shift {shift.shift_number}</h1>
        </div>
      </div>
      
      <SummaryClient 
        shift={shift}
        rolls={rolls as any[]}
        wastes={wastes as any[]}
        operators={operators as any[]}
        systemStats={systemStats}
      />
    </div>
  );
}
