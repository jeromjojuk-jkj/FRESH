import { handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { listStoreOrders } from "@/lib/server/orders";

export const GET = handle(async (req) => {
  const storeId = await requireRole("store");
  const v = new URL(req.url).searchParams.get("view");
  const view = v === "active" || v === "done" ? v : "new";
  const [orders, counts] = await Promise.all([listStoreOrders(storeId, view), Promise.all([listStoreOrders(storeId, "new"), listStoreOrders(storeId, "active")])]);
  return { orders, counts: { new: counts[0].length, active: counts[1].length } };
});
