import { ApiError, body, handle } from "@/lib/server/http";
import { setSession } from "@/lib/server/session";
import { query } from "@/lib/server/db";
import { cookies } from "next/headers";

// Demo-only account switcher. Replace with real sign-in before launch.
export const POST = handle(async (req) => {
  if (process.env.DISABLE_DEMO === "1") throw new ApiError(403, "DEMO_DISABLED", "Demo switching is disabled.");
  const { role, id } = await body(req);
  if (role === "guest") {
    // Start over as a brand-new visitor.
    (await cookies()).set("nb_session", "", { path: "/", maxAge: 0 });
    return { ok: true };
  }
  const table = role === "customer" ? "customers" : role === "store" ? "stores" : role === "rider" ? "riders" : null;
  if (!table) throw new ApiError(400, "BAD_ROLE", "Unknown role.");
  const { rows } = await query(`SELECT id FROM ${table} WHERE id=$1`, [id]);
  if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "Account not found.");
  await setSession({ role, id });
  return { ok: true };
});
