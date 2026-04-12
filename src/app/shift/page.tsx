import { getActiveShift } from "@/actions/shift";
import { getOperators, getSessionRolls } from "@/actions/inbound";
import { getSessionWastes } from "@/actions/waste";
import ShiftClient from "./ShiftClient";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

// Server component to fetch active shift state and pass to client component UI
export default async function ShiftPageRoute() {
  const activeShift = await getActiveShift();
  const operators = await getOperators();

  // Jika tidak ada shift aktif, tampilkan UI pembuka (Kondisi 1)
  if (!activeShift) {
    return (
      <div className="space-y-6 slide-in">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 bg-surface rounded-full shadow-sm">
            <ArrowLeft className="w-5 h-5 text-foreground-muted" />
          </Link>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Command Center
          </h1>
        </div>
        
        <div className="bg-surface rounded-2xl p-6 shadow-sm border border-border text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Sistem Siap!</h2>
            <p className="text-sm text-foreground-muted mt-2">
              Tidak ada shift yang berjalan. Klik tombol di bawah untuk memulai pencatatan produksi pada jam ini.
            </p>
          </div>
          <ShiftClient activeShift={null} operators={[]} rolls={[]} wastes={[]} />
        </div>
      </div>
    );
  }

  // Kondisi 2: Shift Sedang Aktif
  const rolls = await getSessionRolls(activeShift.id);
  const wastes = await getSessionWastes(activeShift.id);

  return (
    <div className="pb-12 slide-in mt-6">
      {/* Mengirim seluruh data terserialisasi ke dalam Client Component */}
      <ShiftClient 
        activeShift={activeShift} 
        operators={operators} 
        rolls={rolls as any[]} 
        wastes={wastes as any[]} 
      />
    </div>
  );
}
