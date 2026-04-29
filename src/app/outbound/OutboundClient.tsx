"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSale, findRollByCode } from "@/actions/outbound";
import {
  PackageCheck,
  Trash2,
  Search,
  ShoppingCart,
  ClipboardList,
  Clock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Filter,
  Layers,
  Plus,
  Minus,
} from "lucide-react";
import Link from "next/link";

type Roll = {
  id: string;
  roll_code: string;
  weight_kg: number;
  machine_number: number;
  operator_code: string;
  session_id?: string;
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

type ShiftWithStock = {
  id: string;
  shift_number: number;
  date_opened: string;
  admin_name: string;
  available_rolls: number;
  available_weight_kg: number;
};

type Props = {
  inStockRolls: Roll[];
  sales: Sale[];
  shiftsWithStock: ShiftWithStock[];
};

function parseWkt(dbStr: string | null) {
  if (!dbStr) return { d: "-", t: "-" };
  const safe = dbStr.includes("T") ? dbStr : dbStr.replace(" ", "T") + "Z";
  const dt = new Date(safe);
  return {
    d: dt.toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    t: dt.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

export default function OutboundClient({ inStockRolls, sales, shiftsWithStock }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // --- Form State ---
  const [picName, setPicName] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [nopol, setNopol] = useState("");

  // Roll yang sudah dipilih untuk surat jalan ini
  const [selectedRolls, setSelectedRolls] = useState<Roll[]>([]);

  // Pencarian roll
  const [searchCode, setSearchCode] = useState("");
  const [filterMachine, setFilterMachine] = useState<string>("all");
  const [searchResult, setSearchResult] = useState<Roll | null | "not_found" | "already_added" | "sold">(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --- Computed ---
  const totalWeight = selectedRolls.reduce((a, r) => a + r.weight_kg, 0);

  // Track shift IDs yang sudah dipilih secara penuh
  const selectedShiftIds = useMemo(() => {
    const shiftRollCounts: Record<string, number> = {};
    selectedRolls.forEach(r => {
      if (r.session_id) {
        shiftRollCounts[r.session_id] = (shiftRollCounts[r.session_id] || 0) + 1;
      }
    });
    // Shift dianggap "terpilih" jika jumlah roll terpilih >= jumlah available
    return new Set(
      shiftsWithStock
        .filter(s => shiftRollCounts[s.id] && shiftRollCounts[s.id] >= s.available_rolls)
        .map(s => s.id)
    );
  }, [selectedRolls, shiftsWithStock]);

  // Hitung berapa roll dari shift tertentu yang sudah dipilih
  const getSelectedCountForShift = (shiftId: string) => {
    return selectedRolls.filter(r => r.session_id === shiftId).length;
  };

  // Filter daftar stok berdasarkan mesin & pencarian
  const filteredStock = useMemo(() => {
    return inStockRolls.filter((r) => {
      const notSelected = !selectedRolls.find((s) => s.id === r.id);
      const machineMatch = filterMachine === "all" || String(r.machine_number) === filterMachine;
      const codeMatch = searchCode.trim() === "" || r.roll_code.toUpperCase().includes(searchCode.toUpperCase());
      return notSelected && machineMatch && codeMatch;
    });
  }, [inStockRolls, selectedRolls, filterMachine, searchCode]);

  // --- Handlers ---
  const handleAddRoll = (roll: Roll) => {
    if (selectedRolls.find((r) => r.id === roll.id)) return; // sudah ada
    setSelectedRolls((prev) => [...prev, roll]);
    setSearchCode("");
    setSearchResult(null);
    searchRef.current?.focus();
  };

  // Pilih semua roll dari 1 shift
  const handleSelectShift = (shiftId: string) => {
    const shiftRolls = inStockRolls.filter(r => r.session_id === shiftId);
    setSelectedRolls(prev => {
      const existingIds = new Set(prev.map(r => r.id));
      const newRolls = shiftRolls.filter(r => !existingIds.has(r.id));
      return [...prev, ...newRolls];
    });
  };

  // Batalkan semua roll dari 1 shift
  const handleDeselectShift = (shiftId: string) => {
    setSelectedRolls(prev => prev.filter(r => r.session_id !== shiftId));
  };

  const handleSearchByCode = async () => {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;

    // Cek dulu di local state (lebih cepat)
    const local = inStockRolls.find((r) => r.roll_code.toUpperCase() === code);
    if (local) {
      if (selectedRolls.find((r) => r.id === local.id)) {
        setSearchResult("already_added");
        return;
      }
      setSearchResult(local);
      return;
    }

    // Fallback ke server (untuk kasus roll sudah terjual)
    const result = await findRollByCode(code);
    if (!result) {
      setSearchResult("not_found");
    } else if (result.status === "SOLD") {
      setSearchResult("sold");
    } else {
      setSearchResult(result as Roll);
    }
  };

  const handleRemoveRoll = (id: string) => {
    setSelectedRolls((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = () => {
    setError("");
    setSuccess("");

    if (!picName.trim() || !buyerName.trim()) {
      setError("Nama PIC dan Nama Pembeli wajib diisi.");
      return;
    }
    if (selectedRolls.length === 0) {
      setError("Pilih minimal 1 roll untuk surat jalan ini.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createSale({
          pic_name: picName,
          buyer_name: buyerName,
          nopol,
          rollIds: selectedRolls.map((r) => r.id),
        });

        if (result.success) {
          router.push(`/outbound/${result.saleId}`);
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat menyimpan.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* STOK SUMMARY BADGE */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-primary-dark font-semibold uppercase tracking-wider">Roll Tersedia</p>
          <p className="text-3xl font-black text-primary">{inStockRolls.length} <span className="text-base font-normal text-primary-dark">Roll</span></p>
        </div>
        <PackageCheck className="w-12 h-12 text-primary opacity-50" />
      </div>

      <div className="space-y-4">
        {/* FORM IDENTITAS */}
          <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> Data Pengiriman
            </h2>
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1">Nama PIC / Admin *</label>
              <input
                type="text"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Contoh: Budi"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1">Nama Pembeli / Tujuan *</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Contoh: Toko Makmur Jaya"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-muted mb-1">No. Polisi Kendaraan (Opsional)</label>
              <input
                type="text"
                value={nopol}
                onChange={(e) => setNopol(e.target.value.toUpperCase())}
                placeholder="Contoh: B 1234 ABC"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
              />
            </div>
          </div>

          {/* ======================== */}
          {/* PILIH CEPAT PER SHIFT */}
          {/* ======================== */}
          {shiftsWithStock.length > 0 && (
            <div className="bg-white border border-indigo-200 rounded-2xl p-4 space-y-3">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" /> Pilih Cepat per Shift
              </h2>
              <p className="text-[11px] text-foreground-muted -mt-1">
                Tekan tombol untuk langsung memasukkan semua roll dari 1 shift.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {shiftsWithStock.map((shift) => {
                  const wkt = parseWkt(shift.date_opened);
                  const isFullySelected = selectedShiftIds.has(shift.id);
                  const selectedCount = getSelectedCountForShift(shift.id);
                  const isPartiallySelected = selectedCount > 0 && !isFullySelected;

                  return (
                    <div
                      key={shift.id}
                      className={`rounded-xl border p-3 transition-all ${
                        isFullySelected
                          ? "bg-indigo-50 border-indigo-300"
                          : isPartiallySelected
                          ? "bg-amber-50 border-amber-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-foreground truncate">
                            Shift {shift.shift_number} — {wkt.d}
                          </p>
                          <p className="text-[11px] text-foreground-muted">
                            {shift.available_rolls} roll • {Number(shift.available_weight_kg).toFixed(1)} kg
                            {shift.admin_name && shift.admin_name !== '-' ? ` • ${shift.admin_name}` : ''}
                            {isPartiallySelected && (
                              <span className="ml-1 text-amber-600 font-semibold">({selectedCount} dipilih)</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {isFullySelected || isPartiallySelected ? (
                            <button
                              type="button"
                              onClick={() => handleDeselectShift(shift.id)}
                              className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold active:scale-95 transition-transform"
                            >
                              <Minus className="w-3 h-3" /> Batalkan
                            </button>
                          ) : null}
                          {!isFullySelected && (
                            <button
                              type="button"
                              onClick={() => handleSelectShift(shift.id)}
                              className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold active:scale-95 transition-transform"
                            >
                              <Plus className="w-3 h-3" /> Pilih Semua
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PILIH ROLL INDIVIDUAL */}
          <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-secondary" /> Cari & Pilih Roll
            </h2>

            {/* Search by code */}
            <div className="flex gap-2">
              <input
                ref={searchRef}
                type="text"
                value={searchCode}
                onChange={(e) => { setSearchCode(e.target.value); setSearchResult(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearchByCode(); }}
                placeholder="Ketik / scan kode roll..."
                className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 font-mono"
              />
              <button
                onClick={handleSearchByCode}
                className="bg-secondary text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform flex items-center gap-1"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Hasil pencarian */}
            {searchResult === "not_found" && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Kode roll tidak ditemukan di database.
              </div>
            )}
            {searchResult === "sold" && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Roll ini sudah terjual sebelumnya.
              </div>
            )}
            {searchResult === "already_added" && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Roll ini sudah ada di daftar pilihan.
              </div>
            )}
            {searchResult && typeof searchResult === "object" && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl p-3">
                <div>
                  <p className="font-mono font-bold text-emerald-900 text-sm">{searchResult.roll_code}</p>
                  <p className="text-xs text-emerald-700">Berat: {searchResult.weight_kg} kg | Mesin: {searchResult.machine_number}</p>
                </div>
                <button
                  onClick={() => handleAddRoll(searchResult as Roll)}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                >
                  + Tambah
                </button>
              </div>
            )}

            {/* Filter mesin */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["all", "1", "2", "3", "4", "5", "6", "7"].map((m) => (
                <button
                  key={m}
                  onClick={() => setFilterMachine(m)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filterMachine === m
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-foreground-muted border-border hover:border-primary/50"
                  }`}
                >
                  {m === "all" ? "Semua" : `Mesin ${m}`}
                </button>
              ))}
            </div>

            {/* Daftar stok tersedia */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {filteredStock.length === 0 ? (
                <p className="text-center text-xs text-foreground-muted py-4">
                  {inStockRolls.length === 0 ? "Tidak ada roll tersedia di gudang." : "Tidak ada roll yang cocok dengan filter."}
                </p>
              ) : (
                filteredStock.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleAddRoll(r)}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary/30 rounded-xl p-2.5 text-left transition-all active:scale-[0.98]"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-foreground">{r.roll_code}</p>
                      <p className="text-[11px] text-foreground-muted">Mesin {r.machine_number} | Op: {r.operator_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{r.weight_kg} <span className="text-xs font-normal">kg</span></p>
                      <p className="text-[10px] text-emerald-600 font-semibold">+ Pilih</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ROLL YANG DIPILIH (Porsi Compact Chips) */}
          {selectedRolls.length > 0 && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-4 space-y-3">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Roll Terpilih ({selectedRolls.length})
              </h2>
              
              {/* Tempat chip roll dibungkus, max tinggi 160px agar tidak makan layar */}
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {selectedRolls.map((r, i) => (
                  <div key={r.id} className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-red-50 border border-emerald-200 hover:border-red-200 rounded-lg pl-2 pr-1.5 py-1 transition-colors group">
                    <span className="font-mono text-[11px] font-bold text-emerald-900 group-hover:text-red-900">{r.roll_code}</span>
                    <span className="text-[10px] text-emerald-600 group-hover:text-red-600 font-semibold">{r.weight_kg}kg</span>
                    <button 
                      onClick={() => handleRemoveRoll(r.id)} 
                      className="text-emerald-400 hover:text-red-500 hover:bg-red-100 rounded-md p-0.5 ml-1 transition-colors"
                      title="Hapus dari daftar penjualan"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ERROR / SUCCESS */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* STICKY BOTTOM ACTION BAR (Info Penjualan & Tombol) */}
          <div className="sticky bottom-4 z-40 mt-6 pt-4">
             <div className="bg-white border border-emerald-200 shadow-2xl shadow-emerald-900/10 rounded-2xl p-3.5">
                <div className="flex justify-between items-end mb-3.5 px-1 border-b border-gray-100 pb-2.5">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Akan Dijual / Keluar</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedRolls.length} Roll Rafia</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Total Bobot Barang</p>
                    <p className="text-2xl font-black text-emerald-600">{totalWeight.toFixed(1)} <span className="text-sm font-bold text-emerald-600/70">kg</span></p>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isPending || selectedRolls.length === 0}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/20"
                >
                  {isPending ? (
                    <span className="animate-pulse">Menyimpan Transaksi...</span>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" /> Finalisasi Surat Jalan
                    </>
                  )}
                </button>
             </div>
          </div>
        </div>
      </div>
  );
}
