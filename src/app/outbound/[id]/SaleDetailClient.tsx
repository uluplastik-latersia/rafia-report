"use client";

import React, { useState } from "react";
import { Printer, Share2, Search, CheckCircle2, XCircle, Truck, RotateCcw, Check } from "lucide-react";

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

  // --- STATE DEDIKASI VERIFIKASI PEMUATAN ---
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSearchResult, setLastSearchResult] = useState<{
    status: "idle" | "found" | "not_found";
    item: SaleItem | null;
    index: number;
    searchedCode: string;
  }>({
    status: "idle",
    item: null,
    index: -1,
    searchedCode: "",
  });

  // State pencatatan roll terverifikasi (Checked)
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

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

  // Lakukan Pengecekan Kode Roll
  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = searchQuery.trim().toUpperCase();
    if (!cleanQuery) return;

    // Cari di dalam array items (exact / partial match)
    const foundIdx = items.findIndex(
      (item) => item.roll_code.toUpperCase() === cleanQuery || item.roll_code.toUpperCase().includes(cleanQuery)
    );

    if (foundIdx !== -1) {
      const foundItem = items[foundIdx];
      setLastSearchResult({
        status: "found",
        item: foundItem,
        index: foundIdx + 1,
        searchedCode: cleanQuery,
      });

      // Otomatis tandai sebagai checked jika belum
      if (!checkedIds.includes(foundItem.id)) {
        setCheckedIds((prev) => [...prev, foundItem.id]);
      }
    } else {
      setLastSearchResult({
        status: "not_found",
        item: null,
        index: -1,
        searchedCode: cleanQuery,
      });
    }
  };

  const handleResetSearch = () => {
    setSearchQuery("");
    setLastSearchResult({
      status: "idle",
      item: null,
      index: -1,
      searchedCode: "",
    });
  };

  const toggleCheckRoll = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Buat baris tabel — 6 pasang [No, Kode] per baris
  const colPairs = 6;
  const tableRows: (SaleItem | null)[][] = [];
  for (let i = 0; i < items.length; i += colPairs) {
    const row: (SaleItem | null)[] = [];
    for (let c = 0; c < colPairs; c++) {
      row.push(i + c < items.length ? items[i + c] : null);
    }
    tableRows.push(row);
  }

  const checkedCount = checkedIds.length;
  const progressPct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ACTION BUTTONS & VERIFIKASI PEMUATAN */}
      <div className="space-y-4 print:hidden">
        {/* UTILITY BUTTONS */}
        <div className="flex gap-3">
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

        {/* KOTAK PROSES PEMUATAN / CEK KODE ROLL */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-700">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">Pengecekan Roll (Pemuatan Truk)</h2>
                <p className="text-xs text-foreground-muted">Ketik/scan kode roll saat dimasukkan ke truk kustomer</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto bg-background px-3 py-1.5 rounded-xl border border-border">
              <span className="text-xs text-foreground-muted font-medium">Terverifikasi:</span>
              <span className="text-sm font-bold text-primary">{checkedCount} / {items.length} Roll</span>
              <span className="text-xs font-semibold text-emerald-600">({progressPct}%)</span>
            </div>
          </div>

          {/* FORM CARI / CEK ROLL */}
          <form onSubmit={handleVerify} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari / Scan Kode Roll (contoh: BPG-71.2-KON)..."
                className="w-full bg-background border border-border rounded-xl pl-11 pr-10 py-3 text-sm font-mono font-semibold uppercase placeholder:font-sans placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground p-1"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white font-bold px-5 rounded-xl flex items-center justify-center gap-1.5 shrink-0 text-sm shadow-sm active:scale-95 transition-all"
            >
              Cek Roll
            </button>
          </form>

          {/* BANNER HASIL HASIL PENGECEKAN */}
          {lastSearchResult.status === "found" && lastSearchResult.item && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 slide-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      ✅ ROLL VALID (NO. #{lastSearchResult.index})
                    </span>
                    <span className="text-xs font-semibold text-emerald-800">
                      Terdaftar di Surat Jalan ini
                    </span>
                  </div>
                  <p className="text-lg font-bold font-mono text-emerald-950">
                    {lastSearchResult.item.roll_code}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs font-medium text-emerald-800 bg-white/70 p-2 rounded-lg border border-emerald-200">
                    <div>Berat: <strong className="text-emerald-950">{lastSearchResult.item.weight_kg} kg</strong></div>
                    <div>Mesin: <strong className="text-emerald-950">Mesin {lastSearchResult.item.machine_number}</strong></div>
                    <div>Operator: <strong className="text-emerald-950">{lastSearchResult.item.operator_code}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {lastSearchResult.status === "not_found" && (
            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 slide-in">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="bg-red-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    🚨 PERINGATAN: KODE ROLL TIDAK DITEMUKAN!
                  </span>
                  <p className="text-base font-bold text-red-950">
                    Kode &quot;<span className="font-mono">{lastSearchResult.searchedCode}</span>&quot; TIDAK ADA di Surat Jalan ini!
                  </p>
                  <p className="text-xs font-semibold text-red-800">
                    JANGAN dimasukkan ke truk kustomer ini. Mohon periksa kembali kode atau fisik roll.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PROGRESS BAR & CLEAR BUTTON */}
          {checkedCount > 0 && (
            <div className="flex items-center justify-between gap-3 text-xs border-t border-border pt-3">
              <div className="flex-1 bg-background rounded-full h-2.5 overflow-hidden border border-border">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <button
                onClick={() => setCheckedIds([])}
                className="text-foreground-muted hover:text-red-600 flex items-center gap-1 font-semibold transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Checklist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SURAT JALAN DOCUMENT */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print:shadow-none print:border-none print:rounded-none print:p-0">

        {/* PRINT CSS — Landscape A4, margin minimal, sel super rapat */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { size: A4 landscape; margin: 5mm 5mm 5mm 5mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
            .print\\:hidden { display: none !important; }
            .print-doc { padding: 0 !important; }
            .print-doc * { font-size: 9pt; }
            .print-doc h1 { font-size: 14pt !important; }
            .print-doc .sj-number { font-size: 11pt !important; }
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
          {/* HEADER SURAT JALAN */}
          <div className="border-b-2 border-black pb-3 mb-3">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-black uppercase tracking-wide">Surat Jalan</h1>
                <p className="text-sm font-semibold text-gray-500 mt-0.5">PT UPL — Produk Tali Rafia</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider info-label">No. Dokumen</p>
                <p className="font-bold font-mono text-base sj-number">{sjNumber}</p>
              </div>
            </div>
          </div>

          {/* INFO TABLE */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 mb-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase info-label">Tanggal Dibuat</p>
              <p className="font-semibold info-value" suppressHydrationWarning>{wkt.full}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase info-label">No. Polisi</p>
              <p className="font-semibold info-value">{sale.nopol || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase info-label">PIC / Admin</p>
              <p className="font-semibold info-value">{sale.pic_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase info-label">Tujuan / Pembeli</p>
              <p className="font-semibold info-value">{sale.buyer_name}</p>
            </div>
          </div>

          {/* SUMMARY BAR */}
          <div className="flex items-center justify-between bg-gray-100 print:bg-gray-100 rounded-lg px-4 py-2 mb-3 text-sm font-bold border border-gray-300">
            <span>Total: {sale.total_rolls} Roll</span>
            <span>Berat: {sale.total_weight_kg.toFixed(1)} kg</span>
          </div>

          {/* ROLL TABLE — 6 pasang [NO | KODE] per baris */}
          <div className="overflow-x-auto">
            <table className="sj-roll-table w-full text-xs border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {Array.from({ length: colPairs }).map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="col-no border border-gray-300 px-1 py-0.5 text-center font-bold text-[10px]">NO</th>
                      <th className="col-code border border-gray-300 px-1 py-0.5 text-left font-bold text-[10px]">KODE</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((item, colIdx) => {
                      const globalIdx = rowIdx * colPairs + colIdx + 1;
                      const isFoundItem = lastSearchResult.status === "found" && lastSearchResult.item?.id === item?.id;
                      const isChecked = item ? checkedIds.includes(item.id) : false;

                      return (
                        <React.Fragment key={colIdx}>
                          <td className={`col-no border border-gray-200 px-0.5 py-0 text-center text-[10px] transition-colors ${
                            isFoundItem
                              ? "bg-amber-300 text-amber-950 font-bold"
                              : isChecked
                              ? "bg-emerald-200 text-emerald-950 font-bold"
                              : "text-gray-500"
                          }`}>
                            {item ? globalIdx : ""}
                          </td>
                          <td
                            onClick={() => item && toggleCheckRoll(item.id)}
                            title={item ? "Klik untuk tandai terverifikasi" : undefined}
                            className={`col-code border border-gray-200 px-1 py-0 font-mono font-semibold text-[10px] cursor-pointer transition-colors ${
                              isFoundItem
                                ? "bg-amber-200 text-amber-950 ring-2 ring-amber-500 font-bold scale-[1.02]"
                                : isChecked
                                ? "bg-emerald-100 text-emerald-950 font-bold"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            <span className="flex items-center justify-between gap-1">
                              {item ? item.roll_code : ""}
                              {isChecked && <Check className="w-3 h-3 text-emerald-600 shrink-0 print:hidden" />}
                            </span>
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
