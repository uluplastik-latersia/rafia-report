"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { searchRollsAction, deleteRollAction } from "@/actions/koreksi";

export default function KoreksiDataPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setMessage(null);
    setResults([]);

    const res = await searchRollsAction(query.trim());
    if (res.success && res.data) {
      setResults(res.data);
      if (res.data.length === 0) {
        setMessage({ type: "error", text: "Tidak ada data roll IN_STOCK yang sesuai dengan pencarian Anda." });
      }
    } else {
      setMessage({ type: "error", text: res.error || "Gagal melakukan pencarian." });
    }
    
    setIsSearching(false);
  };

  const handleDelete = async (rollId: string, rollCode: string, weight: number) => {
    const confirmDelete = window.confirm(
      `PENTING!\n\nApakah Anda yakin ingin menghapus Roll ini?\n\nKode: ${rollCode}\nBerat: ${weight} kg\n\nTindakan ini akan mengurangi Total Produksi Shift dan HR Mesin secara otomatis, serta tidak dapat dibatalkan.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    setMessage(null);

    const res = await deleteRollAction(rollId);
    
    if (res.success) {
      setMessage({ type: "success", text: `Roll ${rollCode} berhasil dihapus! Data stok dan HR Mesin telah disesuaikan.` });
      // Remove from UI list
      setResults(prev => prev.filter(r => r.id !== rollId));
    } else {
      setMessage({ type: "error", text: res.error || "Gagal menghapus roll." });
    }

    setIsDeleting(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      const safe = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
      const date = new Date(safe);
      return new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full lg:max-w-6xl xl:max-w-[90%] mx-auto px-4 lg:px-8 slide-in">
      {/* HEADER */}
      <div className="flex items-center justify-between mt-6 bg-surface p-4 rounded-2xl shadow-sm border border-border">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Koreksi Data</h1>
            <p className="text-sm text-foreground-muted">Cari dan hapus data roll yang salah / ganda.</p>
          </div>
        </div>
      </div>

      {/* SEARCH CARD */}
      <div className="bg-surface rounded-2xl p-5 shadow-sm border border-border">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari berdasarkan Kode Roll, Berat (misal: 50.5), atau Inisial Operator..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-shadow"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {isSearching ? "Mencari..." : "Cari"}
          </button>
        </form>
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Hanya menampilkan roll dengan status <b>IN_STOCK</b> (Belum terjual).
        </p>
      </div>

      {/* NOTIFICATIONS */}
      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
          <div className="text-sm font-medium">{message.text}</div>
        </div>
      )}

      {/* RESULTS LIST */}
      {results.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-background/50">
            <h2 className="font-semibold text-foreground">Hasil Pencarian ({results.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-background/80 text-foreground-muted text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium border-b border-border">Kode Roll</th>
                  <th className="p-4 font-medium border-b border-border text-center">Berat (kg)</th>
                  <th className="p-4 font-medium border-b border-border text-center">Operator</th>
                  <th className="p-4 font-medium border-b border-border text-center">Shift Asal</th>
                  <th className="p-4 font-medium border-b border-border">Tanggal Buat</th>
                  <th className="p-4 font-medium border-b border-border text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((roll) => (
                  <tr key={roll.id} className="hover:bg-background/50 transition-colors">
                    <td className="p-4 font-bold text-primary">{roll.roll_code}</td>
                    <td className="p-4 text-center text-foreground font-medium">{roll.weight_kg}</td>
                    <td className="p-4 text-center">
                      <span className="bg-secondary/10 text-secondary px-2 py-1 rounded text-xs font-semibold">
                        {roll.operator_code}
                      </span>
                    </td>
                    <td className="p-4 text-center text-sm text-foreground-muted">
                      Shift {roll.shift_number} (M{roll.machine_number})
                    </td>
                    <td className="p-4 text-sm text-foreground-muted">
                      {formatDate(roll.created_at)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(roll.id, roll.roll_code, roll.weight_kg)}
                        disabled={isDeleting}
                        className="inline-flex items-center justify-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
