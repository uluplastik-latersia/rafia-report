import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Clock, ShoppingCart, ChevronDown, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

function getTzDate(dbStr: string | null) {
  const safeDateStr = dbStr ? (dbStr.includes('T') ? dbStr : dbStr.replace(' ', 'T') + 'Z') : new Date().toISOString();
  return new Date(safeDateStr);
}

export default async function ArsipPenjualanListPage() {
  const result = await db.execute(`
    SELECT * FROM sales 
    ORDER BY sale_datetime DESC
  `);
  
  const sales = result.rows.map(r => JSON.parse(JSON.stringify(r)));

  // Grouping logic (Year -> Month -> Week -> Day)
  const grouped: Record<string, Record<string, Record<string, Record<string, any[]>>>> = {};
  
  sales.forEach((sale: any) => {
    const dt = getTzDate(sale.sale_datetime);
    
    const year = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", year: 'numeric' });
    const month = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", month: 'long' });
    const dayName = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", weekday: 'long' });
    const dayDate = dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: 'numeric', month: 'short' });
    
    // Hitung minggu ke-N berdasarkan Senin sebagai awal minggu
    const localParts = dt.toLocaleString("en-US", { timeZone: "Asia/Jakarta", year: 'numeric', month: 'numeric', day: 'numeric' }).split('/');
    const localDate = new Date(Number(localParts[2]), Number(localParts[0]) - 1, Number(localParts[1]));
    const dayOfWeek = localDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayOfThisWeek = new Date(localDate);
    mondayOfThisWeek.setDate(localDate.getDate() + mondayOffset);
    const weekNum = Math.ceil(mondayOfThisWeek.getDate() / 7);
    
    const yKey = `${year}`;
    const mKey = `${month}`;
    const wKey = `Minggu ke-${weekNum}`;
    const dKey = `${dayName}, ${dayDate}`;
    
    if (!grouped[yKey]) grouped[yKey] = {};
    if (!grouped[yKey][mKey]) grouped[yKey][mKey] = {};
    if (!grouped[yKey][mKey][wKey]) grouped[yKey][mKey][wKey] = {};
    if (!grouped[yKey][mKey][wKey][dKey]) grouped[yKey][mKey][wKey][dKey] = [];
    
    grouped[yKey][mKey][wKey][dKey].push(sale);
  });

  return (
    <div className="space-y-6 pb-12 slide-in mt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 bg-surface rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Riwayat Penjualan
          </h1>
          <p className="text-xs text-foreground-muted">Arsip surat jalan & barang keluar</p>
        </div>
      </div>

      <div className="space-y-4">
        {sales.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-dashed border-border rounded-2xl">
              <ShoppingCart className="w-10 h-10 text-foreground-muted mx-auto mb-3 opacity-40" />
              <p className="text-foreground-muted text-sm">Belum ada transaksi penjualan.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([yKey, months], i) => (
            <details key={yKey} className="group border border-emerald-200 rounded-2xl bg-white shadow-sm overflow-hidden" open={i === 0}>
              <summary className="p-4 bg-emerald-50 border-b border-emerald-100 font-black text-emerald-900 cursor-pointer flex justify-between items-center outline-none">
                <span className="text-lg tracking-tight">Tahun {yKey}</span>
                <ChevronDown className="w-5 h-5 text-emerald-400 group-open:rotate-180 transition-transform" />
              </summary>
              
              <div className="p-3 sm:p-4 space-y-3 bg-white">
                {Object.entries(months).map(([mKey, weeks], j) => (
                  <details key={mKey} className="group/month border border-emerald-100 rounded-xl overflow-hidden" open={i === 0 && j === 0}>
                    <summary className="p-3 bg-emerald-50/50 border-b border-emerald-50 font-bold text-emerald-800 cursor-pointer flex justify-between items-center text-sm outline-none">
                      <span>Bulan {mKey}</span>
                      <ChevronDown className="w-4 h-4 text-emerald-300 group-open/month:rotate-180 transition-transform" />
                    </summary>
                    
                    <div className="p-2 sm:p-3 space-y-2 bg-slate-50/50">
                      {Object.entries(weeks).map(([wKey, days], k) => (
                        <details key={wKey} className="group/week bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm" open={i === 0 && j === 0 && k === 0}>
                          <summary className="p-2.5 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 cursor-pointer flex justify-between items-center text-xs uppercase outline-none">
                            <span>{wKey}</span>
                            <ChevronDown className="w-4 h-4 text-gray-300 group-open/week:rotate-180 transition-transform" />
                          </summary>
                          
                          <div className="p-3 space-y-4">
                            {Object.entries(days).map(([dKey, daySales]) => (
                               <div key={dKey}>
                                 <h4 className="text-xs font-bold text-gray-400 mb-2 border-b border-gray-100 pb-1">{dKey}</h4>
                                 <div className="space-y-2">
                                   {daySales.map((sale) => {
                                      const dt = getTzDate(sale.sale_datetime);
                                      const timeStr = dt.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: '2-digit', minute:'2-digit', hour12: false });
                                      
                                      return (
                                        <Link 
                                          key={sale.id} 
                                          href={`/outbound/${sale.id}`}
                                          className="block bg-surface p-3 rounded-lg border border-gray-200 hover:border-emerald-500 transition-all active:scale-[0.98] shadow-sm relative overflow-hidden"
                                        >
                                          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                                          <div className="flex items-center justify-between pl-2">
                                            <div className="flex-1 min-w-0 pr-2">
                                              <p className="font-bold text-gray-900 flex items-center gap-1.5 text-sm truncate">
                                                {sale.buyer_name}
                                              </p>
                                              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {timeStr} WIB | PIC: {sale.pic_name}
                                              </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                              <p className="text-xs font-black text-emerald-600">{sale.total_weight_kg.toFixed(1)} kg</p>
                                              <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{sale.total_rolls} roll</p>
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
