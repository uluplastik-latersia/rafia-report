import { db } from "@/lib/db";
import { getSessionRolls, getOperators } from "@/actions/inbound";
import { getSessionWastes } from "@/actions/waste";
import { getShiftMachineInsights } from "@/actions/insights";
import MesinClient from "./MesinClient";

export const dynamic = "force-dynamic";

export default async function MesinPage() {
  // 1. Cek shift aktif (OPEN)
  const activeRes = await db.execute("SELECT * FROM shift_sessions WHERE status = 'OPEN' LIMIT 1");
  let targetShift = activeRes.rows[0] ? JSON.parse(JSON.stringify(activeRes.rows[0])) : null;
  let isActive = true;

  // Jika tidak ada shift aktif, ambil shift terakhir yang CLOSED untuk ditampilkan sebagai referensi
  if (!targetShift) {
    isActive = false;
    const lastClosedRes = await db.execute("SELECT * FROM shift_sessions WHERE status = 'CLOSED' ORDER BY date_closed DESC LIMIT 1");
    if (lastClosedRes.rows[0]) {
      targetShift = JSON.parse(JSON.stringify(lastClosedRes.rows[0]));
    }
  }

  // 2. Fetch data detail shift (rolls, wastes, operators)
  let currentRolls: any[] = [];
  let currentWastes: any[] = [];
  let operators: any[] = [];

  if (targetShift) {
    const [rolls, wastes, ops] = await Promise.all([
      getSessionRolls(targetShift.id),
      getSessionWastes(targetShift.id),
      getOperators(),
    ]);
    currentRolls = rolls as any[];
    currentWastes = wastes as any[];
    operators = ops as any[];
  }

  // 3. Ambil data insight mesin per shift (100 shift terakhir untuk fleksibilitas filter)
  const shiftInsights = await getShiftMachineInsights(100);

  return (
    <MesinClient
      currentShift={targetShift}
      isShiftActive={isActive}
      rolls={currentRolls}
      wastes={currentWastes}
      operators={operators}
      insightsData={shiftInsights}
    />
  );
}
