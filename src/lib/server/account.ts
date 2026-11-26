import { query } from "./db";
import { ApiError } from "./http";
import { activeCoupons, customerContext, PLUS_PRICE } from "./pricing";

export async function accountView(customerId: string) {
  const { rows } = await query(`SELECT id, name, phone, plus_until, plus_auto_renew FROM customers WHERE id=$1`, [customerId]);
  const c = rows[0];
  const ctx = await customerContext(query, customerId);
  const { rows: o } = await query(`SELECT count(*)::int AS n, COALESCE(sum(total) FILTER (WHERE status='delivered'),0)::int AS spent FROM orders WHERE customer_id=$1`, [customerId]);
  return {
    id: c.id, name: c.name, phone: c.phone,
    plus: { active: ctx.isPlus, until: c.plus_until, autoRenew: c.plus_auto_renew, price: PLUS_PRICE },
    orders: o[0].n,
  };
}

export async function updateProfile(customerId: string, p: { name?: string; phone?: string }) {
  const name = String(p.name ?? "").trim().slice(0, 60);
  const phone = String(p.phone ?? "").replace(/[^\d+ ]/g, "").trim().slice(0, 20);
  if (!name) throw new ApiError(400, "NAME_REQUIRED", "Please enter your name.");
  if (phone && phone.replace(/\D/g, "").length < 10) throw new ApiError(400, "BAD_PHONE", "Enter a 10-digit mobile number.");
  await query(`UPDATE customers SET name=$2, phone=$3 WHERE id=$1`, [customerId, name, phone]);
  return accountView(customerId);
}

/**
 * KripFresh Plus (simulated payment). Joining adds 30 days. Cancelling stops renewal;
 * benefits stay until the end of the period already paid for.
 */
export async function setPlus(customerId: string, action: string) {
  if (action === "join") {
    await query(
      `UPDATE customers SET plus_until = GREATEST(COALESCE(plus_until, now()), now()) + interval '30 days', plus_auto_renew = TRUE WHERE id=$1`,
      [customerId],
    );
  } else if (action === "cancel") {
    await query(`UPDATE customers SET plus_auto_renew = FALSE WHERE id=$1`, [customerId]);
  } else if (action === "resume") {
    await query(`UPDATE customers SET plus_auto_renew = TRUE WHERE id=$1 AND plus_until > now()`, [customerId]);
  } else throw new ApiError(400, "BAD_ACTION", "Unknown action.");
  return accountView(customerId);
}

export async function couponList() {
  return (await activeCoupons(query)).map((c) => ({ code: c.code, title: c.title, description: c.description, plusOnly: c.plus_only, firstOrderOnly: c.first_order_only }));
}
