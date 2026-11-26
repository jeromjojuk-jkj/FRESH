import { handle } from "@/lib/server/http";
import { query } from "@/lib/server/db";

export const GET = handle(async () => {
  const [c, s, r] = await Promise.all([
    query(`SELECT id, name FROM customers WHERE id NOT LIKE 'guest-%' ORDER BY id`),
    query(`SELECT id, name, area FROM stores ORDER BY name`),
    query(`SELECT r.id, r.name, s.name AS store FROM riders r LEFT JOIN stores s ON s.id=r.home_store_id ORDER BY r.name`),
  ]);
  return { customers: c.rows, stores: s.rows, riders: r.rows };
});
