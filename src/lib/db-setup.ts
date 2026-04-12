/**
 * Script Setup Database STOK RAFIA UPL
 * 
 * Jalankan dengan: npx tsx src/lib/db-setup.ts
 * 
 * Script ini akan:
 * 1. Membuat semua tabel sesuai ERD
 * 2. Seed data 24 operator
 * 3. Inisialisasi baris system_stats
 */

import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables dari .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken: authToken || undefined });

// =============================================
// SCHEMA SQL — semua tabel dari ERD
// =============================================
const SCHEMA_STATEMENTS = [
  // 1. Tabel Operator
  // Hanya menyimpan nama & kode. Penugasan mesin bersifat dinamis (rolling)
  // dan ditentukan admin saat input roll melalui dropdown.
  `CREATE TABLE IF NOT EXISTS operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
  )`,

  // 2. Tabel Sesi Shift
  `CREATE TABLE IF NOT EXISTS shift_sessions (
    id TEXT PRIMARY KEY,
    shift_number INTEGER NOT NULL,
    date_opened DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_closed DATETIME,
    bahan_baku_a_karung INTEGER DEFAULT 0,
    pp_hijau_muda_kg REAL DEFAULT 0,
    sapuan_kg REAL DEFAULT 0,
    sisa_sablon_a_karung INTEGER DEFAULT 0,
    sapuan_kotor_kg REAL DEFAULT 0,
    admin_name TEXT,
    jumlah_karyawan INTEGER DEFAULT 0,
    status TEXT DEFAULT 'OPEN'
  )`,

  // 3. Tabel Waste Per Mesin
  `CREATE TABLE IF NOT EXISTS machine_wastes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    machine_number INTEGER NOT NULL,
    afalan_kg REAL DEFAULT 0,
    prongkalan_kg REAL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES shift_sessions(id) ON DELETE CASCADE
  )`,

  // 4. Tabel Roll Rafia
  `CREATE TABLE IF NOT EXISTS rolls (
    id TEXT PRIMARY KEY,
    roll_code TEXT NOT NULL UNIQUE,
    weight_kg REAL NOT NULL,
    operator_code TEXT NOT NULL,
    machine_number INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    status TEXT DEFAULT 'IN_STOCK',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES shift_sessions(id) ON DELETE CASCADE
  )`,

  // 5. Index untuk pencarian rolls (optimasi kritis)
  `CREATE INDEX IF NOT EXISTS idx_rolls_status ON rolls(status)`,
  `CREATE INDEX IF NOT EXISTS idx_rolls_code ON rolls(roll_code)`,
  `CREATE INDEX IF NOT EXISTS idx_rolls_operator ON rolls(operator_code)`,

  // 6. Tabel Sales
  `CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    pic_name TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    nopol TEXT,
    sale_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_weight_kg REAL DEFAULT 0,
    total_rolls INTEGER DEFAULT 0
  )`,

  // 7. Tabel Sale Items (Junction table)
  `CREATE TABLE IF NOT EXISTS sale_items (
    sale_id TEXT NOT NULL,
    roll_id TEXT NOT NULL,
    PRIMARY KEY (sale_id, roll_id),
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (roll_id) REFERENCES rolls(id) ON DELETE RESTRICT
  )`,

  // 8. Tabel System Stats (single-row optimization)
  `CREATE TABLE IF NOT EXISTS system_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_stock_kg REAL DEFAULT 0,
    current_hr_kg REAL DEFAULT 0,
    current_month_year TEXT
  )`,

  // 9. Tabel Arsip Tutup Buku Bulanan
  `CREATE TABLE IF NOT EXISTS monthly_closures (
    id TEXT PRIMARY KEY,
    month_year TEXT NOT NULL,
    total_hr_kg REAL DEFAULT 0,
    closed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
];

// =============================================
// DATA OPERATOR — 24 orang
// Penugasan mesin bersifat rolling (dinamis).
// Admin memilih operator dari dropdown saat input roll.
// =============================================
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

async function setup() {
  console.log("🚀 Memulai setup database STOK RAFIA UPL...");
  console.log(`📍 Database URL: ${url}`);
  console.log("");

  // Step 1: Buat semua tabel
  console.log("📋 Membuat tabel-tabel database...");
  for (const statement of SCHEMA_STATEMENTS) {
    await client.execute(statement);
    const tableName = statement.match(/TABLE IF NOT EXISTS (\w+)/)?.[1] ||
                      statement.match(/INDEX IF NOT EXISTS (\w+)/)?.[1] || "?";
    console.log(`  ✅ ${tableName}`);
  }

  // Step 2: Inisialisasi system_stats (INSERT OR IGNORE)
  console.log("\n📊 Inisialisasi system_stats...");
  const now = new Date();
  const monthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
  await client.execute({
    sql: `INSERT OR IGNORE INTO system_stats (id, current_stock_kg, current_hr_kg, current_month_year) 
          VALUES (1, 0, 0, ?)`,
    args: [monthYear],
  });
  console.log(`  ✅ system_stats diinisialisasi (bulan: ${monthYear})`);

  // Step 3: Seed operator (INSERT OR IGNORE — aman dijalankan berulang kali)
  console.log("\n👷 Menyeed data operator...");
  for (const op of OPERATORS) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO operators (name, code) VALUES (?, ?)`,
      args: [op.name, op.code],
    });
    console.log(`  ✅ ${op.name} (${op.code})`);
  }

  // Step 4: Verifikasi
  console.log("\n🔍 Verifikasi...");
  const statsResult = await client.execute("SELECT * FROM system_stats");
  const opCount = await client.execute("SELECT COUNT(*) as total FROM operators");
  console.log(`  ✅ system_stats: ${JSON.stringify(statsResult.rows[0])}`);
  console.log(`  ✅ Total operator: ${(opCount.rows[0] as unknown as { total: number }).total} orang`);

  console.log("\n✨ Setup selesai! Database siap digunakan.");

  client.close();
}

setup().catch((err) => {
  console.error("❌ Error saat setup:", err);
  process.exit(1);
});
