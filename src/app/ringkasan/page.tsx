import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Clock, FileText, ChevronDown } from "lucide-react";

export const dynamic = "force-dynamic";

function getTzDate(dbStr: string | null) {
  const safeDateStr = dbStr ? (dbStr.includes('T') ? dbStr : dbStr.replace(' ', 'T') + 'Z') : new Date().toISOString();
  return new Date(safeDateStr);
}

export default async function RingkasanListPage() {
  const result = await db.execute(`
    SELECT * FROM shift_sessions 
    WHERE status = 'CLOSED' 
    ORDER BY date_closed DESC
  `);
  
  const closedShifts = result.rows.map(r => JSON.parse(JSON.stringify(r)));

  // Grouping logic (Year -> Month -> Week -> Day)
  const grouped: Record<string, Record<string, Record<string, Record<string, any[]>>>> = {};
  
  closedShifts.forEach((shift: any) => {
    const dt = getTzDate(shift.date_opened || shift.date_closed);
    
    const year = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", year: 'numeric' });
    const month = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", month: 'long' });
    const dayName = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", weekday: 'long' });
    const dayDate = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: 'numeric', month: 'short' });
    
    // Convert locally exact day number for simple Week tracking
    const dStr = dt.toLocaleString("en-US", { timeZone: "Asia/Jakarta", day: 'numeric' });
    const weekNum = Math.ceil(parseInt(dStr, 10) / 7);
    
    const yKey = `${year}`;
    const mKey = `${month}`;
    const wKey = `Minggu ke-${weekNum}`;
    const dKey = `${dayName}, ${dayDate}`;
    
    if (!grouped[yKey]) grouped[yKey] = {};
    if (!grouped[yKey][mKey]) grouped[yKey][mKey] = {};
    if (!grouped[yKey][mKey][wKey]) grouped[yKey][mKey][wKey] = {};
    if (!grouped[yKey][mKey][wKey][dKey]) grouped[yKey][mKey][wKey][dKey] = [];
    
    grouped[yKey][mKey][wKey][dKey].push(shift);
  });

  return (
    <div className="space-y-6 pb-12 slide-in mt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 bg-surface rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Arsip Produksi
          </h1>
          <p className="text-xs text-foreground-muted">Riwayat shift yang sudah ditutup</p>
        </div>
      </div>

      <div className="space-y-4">
        {closedShifts.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-dashed border-border rounded-2xl">
              <p className="text-foreground-muted text-sm">Belum ada riwayat shift yang ditutup.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([yKey, months], i) => (
            <details key={yKey} className="group border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden" open={i === 0}>
              <summary className="p-4 bg-gray-50 border-b border-gray-100 font-black text-gray-800 cursor-pointer flex justify-between items-center outline-none">
                <span className="text-lg tracking-tight">Tahun {yKey}</span>
                <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              
              <div className="p-3 sm:p-4 space-y-3 bg-white">
                {Object.entries(months).map(([mKey, weeks], j) => (
                  <details key={mKey} className="group/month border border-gray-200 rounded-xl overflow-hidden" open={i === 0 && j === 0}>
                    <summary className="p-3 bg-slate-50 border-b border-gray-100 font-bold text-slate-800 cursor-pointer flex justify-between items-center text-sm outline-none">
                      <span>Bulan {mKey}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400 group-open/month:rotate-180 transition-transform" />
                    </summary>
                    
                    <div className="p-2 sm:p-3 space-y-2 bg-slate-50/50">
                      {Object.entries(weeks).map(([wKey, days], k) => (
                        <details key={wKey} className="group/week bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm" open={i === 0 && j === 0 && k === 0}>
                          <summary className="p-2.5 bg-blue-50/50 border-b border-gray-100 font-semibold text-blue-900 cursor-pointer flex justify-between items-center text-xs uppercase outline-none">
                            <span>{wKey}</span>
                            <ChevronDown className="w-4 h-4 text-blue-300 group-open/week:rotate-180 transition-transform" />
                          </summary>
                          
                          <div className="p-3 space-y-4">
                            {Object.entries(days).map(([dKey, shifts]) => (
                               <div key={dKey}>
                                 <h4 className="text-xs font-bold text-gray-400 mb-2 border-b border-gray-100 pb-1">{dKey}</h4>
                                 <div className="space-y-2">
                                   {shifts.map((shift) => {
                                      const dt = getTzDate(shift.date_opened || shift.date_closed);
                                      const timeStr = dt.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: '2-digit', minute:'2-digit', hour12: false });
                                      const adminName = shift.admin_name && shift.admin_name !== '-' ? shift.admin_name : "Admin";

                                      return (
                                        <Link 
                                          key={shift.id} 
                                          href={`/ringkasan/${shift.id}`}
                                          className="block bg-surface p-3 rounded-lg border border-gray-200 hover:border-primary transition-all active:scale-[0.98] shadow-sm relative overflow-hidden"
                                        >
                                          <div className="absolute top-0 left-0 w-1 h-full bg-primary/80"></div>
                                          <div className="flex items-center justify-between pl-2">
                                            <div>
                                              <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                                                  <FileText className="w-3.5 h-3.5 text-primary" /> Shift {shift.shift_number}
                                              </h3>
                                              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                                                  <Clock className="w-3 h-3" /> {timeStr} WIB | Gp: {adminName}
                                              </p>
                                            </div>
                                            <div className="bg-primary/10 text-primary px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                                              Buka
                                            </div>
                                          </div>
                                        </Link>
                                      )
                                   })}
                                 </div>
                               </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
