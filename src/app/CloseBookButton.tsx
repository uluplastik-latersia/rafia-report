"use client";

import { useState, useTransition } from "react";
import { tutupBukuBulanan } from "@/actions/closure";
import { BookCheck, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CloseBookButton({ currentMonthYear }: { currentMonthYear: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Helper untuk mendapatkan nama bulan
  const getMonthName = (str: string) => {
    if (!str.includes("-")) return str;
    const parts = str.split("-");
    const monthIndex = parseInt(parts[0], 10) - 1;
    const year = parts[1];
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${months[monthIndex]} ${year}`;
  };

  const handleTutupBuku = async () => {
    setLoading(true);
    try {
      const res = await tutupBukuBulanan();
      if (res.success) {
        setIsOpen(false);
        startTransition(() => {
          router.refresh(); // Refresh halaman agar data terbaru termuat
        });
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold rounded-lg transition-colors border border-secondary/20 active:scale-[0.98]"
      >
        <BookCheck className="w-4 h-4" />
        Tutup Buku {getMonthName(currentMonthYear)}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl border border-border">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-text-strong mb-2">Tutup Buku Bulan Ini?</h3>
                <p className="text-sm text-text-light">
                  Anda akan menutup catatan produksi untuk <strong className="text-secondary">{getMonthName(currentMonthYear)}</strong>. 
                  HR Mesin saat ini akan disimpan sebagai riwayat dan di-reset menjadi 0 untuk memulai bulan produksi selanjutnya. Stok Gudang tidak akan terpengaruh.
                </p>
              </div>

              <div className="flex flex-col w-full gap-2 mt-2">
                <button 
                  onClick={handleTutupBuku}
                  disabled={loading || isPending}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading || isPending ? "Memproses..." : "Ya, Tutup Buku Sekarang"}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="w-full py-3 bg-surface hover:bg-background text-text-strong font-medium rounded-xl border border-border active:scale-[0.98] transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
