import { body, handle } from "@/lib/server/http";
import { requireRole } from "@/lib/server/session";
import { getStoreOrder, storeAction } from "@/lib/server/orders";

export const GET = handle<{ code: string }>(async (_req, { code }) => ({ order: await getStoreOrder(await requireRole("store"), code) }));

// { action: accept | decline | start_packing | pack_item | report_missing | remove_short | ready, ... }
export const POST = handle<{ code: string }>(async (req, { code }) => {
  const storeId = await requireRole("store");
  const b = await body(req);
  return { order: await storeAction(storeId, code, String(b.action), b) };
});
