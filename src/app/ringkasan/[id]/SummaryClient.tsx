"use client";

import { useState } from "react";
import { closeShift } from "@/actions/shift";
import { useRouter } from "next/navigation";
import { Printer, Copy, CheckCircle, AlertTriangle, Check } from "lucide-react";

// Helper konversi format SQLite UTC ke Timezone WIB Indonesia (Format 24 Jam)
function parseWkt(dbDate: string | null) {
  if (!dbDate) return { d: '-', t: '-' };
  const safeIso = dbDate.includes('T') ? dbDate : dbDate.replace(' ', 'T') + 'Z';
  const dt = new Date(safeIso);
  const d = dt.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' });
  const t = dt.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
  return { d, t };
}

export default function SummaryClient({
  shift,
  rolls,
  wastes,
  operators,
  systemStats
}: {
  shift: any;
  rolls: any[];
  wastes: any[];
  operators: any[];
  systemStats?: any;
}) {
  const router = useRouter();
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  // Kalkulasi Otomatis berdasarkan yang sudah tersimpan di DB
  const bahanBakuSak = shift.bahan_baku_a_karung || 0;
  const sisaSablon = shift.sisa_sablon_a_karung || 0;
  const ppHijauKg = shift.pp_hijau_muda_kg || 0;
  const sapuanKg = shift.sapuan_kg || 0;
  const sapuanKotorKg = shift.sapuan_kotor_kg || 0;

  const totalSakKg = bahanBakuSak * 25;
  const afalanGlobal = wastes.reduce((acc, w) => acc + w.afalan_kg, 0);
  const prongkalanGlobal = wastes.reduce((acc, w) => acc + w.prongkalan_kg, 0);
  const totalWaste = afalanGlobal + prongkalanGlobal + sapuanKg + sapuanKotorKg;

  const totalRollsCount = rolls.length;
  const totalRollsKg = rolls.reduce((acc, r) => acc + r.weight_kg, 0);

  const penyusutan = (totalRollsKg + totalWaste) > 0
    ? (totalWaste / (totalRollsKg + totalWaste) * 100).toFixed(2)
    : "0.00";

  const qcFailedRolls = rolls.filter(r => r.weight_kg > 75.99);

  // Status Kehadiran Karyawan (dari User Input)
  const totalOperators = shift.jumlah_karyawan || 0;

  // Bangun rincian per mesin
  const activeMachines = Array.from(new Set([...wastes.map(w => w.machine_number), ...rolls.map(r => r.machine_number)])).sort((a, b) => a - b);

  let machineDetailsText = "";
  if (activeMachines.length > 0) {
    machineDetailsText = "\n*4. DETAIL PER MESIN*\n";
    activeMachines.forEach(m => {
      const w = wastes.find(ws => ws.machine_number === m) || { afalan_kg: 0, prongkalan_kg: 0 };
      const mRolls = rolls.filter(r => r.machine_number === m);
      const totalHasil = mRolls.reduce((sum, r) => sum + r.weight_kg, 0);
      const opCode = mRolls[0]?.operator_code || "?";
      const opNameDoc = operators.find(o => o.code === opCode);
      const opName = opNameDoc ? opNameDoc.name : opCode;

      machineDetailsText += `[Mesin ${m}] - Op: ${opName}\n`;
      machineDetailsText += ` • Hasil: ${totalHasil.toFixed(1)} kg (${mRolls.length} roll)\n`;
      machineDetailsText += ` • Afalan: ${w.afalan_kg.toFixed(1)} kg | Prongkalan: ${w.prongkalan_kg.toFixed(1)} kg\n`;
    });
  }

  const showCopyFeedback = (status: "success" | "error") => {
    setCopyStatus(status);
    setTimeout(() => setCopyStatus("idle"), 3000); // Reset after 3 seconds
  };

  const handleCopyWA = () => {
    // Parsing Aman dengan Helper baru Timezone WIB
    const wkt = parseWkt(shift.date_opened);

    const text = `*LAPORAN PRODUKSI RAFIA UPL*
🗓️ Tanggal: ${wkt.d}
⏰ Jam Timbang: ${wkt.t} WIB
⏱️ Shift: ${shift.shift_number}

*1. HASIL PRODUKSI*
• Pencatat: ${shift.admin_name && shift.admin_name !== '-' ? shift.admin_name : 'Admin'}
• Total Roll: ${totalRollsCount} pcs
• Berat Produksi: ${totalRollsKg.toFixed(1)} kg
• Jumlah Operator: ${totalOperators} orang

*2. PEMAKAIAN BAHAN BAKU*
• Sablon A Dipakai: ${bahanBakuSak} Sak (${totalSakKg.toFixed(1)} kg)
• Sisa Sablon A: ${sisaSablon} Sak
• Sisa PP Hijau: ${ppHijauKg.toFixed(1)} kg

*3. WASTE & PENYUSUTAN*
• Afalan: ${afalanGlobal.toFixed(1)} kg
• Prongkalan: ${prongkalanGlobal.toFixed(1)} kg
• Sapuan Global: ${sapuanKg.toFixed(1)} kg
• Sapuan Kotor: ${sapuanKotorKg.toFixed(1)} kg
• *Persentase Penyusutan: ${penyusutan} %*
${machineDetailsText}
*5. CATATAN QC*
• Gagal QC (>75.99kg): ${qcFailedRolls.length} roll

*6. INFORMASI INVENTORY (LIVE)*
• Stok Gudang: ${systemStats?.current_stock_kg?.toFixed(1) || '0.0'} kg
• HR Mesin: ${systemStats?.current_hr_kg?.toFixed(1) || '0.0'} kg

_Laporan di-Buat secara otomatis oleh Sistem._`;

    // --- IOS SAFARI COMPATIBILITY FIX ---
    // Safari requires clipboard access to be strictly synchronous with user activation.
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => showCopyFeedback("success"))
        .catch((err) => {
          console.error("Async Copy failed, trying fallback...", err);
          fallbackCopy(text);
        });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    // Khusus iOS: Select dan Set Selection Range
    textArea.focus();
    textArea.setSelectionRange(0, 99999);
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showCopyFeedback("success");
      } else {
        showCopyFeedback("error");
      }
    } catch (err) {
      showCopyFeedback("error");
    }
    document.body.removeChild(textArea);
  };

  const wktBuka = parseWkt(shift.date_opened);
  const adminName = shift.admin_name && shift.admin_name !== '-' ? shift.admin_name : "Admin";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 print:p-0 print:m-0 print:max-w-none print:w-full slide-in">

      {/* HEADER CETAK (Tampil jelas di print) */}
      <div className="text-center mb-2 pb-1 border-b-2 border-black hidden print:block">
        <h1 className="text-[12pt] font-black uppercase">LAPORAN PRODUKSI TALI RAFIA UPL - SHIFT {shift.shift_number}</h1>
        <p suppressHydrationWarning className="text-[9pt] font-medium">Tgl Dibuka: {wktBuka.d} - {wktBuka.t} WIB | Pencatat: <strong>{adminName}</strong></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:w-full">
        {/* KOLOM KIRI: ACTION BUTTONS */}
        <div className="lg:col-span-1 space-y-6 print:hidden">

          <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-3">
            <h2 className="font-bold text-lg text-primary mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Status: {shift.status}
            </h2>
            <div className="text-sm space-y-1 text-foreground-muted">
              <p>Dilaporkan: {bahanBakuSak} sak Sablon A</p>
              <p>Sisa PP: {ppHijauKg} kg</p>
              <p>Sapuan: {sapuanKg} kg</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="py-4 bg-blue-600 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer touch-manipulation"
            >
              <Printer className="w-6 h-6" />
              <span>Cetak A4 / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleCopyWA}
              className={`py-4 font-bold rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer touch-manipulation ${
                copyStatus === "success" ? "bg-emerald-500 text-white" :
                copyStatus === "error" ? "bg-red-500 text-white" :
                "bg-emerald-600 text-white"
              }`}
            >
              {copyStatus === "success" ? <Check className="w-6 h-6 animate-pulse" /> : <Copy className="w-6 h-6" />}
              <span>
                {copyStatus === "success" ? "Berhasil Disalin!" :
                 copyStatus === "error" ? "Gagal Menyalin" :
                 "Copy WA Laporan"}
              </span>
            </button>
          </div>
        </div>

        {/* KOLOM KANAN: DOKUMEN PREVIEW (PRINTABLE ZONE) */}
        <div className="lg:col-span-2 bg-white text-black p-6 md:p-8 rounded-2xl shadow-md border border-gray-200 print:shadow-none print:border-none print:p-0 print:block print:w-full overflow-hidden">

          <div className="flex flex-wrap justify-between items-center bg-gray-50 border border-gray-400 print:border-black p-2 mb-3 text-center print:bg-transparent print:rounded-none rounded-xl gap-2">
            <div className="flex-1"><span className="text-[9pt] font-bold text-gray-500 print:text-black uppercase block md:inline md:mr-1">Total Roll:</span><strong className="text-[11pt]">{totalRollsCount}</strong></div>
            <div className="flex-1"><span className="text-[9pt] font-bold text-gray-500 print:text-black uppercase block md:inline md:mr-1">Berat Prod:</span><strong className="text-[11pt]">{totalRollsKg.toFixed(1)} kg</strong></div>
            <div className="flex-1"><span className="text-[9pt] font-bold text-gray-500 print:text-black uppercase block md:inline md:mr-1">Penyusutan:</span><strong className="text-[11pt] text-red-600 print:text-black">{penyusutan}%</strong></div>
            <div className="flex-1"><span className="text-[9pt] font-bold text-gray-500 print:text-black uppercase block md:inline md:mr-1">Jml Operator:</span><strong className="text-[11pt]">{totalOperators}</strong></div>
          </div>

          <h3 className="font-bold text-[11pt] mb-1 print:mt-1">Detail Produksi Per Mesin</h3>
          <div className="overflow-x-auto w-full print:overflow-visible print:w-full">
            <table className="w-full mb-3 text-[9pt] border-collapse border border-gray-400 print:border-black print:text-black">
              <thead className="bg-gray-100 print:bg-transparent text-[9pt]">
                <tr className="border-b border-gray-400 print:border-black">
                  <th className="p-2 text-center border-r border-gray-400 print:border-black font-bold print:w-16">Mesin</th>
                  <th className="p-2 text-center border-r border-gray-400 print:border-black font-bold print:w-24">Operator</th>
                  <th className="p-2 text-center border-r border-gray-400 print:border-black font-bold">Rincian Berat Tiap Roll (kg)</th>
                  <th className="p-2 text-center border-r border-gray-400 print:border-black font-bold print:w-14">roll</th>
                  <th className="p-2 text-center border-r border-gray-400 print:border-black font-bold print:w-20">Total (KG)</th>
                  <th className="p-2 text-center border-r border-gray-400 print:border-black font-bold print:w-20">Afalan</th>
                  <th className="p-2 text-center border-gray-400 print:border-black font-bold print:w-20">Prongkolan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 print:divide-black">
                {[1, 2, 3, 4, 5, 6, 7].map(m => {
                  const mRolls = rolls.filter(r => r.machine_number === m);
                  if (mRolls.length === 0) return null; // Sembunyikan mesin non-aktif

                  const mWeight = mRolls.reduce((sum, r) => sum + r.weight_kg, 0);
                  const mWaste = wastes.find(w => w.machine_number === m);

                  // Cari operator dominan di mesin ini
                  const opSet = Array.from(new Set((mRolls || []).map(r => r?.operator_code).filter(Boolean)));
                  const opNamesArray = opSet.map(code => {
                    const opObj = (operators || []).find(o => o?.code === code);
                    return opObj ? opObj.name : code;
                  });
                  const opNames = opNamesArray.join(", ");

                  // Rincian data roll (String berjejer koma)
                  const rollDetails = mRolls.map(r => r.weight_kg.toFixed(1)).join(", ");

                  return (
                    <tr key={m} className="border-b border-gray-400 print:border-black">
                      <td className="p-[2px] px-1 text-center print:text-black border-r border-gray-400 print:border-black">{m}</td>
                      <td className="p-[2px] px-1 text-center print:text-black border-r border-gray-400 print:border-black capitalize text-[9pt]">{opNames}</td>
                      <td className="p-[3px] px-1 text-left print:text-black border-r border-gray-400 print:border-black leading-snug break-words whitespace-normal text-[9pt]">
                        {rollDetails}
                      </td>
                      <td className="p-[2px] px-1 text-center print:text-black border-r border-gray-400 print:border-black font-semibold">{mRolls.length}</td>
                      <td className="p-[2px] px-1 text-center print:text-black border-r border-gray-400 print:border-black font-semibold">{mWeight.toFixed(1)}</td>
                      <td className="p-[2px] px-1 text-center print:text-black border-r border-gray-400 print:border-black">{mWaste ? mWaste.afalan_kg : "0.0"}</td>
                      <td className="p-[2px] px-1 text-center print:text-black">{mWaste ? mWaste.prongkalan_kg : "0.0"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-12 text-[9pt]">
            <div className="flex-1">
              <h3 className="font-bold border-b border-gray-400 print:border-black pb-1 mb-1 text-[10pt] uppercase">Rincian Stok & Waste</h3>
              <table className="w-full text-left border-none print:border-none">
                <tbody className="divide-y divide-gray-200 print:divide-black">
                  <tr>
                    <td className="py-1 print:py-0.5 print:border-none">Sablon A Dipakai:</td>
                    <td className="py-1 print:py-0.5 print:border-none text-right font-bold">{bahanBakuSak} Sak ({totalSakKg} kg)</td>
                  </tr>
                  <tr>
                    <td className="py-1 print:py-0.5 print:border-none">Sisa Sablon A:</td>
                    <td className="py-1 print:py-0.5 print:border-none text-right font-bold">{sisaSablon} Sak</td>
                  </tr>
                  <tr>
                    <td className="py-1 print:py-0.5 print:border-none">Sisa PP Hijau:</td>
                    <td className="py-1 print:py-0.5 print:border-none text-right font-bold">{ppHijauKg} kg</td>
                  </tr>
                  <tr>
                    <td className="py-1 print:py-0.5 print:border-none">Sapuan Bersih (Global):</td>
                    <td className="py-1 print:py-0.5 print:border-none text-right font-bold">{sapuanKg} kg</td>
                  </tr>
                  <tr>
                    <td className="py-1 print:py-0.5 print:border-none">Sapuan Kotor:</td>
                    <td className="py-1 print:py-0.5 print:border-none text-right font-bold">{sapuanKotorKg} kg</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex-1">
              <h3 className="font-bold border-b border-gray-400 print:border-black pb-1 mb-1 text-danger print:text-black uppercase">Roll Gagal QC (&gt;75.9kg)</h3>
              {qcFailedRolls.length === 0 ? (
                <p className="text-emerald-600 font-bold print:text-black">BERSIH ✅</p>
              ) : (
                <ul className="list-disc list-inside text-danger print:text-black font-semibold">
                  {qcFailedRolls.map(r => (
                    <li key={r.id}>{r.roll_code} ({r.weight_kg} kg) - Mesin {r.machine_number}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: A4 landscape; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; font-family: sans-serif; }
          * { font-size: 10pt !important; }
          
          /* Safe Padding directly applied to main container to prevent edges cut-off even if browser forces it margin 0 */
          .print\\:p-0 { padding: 2mm !important; }

          h1.text-\\[12pt\\] { font-size: 12.5pt !important; line-height: 1.1 !important; }
          .text-\\[11pt\\] { font-size: 11pt !important; line-height: 1.1 !important; }
          .text-\\[10pt\\] { font-size: 10.5pt !important; }
          .text-\\[9pt\\] { font-size: 10pt !important; }
          
          .font-black { font-weight: 900 !important; }
          .font-bold { font-weight: 700 !important; }
          
          /* Full A4 Print Canvas Resets */
          html, body {
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important; /* Force to 1 page */
          }
          
          /* Force width to fit landscape tightly minus padding */
          .max-w-4xl, .max-w-5xl { max-width: 100% !important; margin: auto !important; width: 100% !important; box-sizing: border-box !important; }
          .lg\\:col-span-2 { width: 100% !important; display: block !important; }
          
          /* Auto distribution to allow middle column to claim space */
          table { width: 100% !important; table-layout: auto !important; border-collapse: collapse !important; border: 1px solid black !important; }
          th, td { border: 1px solid black !important; padding: 2px 4px !important; }
          
          /* Rincian table reset borders */
          .border-none td { border: none !important; }
          
          /* Prevent page breaks */
          tr, div { page-break-inside: avoid; }
        }
      `}} />
    </div>
  );
}
