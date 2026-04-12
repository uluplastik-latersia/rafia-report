import { createClient } from "@libsql/client";

// Singleton client — reusable di seluruh Server Actions
// Tidak perlu membuat koneksi baru setiap request
let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error("TURSO_DATABASE_URL tidak ditemukan di environment variables!");
    }

    client = createClient({
      url,
      authToken: authToken || undefined,
    });
  }
  return client;
}

// Shorthand untuk dipakai di Server Actions
export const db = {
  execute: (stmt: any) => getDb().execute(stmt),
  batch: (stmts: any) => getDb().batch(stmts),
};
