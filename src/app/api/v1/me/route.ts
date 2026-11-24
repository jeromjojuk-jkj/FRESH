import { handle } from "@/lib/server/http";
import { getSession, requireCustomer } from "@/lib/server/session";
import { query } from "@/lib/server/db";

// Returns who is signed in. Customers get a guest account on first visit.
export const GET = handle(async () => {
  const s = await getSession();
  if (s && s.role !== "customer") {
    const table = s.role === "store" ? "stores" : "riders";
    const { rows } = await query(`SELECT id, name FROM ${table} WHERE id=$1`, [s.id]);
    return { role: s.role, id: s.id, name: rows[0]?.name ?? s.id };
  }
  const id = await requireCustomer();
  const { rows } = await query(`SELECT id, name FROM customers WHERE id=$1`, [id]);
  return { role: "customer", id, name: rows[0]?.name ?? "Guest" };
});
