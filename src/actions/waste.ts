"use server";

import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// Fetch all wastes for all machines in a given session
export async function getSessionWastes(sessionId: string) {
  const res = await db.execute({
    sql: `SELECT * FROM machine_wastes WHERE session_id = ?`,
    args: [sessionId],
  });
  return res.rows.map(r => JSON.parse(JSON.stringify(r)));
}

// Auto-Save Upsert logic for a machine's waste
export async function upsertMachineWaste(data: {
  session_id: string;
  machine_number: number;
  afalan_kg: number;
  prongkalan_kg: number;
}) {
  // Check if waste entry already exists for this machine & shift
  const check = await db.execute({
    sql: `SELECT id FROM machine_wastes WHERE session_id = ? AND machine_number = ?`,
    args: [data.session_id, data.machine_number],
  });

  if (check.rows.length > 0) {
    // Update existing
    await db.execute({
      sql: `UPDATE machine_wastes SET afalan_kg = ?, prongkalan_kg = ? WHERE id = ?`,
      args: [data.afalan_kg, data.prongkalan_kg, check.rows[0].id],
    });
  } else {
    // Insert new
    await db.execute({
      sql: `INSERT INTO machine_wastes (id, session_id, machine_number, afalan_kg, prongkalan_kg)
            VALUES (?, ?, ?, ?, ?)`,
      args: [uuidv4(), data.session_id, data.machine_number, data.afalan_kg, data.prongkalan_kg],
    });
  }
}
