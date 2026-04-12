/**
 * Reset total DB: hapus file local.db dan buat ulang dari scratch
 * Jalankan: npx tsx tmp/rebuild-db.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Hapus file local.db agar mulai dari bersih
const dbPath = path.resolve(process.cwd(), "local.db");
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("🗑️  local.db dihapus");
}

const db = createClient({ url: "file:./local.db" });

const OPERATORS = [
  { name: "YANTO",      code: "YO"  },
  { name: "SAI'IN",     code: "SIN" },
  { name: "PUTRA",      code: "PA"  },
  { name: "RISKY",      code: "RY"  },
  { name: "TOYIB",      code: "TB"  },
  { name: "MAHDI",      code: "MI"  },
  { name: "JHON",       code: "JH"  },
  { name: "KUKUH",      code: "KH"  },
  { name: "KHOIRON",    code: "KON" },
  { name: "TAUFIK",     code: "TK"  },
  { name: "AINUL",      code: "AL"  },
  { name: "RUHAN",      code: "RN"  },
  { name: "REIJA",      code: "RA"  },
  { name: "KARAN",      code: "KN"  },
  { name: "SHOLEHUDIN", code: "SN"  },
  { name: "BAGAS",      code: "BS"  },
  { name: "BAMBANG",    code: "BG"  },
  { name: "IMALUL",     code: "IL"  },
  { name: "ZAINAL",     code: "ZL"  },
  { name: "NICOLAS",    code: "NS"  },
  { name: "MAHBUBI",    code: "MBI" },
  { name: "FARUQ",      code: "FQ"  },
  { name: "RONI",       code: "RI"  },
  { name: "DIMAS",      code: "DS"  },
];

async function rebuild() {
  console.log("🏗️  Membuat ulang schema...");

  await db.execute(`CREATE TABLE IF NOT EXISTS operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS shift_sessions (
    id TEXT PRIMARY KEY,
    shift_number INTEGER NOT NULL,
    date_opened DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_closed DATETIME,
    bahan_baku_a_karung INTEGER DEFAULT 0,
    pp_hijau_muda_kg REAL DEFAULT 0,
    sapuan_kg REAL DEFAULT 0,
    status TEXT DEFAULT 'OPEN'
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS machine_wastes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    machine_number INTEGER NOT NULL,
    afalan_kg REAL DEFAULT 0,
    prongkalan_kg REAL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES shift_sessions(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS rolls (
    id TEXT PRIMARY KEY,
    roll_code TEXT NOT NULL UNIQUE,
    weight_kg REAL NOT NULL,
    operator_code TEXT NOT NULL,
    machine_number INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    status TEXT DEFAULT 'IN_STOCK',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES shift_sessions(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_rolls_status ON rolls(status)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_rolls_code ON rolls(roll_code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_rolls_operator ON rolls(operator_code)`);

  await db.execute(`CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    pic_name TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    nopol TEXT,
    sale_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_weight_kg REAL DEFAULT 0,
    total_rolls INTEGER DEFAULT 0
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS sale_items (
    sale_id TEXT NOT NULL,
    roll_id TEXT NOT NULL,
    PRIMARY KEY (sale_id, roll_id),
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (roll_id) REFERENCES rolls(id) ON DELETE RESTRICT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS system_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_stock_kg REAL DEFAULT 0,
    current_hr_kg REAL DEFAULT 0,
    current_month_year TEXT
  )`);

  const now = new Date();
  const monthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
  await db.execute({
    sql: `INSERT OR IGNORE INTO system_stats VALUES (1, 0, 0, ?)`,
    args: [monthYear],
  });

  console.log("✅ Semua tabel & index dibuat\n");
  console.log("👷 Seed 24 operator...");

  for (const op of OPERATORS) {
    await db.execute({
      sql: `INSERT INTO operators (name, code) VALUES (?, ?)`,
      args: [op.name, op.code],
    });
    console.log(`  ✅ ${op.name} (${op.code})`);
  }

  // Verifikasi akhir
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const ops = await db.execute("SELECT COUNT(*) as total FROM operators");
  const stats = await db.execute("SELECT * FROM system_stats");

  console.log("\n=== HASIL AKHIR ===");
  console.log("Tables:", tables.rows.map(r => r.name).join(", "));
  console.log("Total operators:", (ops.rows[0] as unknown as { total: number }).total);
  console.log("System stats:", stats.rows[0]);
  console.log("===================");
  console.log("\n✨ Database siap! Operator = name + code saja (mesin = rolling/dinamis)");

  db.close();
}

rebuild().catch(console.error);
