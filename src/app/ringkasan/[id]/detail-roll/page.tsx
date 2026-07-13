import { db } from "@/lib/db";
import { getSessionRolls } from "@/actions/inbound";
import DetailRollClient from "./DetailRollClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DetailRollPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const shiftId = params.id;

  const shiftResult = await db.execute({
    sql: "SELECT * FROM shift_sessions WHERE id = ?",
    args: [shiftId]
  });

  const row = shiftResult.rows[0];
  const shift = row ? JSON.parse(JSON.stringify(row)) : null;

  if (!shift) {
    notFound();
  }

  const rolls = await getSessionRolls(shift.id);

  return (
    <div className="pb-12 slide-in mt-6 max-w-[1200px] mx-auto px-4">
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link href={`/ringkasan/${shift.id}`} className="p-2 bg-surface rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5 text-foreground-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Detail Roll Shift {shift.shift_number}
          </h1>
          <p className="text-xs text-foreground-muted">
            Pratinjau & cetak daftar lengkap roll pada shift ini
          </p>
        </div>
      </div>

      <DetailRollClient shift={shift} rolls={rolls as any[]} />
    </div>
  );
}
