import { createClient } from "@libsql/client";

async function verify() {
  const db = createClient({ url: "file:./local.db" });

  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const ops = await db.execute("SELECT * FROM operators ORDER BY id");
  const stats = await db.execute("SELECT * FROM system_stats");
  const schema = await db.execute("SELECT sql FROM sqlite_master WHERE name='operators'");

  console.log("\n=== VERIFIKASI FINAL ===");
  console.log("Tables:", tables.rows.map(r => r.name).join(", "));
  console.log("\nSchema operators:");
  console.log(schema.rows[0]?.sql);
  console.log("\n24 Operators:");
  ops.rows.forEach((r, i) => console.log(`  ${i+1}. [${r.code}] ${r.name}`));
  console.log("\nSystem Stats:", stats.rows[0]);
  console.log("========================\n");

  db.close();
}

verify().catch(console.error);
