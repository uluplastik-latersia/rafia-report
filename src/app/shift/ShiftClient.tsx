"use client";

import { useState, useEffect, useRef } from "react";
import { openShift } from "@/actions/shift";
import { submitRoll, deleteRoll } from "@/actions/inbound";
import { upsertMachineWaste } from "@/actions/waste";
import { useRouter } from "next/navigation";
import { Save, Trash2, Box, RotateCcw, X, LogOut } from "lucide-react";

export default function ShiftClient({
  activeShift,
  operators,
  rolls,
  wastes
}: {
  activeShift: any;
  operators: any[];
  rolls: any[];
  wastes: any[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeMachine, setActiveMachine] = useState<number>(1);

  // State Input Roll
  const [weightStr, setWeightStr] = useState<string>("");
  const [operatorCode, setOperatorCode] = useState<string>("");

  // State Waste Sementara (untuk UI & debouncing auto-save)
  const [localWastes, setLocalWastes] = useState<Record<number, { afalan: string, prongkalan: string }>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal Penutupan Shift
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [bahanBakuSak, setBahanBakuSak] = useState(0);
  const [sisaSablon, setSisaSablon] = useState(0);
  const [ppHijauKg, setPpHijauKg] = useState(0);
  const [sapuanKg, setSapuanKg] = useState(0);
  const [sapuanKotorKg, setSapuanKotorKg] = useState(0);
  const [adminName, setAdminName] = useState("");
  const [karyawan, setKaryawan] = useState(0);

  // Inisialisasi Waste State dari Server Data
  useEffect(() => {
    if (!activeShift) return;
    const initialWastes: any = {};
    for (let i = 1; i <= 7; i++) {
      const w = wastes.find(cw => cw.machine_number === i);
      initialWastes[i] = {
        afalan: w ? w.afalan_kg.toString() : "",
        prongkalan: w ? w.prongkalan_kg.toString() : ""
      };
    }
    setLocalWastes(initialWastes);

    // Load Last Selected Operator and Machine
    const memMachine = localStorage.getItem("shiftMachine");
    if (memMachine) setActiveMachine(Number(memMachine));

    // Setup Operator for that machine if saved
    const memOp = localStorage.getItem(`shiftOp_${memMachine || 1}`);
    if (memOp) setOperatorCode(memOp);

  }, [activeShift, wastes]);

  // Handler Buka Shift
  const handleOpenShift = async () => {
    setLoading(true);
    try {
      await openShift();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Saat Mesin dipilih
  const changeTab = (m: number) => {
    setActiveMachine(m);
    localStorage.setItem("shiftMachine", m.toString());
    const memOp = localStorage.getItem(`shiftOp_${m}`);
    setOperatorCode(memOp || "");
    setWeightStr("");
  };

  // Saat ganti operator
  const changeOperator = (code: string) => {
    setOperatorCode(code);
    localStorage.setItem(`shiftOp_${activeMachine}`, code);
  };

  // Auto-Save Waste Handlers
  const handleWasteChange = (key: 'afalan' | 'prongkalan', value: string) => {
    setLocalWastes(prev => ({
      ...prev,
      [activeMachine]: { ...prev[activeMachine], [key]: value }
    }));

    // Debounce Save to Server
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        await upsertMachineWaste({
          session_id: activeShift.id,
          machine_number: activeMachine,
          // Mengambil nilai terbaru langsung dari state parameter yang akan dirender (pakai state terbaru jika ada)
          afalan_kg: key === 'afalan' ? Number(value) : Number(localWastes[activeMachine]?.afalan || 0),
          prongkalan_kg: key === 'prongkalan' ? Number(value) : Number(localWastes[activeMachine]?.prongkalan || 0),
        });
        // Tidak perlu router.refresh() karena state lokal sudah sinkron
      } catch (e: any) {
        console.error("Gagal auto-save waste", e);
      }
    }, 1500); // 1.5 second debounce
  };

  // Handler Simpan Roll
  const handleSaveRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightStr || !operatorCode) return;

    setLoading(true);
    try {
      const weight = parseFloat(weightStr);
      if (isNaN(weight) || weight <= 0) throw new Error("Berat tidak valid!");

      await submitRoll({
        weight_kg: weight,
        operator_code: operatorCode,
        machine_number: activeMachine,
        session_id: activeShift.id,
      });

      setWeightStr(""); // Kosongkan cuma angkanya
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoll = async (rollId: string, weight: number) => {
    if (!confirm("Hapus Roll ini? Selesai dihapus, stok akan berkurang.")) return;
    try {
      await deleteRoll(rollId, weight);
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Tutup shift ini secara permanen? Stok HR dan Global akan terarsip.")) return;
    setLoading(true);
    try {
      import('@/actions/shift').then(async ({ closeShift }) => {
        await closeShift(activeShift.id, {
          bahanBaku: bahanBakuSak,
          sisaSablon: sisaSablon,
          ppHijau: ppHijauKg,
          sapuan: sapuanKg,
          sapuanKotor: sapuanKotorKg,
          adminName: adminName || "Admin",
          karyawan: karyawan
        });
        setIsClosingModalOpen(false);
        router.push(`/ringkasan/${activeShift.id}`);
      });
    } catch (err: any) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  // State Jika Belum Ada Shift
  if (!activeShift) {
    return (
      <button
        onClick={handleOpenShift}
        disabled={loading}
        className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg active:scale-95 transition-all disabled:opacity-50"
      >
        {loading ? "Membuka Sesi..." : "🚀 MULAI SIKLUS SHIFT SEKARANG"}
      </button>
    );
  }

  // Filter Rolls & Stats untuk Mesin Aktif
  const machineRolls = rolls.filter(r => r.machine_number === activeMachine);
  const totalMachineRolls = machineRolls.length;
  const totalMachineWeight = machineRolls.reduce((acc, curr) => acc + curr.weight_kg, 0);

  return (
    <div className="space-y-4">

      {/* HEADER COMMAND CENTER */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Shift {activeShift.shift_number} Aktif</h1>
          <p className="text-xs text-foreground-muted">Command Center Mesin</p>
        </div>
        <button
          onClick={() => setIsClosingModalOpen(true)}
          className="px-4 py-2 bg-danger text-white text-sm font-bold rounded-xl active:scale-95 transition-transform shadow-sm flex items-center gap-1"
        >
          <LogOut className="w-4 h-4" /> Tutup Shift
        </button>
      </div>

      {/* TABS MESIN */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4, 5, 6, 7].map(m => (
          <button
            key={m}
            onClick={() => changeTab(m)}
            className={`px-5 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex-shrink-0 ${activeMachine === m
                ? "bg-primary text-white shadow-md"
                : "bg-surface text-foreground-muted border border-border"
              }`}
          >
            Mesin {m}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-2xl p-4 shadow-sm border border-border">
        {/* INFO SUMMARY MESIN INI */}
        <div className="grid grid-cols-2 gap-3 mb-5 border-b border-border pb-4">
          <div>
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Total Hasil</h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">{totalMachineWeight.toFixed(1)}</span>
              <span className="text-sm font-medium text-foreground-muted">kg</span>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Jumlah Roll</h3>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {totalMachineRolls} <span className="text-sm font-medium text-foreground-muted">pcs</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveRoll} className="space-y-4">
          {/* OPERATOR */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex justify-between">
              <span>Nama Operator</span>
            </label>
            <select
              value={operatorCode}
              onChange={(e) => changeOperator(e.target.value)}
              required
              className="w-full p-3 bg-background border border-border rounded-xl font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="" disabled>-- Pilih Operator Mesin Ini --</option>
              {operators.map(op => (
                <option key={op.code} value={op.code}>{op.name} ({op.code})</option>
              ))}
            </select>
          </div>

          {/* AFALAN & PRONGKALAN (AUTO-SAVE) */}
          <div className="grid grid-cols-2 gap-3 bg-red-50 p-3 rounded-xl border border-red-100 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-danger flex items-center justify-between">
                Afalan (kg)
                <RotateCcw className="w-3 h-3 text-danger/50" />
              </label>
              <input
                type="number"
                min="0" step="0.1" inputMode="decimal" pattern="[0-9]*"
                placeholder="0.0"
                value={localWastes[activeMachine]?.afalan || ""}
                onChange={(e) => handleWasteChange('afalan', e.target.value)}
                className="w-full p-2 bg-white border border-red-200 text-danger rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-danger"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-danger flex items-center justify-between">
                Prongkalan (kg)
                <RotateCcw className="w-3 h-3 text-danger/50" />
              </label>
              <input
                type="number"
                min="0" step="0.1" inputMode="decimal" pattern="[0-9]*"
                placeholder="0.0"
                value={localWastes[activeMachine]?.prongkalan || ""}
                onChange={(e) => handleWasteChange('prongkalan', e.target.value)}
                className="w-full p-2 bg-white border border-red-200 text-danger rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-danger"
              />
            </div>
            <div className="col-span-2 text-[10px] text-danger/70 text-center italic">
              Mengubah angka Waste akan otomatis tersimpan (Auto-Save).
            </div>
          </div>

          <hr className="border-border my-2" />

          {/* INPUT ROLL BARU */}
          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-semibold text-foreground text-center block">Input Berat Roll Baru (Kg)</label>
            <div className="flex gap-3">
              <input
                type="number"
                value={weightStr}
                onChange={(e) => setWeightStr(e.target.value)}
                required
                min="0.1"
                step="0.1"
                inputMode="decimal"
                pattern="[0-9]*"
                placeholder="Contoh: 65.5"
                className="w-full p-4 bg-emerald-50 border-2 border-emerald-200 text-center rounded-xl text-3xl font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:text-emerald-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-md"
          >
            <Save className="w-6 h-6" />
            {loading ? "Menyimpan..." : "SIMPAN ROLL"}
          </button>
        </form>
      </div>

      {/* RIWAYAT MESIN */}
      <div>
        <h2 className="text-sm font-semibold text-foreground-muted mb-3 flex items-center gap-2">
          <Box className="w-4 h-4" />
          Riwayat Roll Mesin {activeMachine}
        </h2>

        {machineRolls.length === 0 ? (
          <p className="text-xs text-center text-foreground-muted py-8 bg-surface rounded-xl border border-dashed border-border">
            Belum ada roll di-input untuk mesin ini.
          </p>
        ) : (
          <div className="space-y-2">
            {machineRolls.map((roll) => {
              // Quality Control Logic: Highlight if > 75.99kg
              const isFailedQC = roll.weight_kg > 75.99;
              return (
                <div
                  key={roll.id}
                  className={`p-3 rounded-xl border flex items-center justify-between shadow-sm transition-colors ${isFailedQC ? "bg-red-50 border-red-300" : "bg-surface border-border"
                    }`}
                >
                  <div>
                    <h4 className={`font-mono font-bold ${isFailedQC ? 'text-red-700' : 'text-foreground'}`}>
                      {roll.roll_code}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-xs ${isFailedQC ? 'text-red-600 font-semibold' : 'text-foreground-muted'}`}>
                        Op: {roll.operator_code}
                      </p>
                      {isFailedQC && (
                        <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded-sm font-bold tracking-wider">
                          ⚠️ &gt;75.99
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-black text-lg ${isFailedQC ? 'text-red-700' : 'text-primary'}`}>
                      {roll.weight_kg} <span className="text-xs font-normal opacity-70">kg</span>
                    </span>
                    <button
                      onClick={() => handleDeleteRoll(roll.id, roll.weight_kg)}
                      className="p-2 text-danger/80 hover:bg-danger/10 hover:text-danger rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL TUTUP SHIFT */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsClosingModalOpen(false)}
              className="absolute top-4 right-4 text-foreground-muted hover:text-danger bg-background rounded-full p-1 border border-border"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-danger flex items-center gap-2 mb-1">Tutup Shift {activeShift.shift_number}</h2>
            <p className="text-xs text-foreground-muted mb-5">Lengkapi data global sebelum mengakhiri laporan.</p>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Nama Pencatat</label>
                  <input
                    type="text" required placeholder="Misal: Andi"
                    value={adminName} onChange={e => setAdminName(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg font-bold focus:ring-2 focus:ring-danger outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Jml Karyawan Hadir</label>
                  <input
                    type="number" min="1" step="1" inputMode="numeric" pattern="[0-9]*" required placeholder="Misal: 7"
                    value={karyawan || ""} onChange={e => setKaryawan(Number(e.target.value))}
                    className="w-full p-2 bg-background border border-border rounded-lg font-bold focus:ring-2 focus:ring-danger outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Pakai Sablon A (Sak)</label>
                  <input
                    type="number" min="0" step="1" inputMode="numeric" pattern="[0-9]*" required placeholder="Misal: 12"
                    value={bahanBakuSak || ""} onChange={e => setBahanBakuSak(Number(e.target.value))}
                    className="w-full p-2 bg-background border border-border rounded-lg font-bold focus:ring-2 focus:ring-danger outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Sisa Sablon A (Sak)</label>
                  <input
                    type="number" min="0" step="1" inputMode="numeric" pattern="[0-9]*" required placeholder="Misal: 2"
                    value={sisaSablon || ""} onChange={e => setSisaSablon(Number(e.target.value))}
                    className="w-full p-2 bg-background border border-border rounded-lg font-bold focus:ring-2 focus:ring-danger outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Sapuan Bersih/Global (kg)</label>
                  <input
                    type="number" min="0" step="0.1" inputMode="decimal" pattern="[0-9]*" required placeholder="Misal: 10.2"
                    value={sapuanKg || ""} onChange={e => setSapuanKg(Number(e.target.value))}
                    className="w-full p-2 bg-background border border-border rounded-lg font-bold focus:ring-2 focus:ring-danger outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Sapuan Kotor (kg)</label>
                  <input
                    type="number" min="0" step="0.1" inputMode="decimal" pattern="[0-9]*" required placeholder="Misal: 1.5"
                    value={sapuanKotorKg || ""} onChange={e => setSapuanKotorKg(Number(e.target.value))}
                    className="w-full p-2 bg-background border border-border rounded-lg font-bold focus:ring-2 focus:ring-danger outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Sisa PP Hijau Muda (kg)</label>
                <input
                  type="number" min="0" step="0.1" inputMode="decimal" pattern="[0-9]*" required placeholder="Misal: 5.5"
                  value={ppHijauKg || ""} onChange={e => setPpHijauKg(Number(e.target.value))}
                  className="w-full p-2 bg-background border border-border rounded-lg font-bold focus:ring-2 focus:ring-danger outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 bg-danger text-white font-bold rounded-xl active:scale-95 transition-all shadow-md"
              >
                {loading ? "Memproses..." : "FINALISASI & TUTUP SHIFT"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
