/**
 * Script reset operator — hapus dummy, isi data asli
 * Jalankan: npx tsx tmp/reset-operators.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

const OPERATORS = [
  // --- SHIFT 1 ---
  { name: "YANTO",      code: "YO",  shift: 1, machine: 1 },
  { name: "SAI'IN",     code: "SIN", shift: 1, machine: 2 },
  { name: "PUTRA",      code: "PA",  shift: 1, machine: 3 },
  { name: "RISKY",      code: "RY",  shift: 1, machine: 4 },
  { name: "TOYIB",      code: "TB",  shift: 1, machine: 5 },
  { name: "MAHDI",      code: "MI",  shift: 1, machine: 6 },
  { name: "JHON",       code: "JH",  shift: 1, machine: 7 },
  { name: "KUKUH",      code: "KH",  shift: 1, machine: 0 },
  { name: "KHOIRON",    code: "KON", shift: 1, machine: 0 },
  { name: "TAUFIK",     code: "TK",  shift: 1, machine: 0 },
  { name: "AINUL",      code: "AL",  shift: 1, machine: 0 },
  { name: "RUHAN",      code: "RN",  shift: 1, machine: 0 },
  // --- SHIFT 2 ---
  { name: "REIJA",      code: "RA",  shift: 2, machine: 1 },
  { name: "KARAN",      code: "KN",  shift: 2, machine: 2 },
  { name: "SHOLEHUDIN", code: "SN",  shift: 2, machine: 3 },
  { name: "BAGAS",      code: "BS",  shift: 2, machine: 4 },
  { name: "BAMBANG",    code: "BG",  shift: 2, machine: 5 },
  { name: "IMALUL",     code: "IL",  shift: 2, machine: 6 },
  { name: "ZAINAL",     code: "ZL",  shift: 2, machine: 7 },
  { name: "NICOLAS",    code: "NS",  shift: 2, machine: 0 },
  { name: "MAHBUBI",    code: "MBI", shift: 2, machine: 0 },
  { name: "FARUQ",      code: "FQ",  shift: 2, machine: 0 },
  { name: "RONI",       code: "RI",  shift: 2, machine: 0 },
  { name: "DIMAS",      code: "DS",  shift: 2, machine: 0 },
];

async function reset() {
  console.log("🗑️  Menghapus data operator lama...");
  await db.execute("DELETE FROM operators");

  console.log("👷 Mengisi data operator asli...");
  for (const op of OPERATORS) {
    await db.execute({
      sql: `INSERT INTO operators (name, code, shift, machine_number) VALUES (?, ?, ?, ?)`,
      args: [op.name, op.code, op.shift, op.machine],
    });
    const mesin = op.machine > 0 ? `Mesin ${op.machine}` : "Non-Mesin";
    console.log(`  ✅ [Shift ${op.shift} | ${mesin}] ${op.name} (${op.code})`);
  }

  const count = await db.execute("SELECT COUNT(*) as total FROM operators");
  console.log(`\n✨ Total operator: ${(count.rows[0] as unknown as { total: number }).total} orang — Selesai!`);
  db.close();
}

reset().catch(console.error);
