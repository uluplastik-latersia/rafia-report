"use client";

import { Printer, Share2 } from "lucide-react";

type SaleItem = {
  id: string;
  roll_code: string;
  weight_kg: number;
  machine_number: number;
  operator_code: string;
};

type Sale = {
  id: string;
  pic_name: string;
  buyer_name: string;
  nopol: string;
  sale_datetime: string;
  total_weight_kg: number;
  total_rolls: number;
};

function parseWkt(dbStr: string | null) {
  if (!dbStr) return { full: "-" };
  const safe = dbStr.includes("T") ? dbStr : dbStr.replace(" ", "T") + "Z";
  const dt = new Date(safe);
  const d = dt.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const t = dt.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { full: `${d}, ${t} WIB` };
}

// Generate nomor SJ dari ID + tanggal
function generateSJNumber(id: string, dateStr: string | null): string {
  const safe = dateStr ? (dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z") : new Date().toISOString();
  const dt = new Date(safe);
  const ymd = dt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" })
    .split("/").reverse().join(""); // YYYYMMDD
  const suffix = id.slice(-4).toUpperCase();
  return `SJ-${ymd}-${suffix}`;
}

export default function SaleDetailClient({ sale, items }: { sale: Sale; items: SaleItem[] }) {
  const wkt = parseWkt(sale.sale_datetime);
  const sjNumber = generateSJNumber(sale.id, sale.sale_datetime);

  const handlePrint = () => window.print();

  const handleShareWA = () => {
    const text =
`*SURAT JALAN - ${sjNumber}*
📅 Tanggal: ${wkt.full}
👤 PIC: ${sale.pic_name}
🏪 Pembeli: ${sale.buyer_name}
${sale.nopol ? `🚛 No. Polisi: ${sale.nopol}` : ""}

📦 Total Roll: ${sale.total_rolls} pcs
⚖️ Total Berat: ${sale.total_weight_kg.toFixed(1)} kg

Dokumen ini dihasilkan oleh Sistem PWA Stok Rafia UPL.`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => alert("Berhasil disalin! Silakan paste di WhatsApp.")).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  function fallbackCopy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.top = "0"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try {
      document.execCommand("copy");
      alert("Berhasil disalin! Silakan paste di WhatsApp.");
    } catch {
      alert("Gagal menyalin. Silakan copy manual.");
    }
    document.body.removeChild(ta);
  }

  return (
    <div className="space-y-4">
      {/* ACTION BUTTONS */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex-1 bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
        >
          <Printer className="w-5 h-5" /> Cetak A4
        </button>
        <button
          onClick={handleShareWA}
          className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
        >
          <Share2 className="w-5 h-5" /> Copy WA
        </button>
      </div>

      {/* SURAT JALAN DOCUMENT */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print:shadow-none print:border-none print:rounded-none print:p-0">

        {/* PRINT CSS */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 15mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print\\:hidden { display: none !important; }
            * { font-size: 11pt; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border: 1px solid #000 !important; padding: 4px 6px !important; }
            thead { display: table-header-group; }
          }
        `}} />

        {/* HEADER SURAT JALAN */}
        <div className="border-b-2 border-black pb-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wide">Surat Jalan</h1>
              <p className="text-sm font-semibold text-gray-500 mt-0.5">PT / CV UPL — Produk Tali Rafia</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider">No. Dokumen</p>
              <p className="font-bold font-mono text-base">{sjNumber}</p>
            </div>
          </div>
        </div>

        {/* INFO TABLE */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Tanggal Keluar</p>
            <p className="font-semibold" suppressHydrationWarning>{wkt.full}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">No. Polisi</p>
            <p className="font-semibold">{sale.nopol || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">PIC / Admin</p>
            <p className="font-semibold">{sale.pic_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Tujuan / Pembeli</p>
            <p className="font-semibold">{sale.buyer_name}</p>
          </div>
        </div>

        {/* ROLL TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300 mb-6">
            <thead className="bg-gray-50 print:bg-transparent">
              <tr className="border-b-2 border-gray-300">
                <th className="border border-gray-300 p-2 text-center font-bold w-10">No</th>
                <th className="border border-gray-300 p-2 text-left font-bold">Kode Roll</th>
                <th className="border border-gray-300 p-2 text-center font-bold">Mesin</th>
                <th className="border border-gray-300 p-2 text-center font-bold">Operator</th>
                <th className="border border-gray-300 p-2 text-right font-bold">Berat (kg)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={`border-b border-gray-200 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                  <td className="border border-gray-200 p-2 text-center text-gray-500">{i + 1}</td>
                  <td className="border border-gray-200 p-2 font-mono font-semibold text-xs">{item.roll_code}</td>
                  <td className="border border-gray-200 p-2 text-center">{item.machine_number}</td>
                  <td className="border border-gray-200 p-2 text-center capitalize text-xs">{item.operator_code}</td>
                  <td className="border border-gray-200 p-2 text-right font-semibold">{item.weight_kg.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-800 bg-gray-100 print:bg-transparent font-bold">
                <td className="border border-gray-300 p-2 text-center" colSpan={4}>
                  TOTAL ({sale.total_rolls} Roll)
                </td>
                <td className="border border-gray-300 p-2 text-right">{sale.total_weight_kg.toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* TANDA TANGAN */}
        <div className="grid grid-cols-3 gap-4 mt-8 text-sm">
          {["Pengirim", "Penerima", "Supir / Kendaraan"].map((label) => (
            <div key={label} className="text-center">
              <p className="text-xs text-gray-500 mb-12 font-semibold uppercase">{label}</p>
              <div className="border-b border-gray-400 mb-1"></div>
              <p className="text-xs text-gray-400">(________________)</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 border-t border-gray-200 pt-3">
          Dokumen ini sah tanpa tanda tangan basah selama ada stempel perusahaan. Dibuat oleh Sistem PWA Stok Rafia UPL.
        </p>
      </div>
    </div>
  );
}
