import { getInStockRolls, getSales, getClosedShiftsWithStock } from "@/actions/outbound";
import OutboundClient from "./OutboundClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OutboundPage() {
  const [inStockRolls, sales, shiftsWithStock] = await Promise.all([
    getInStockRolls(),
    getSales(),
    getClosedShiftsWithStock(),
  ]);

  return (
    <div className="pb-12 slide-in mt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 bg-surface rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Penjualan
          </h1>
          <p className="text-xs text-foreground-muted">
            Buat surat jalan & kelola pengiriman
          </p>
        </div>
      </div>

      <OutboundClient inStockRolls={inStockRolls} sales={sales} shiftsWithStock={shiftsWithStock} />
    </div>
  );
}
