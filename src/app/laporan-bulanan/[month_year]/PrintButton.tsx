"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white shadow-md rounded-lg hover:bg-emerald-700 transition-colors font-bold text-sm"
    >
      <Printer className="w-4 h-4" /> Cetak A4 / PDF
    </button>
  );
}
