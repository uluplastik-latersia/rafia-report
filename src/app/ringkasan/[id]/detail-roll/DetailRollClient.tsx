"use client";

import React, { useEffect } from "react";
import { Printer } from "lucide-react";

type Roll = {
  id: string;
  roll_code: string;
  weight_kg: number;
  machine_number: number;
  operator_code: string;
};

type Shift = {
  id: string;
  shift_number: number;
  admin_name: string;
  date_opened: string;
  status: string;
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

export default function DetailRollClient({ shift, rolls }: { shift: Shift; rolls: Roll[] }) {
  const wkt = parseWkt(shift.date_opened);
  const adminName = shift.admin_name && shift.admin_name !== '-' ? shift.admin_name : "Admin";
  
  const totalWeight = rolls.reduce((sum, r) => sum + r.weight_kg, 0);

  const handlePrint = () => window.print();

  // Buat baris tabel — 6 pasang [No, Kode] per baris, urutan kiri ke kanan
  const colPairs = 6;
  const tableRows: (Roll | null)[][] = [];
  for (let i = 0; i < rolls.length; i += colPairs) {
    const row: (Roll | null)[] = [];
    for (let c = 0; c < colPairs; c++) {
      row.push(i + c < rolls.length ? rolls[i + c] : null);
    }
    tableRows.push(row);
  }

  // Trigger print otomatis jika query parameter autoPrint ada, opsional saja
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("autoPrint=true")) {
      setTimeout(() => window.print(), 500);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* ACTION BUTTONS */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex-1 bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
        >
          <Printer className="w-5 h-5" /> Cetak A4 Landscape
        </button>
      </div>

      {/* DOKUMEN PRINT */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print:shadow-none print:border-none print:rounded-none print:p-0">

        {/* PRINT CSS — Landscape A4, margin minimal, sel super rapat */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { size: A4 landscape; margin: 5mm 5mm 5mm 5mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; background: white; }
            .print\\:hidden { display: none !important; }
            .print-doc { padding: 0 !important; }
            .print-doc * { font-size: 9pt; color: black; }
            .print-doc h1 { font-size: 14pt !important; }
            .print-doc .shift-info { font-size: 11pt !important; }
            .print-doc .info-label { font-size: 7pt !important; }
            .print-doc .info-value { font-size: 9pt !important; }
            .sj-roll-table { width: 100% !important; border-collapse: collapse !important; }
            .sj-roll-table th { border: 1px solid #333 !important; padding: 1px 3px !important; font-size: 11pt !important; background: #eee !important; text-align: center; white-space: nowrap; }
            .sj-roll-table td { border: 1px solid #333 !important; padding: 0px 3px !important; font-size: 11pt !important; line-height: 1.4; white-space: nowrap; }
            .sj-roll-table .col-no { width: 22px !important; text-align: center; }
            .sj-roll-table .col-code { text-align: left; }
            thead { display: table-header-group; }
            .print-footer { font-size: 7pt !important; margin-top: 4px !important; }
          }
        `}} />

        <div className="print-doc">
          {/* HEADER DOKUMEN */}
          <div className="border-b-2 border-black pb-3 mb-3">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-black uppercase tracking-wide">Detail Roll Produksi</h1>
                <p className="text-sm font-semibold text-gray-500 mt-0.5">PT UPL — Produk Tali Rafia</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider info-label">Shift</p>
                <p className="font-bold font-mono text-base shift-info text-primary print:text-black">SHIFT {shift.shift_number}</p>
              </div>
            </div>
          </div>

          {/* INFO TABLE */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 mb-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase info-label">Tanggal Dibuka</p>
              <p className="font-semibold info-value" suppressHydrationWarning>{wkt.full}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase info-label">Pencatat / Admin</p>
              <p className="font-semibold info-value">{adminName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase info-label">Status Shift</p>
              <p className="font-semibold info-value uppercase">{shift.status}</p>
            </div>
          </div>

          {/* SUMMARY BAR */}
          <div className="flex items-center justify-between bg-gray-100 print:bg-gray-100 rounded-lg px-4 py-2 mb-3 text-sm font-bold border border-gray-300">
            <span>Total: {rolls.length} Roll</span>
            <span>Berat Total: {totalWeight.toFixed(1)} kg</span>
          </div>

          {/* ROLL TABLE */}
          <div className="overflow-x-auto">
            <table className="sj-roll-table w-full text-xs border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {Array.from({ length: colPairs }).map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="col-no border border-gray-300 px-1 py-0.5 text-center font-bold text-[10px]">NO</th>
                      <th className="col-code border border-gray-300 px-1 py-0.5 text-left font-bold text-[10px]">KODE ROLL</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((item, colIdx) => {
                      const globalIdx = rowIdx * colPairs + colIdx + 1;
                      return (
                        <React.Fragment key={colIdx}>
                          <td className="col-no border border-gray-200 px-0.5 py-0 text-center text-gray-500 text-[10px]">
                            {item ? globalIdx : ""}
                          </td>
                          <td className="col-code border border-gray-200 px-1 py-0 font-mono font-semibold text-[10px]">
                            {item ? item.roll_code : ""}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4 border-t border-gray-200 pt-2 print-footer">
            Dokumen ini dibuat oleh Sistem PWA Stok Rafia UPL.
          </p>
        </div>
      </div>
    </div>
  );
}
