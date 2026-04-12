import { getSaleDetail } from "@/actions/outbound";
import SaleDetailClient from "./SaleDetailClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await getSaleDetail(params.id);

  if (!data) {
    notFound();
  }

  return (
    <div className="pb-12 slide-in mt-6">
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link href="/outbound" className="p-2 bg-surface rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Detail Surat Jalan
          </h1>
          <p className="text-xs text-foreground-muted">
            Pratinjau & cetak dokumen pengiriman
          </p>
        </div>
      </div>

      <SaleDetailClient sale={data.sale} items={data.items} />
    </div>
  );
}
