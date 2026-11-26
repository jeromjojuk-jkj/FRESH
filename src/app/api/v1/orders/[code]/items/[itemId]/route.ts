import { ApiError, body, handle } from "@/lib/server/http";
import { requireCustomer } from "@/lib/server/session";
import { getCustomerOrder, resolveShortItem } from "@/lib/server/orders";
import { alternatives } from "@/lib/server/catalogue";
import { query } from "@/lib/server/db";

// GET: in-stock alternatives at the same store. POST: customer removes or approves a replacement.
export const GET = handle<{ code: string; itemId: string }>(async (_req, { code, itemId }) => {
  const order = await getCustomerOrder(await requireCustomer(), code);
  const item = order.items.find((i: any) => String(i.id) === itemId);
  if (!item) throw new ApiError(404, "ITEM_NOT_FOUND", "Item not found.");
  return { alternatives: await alternatives(query, order.store.id, item.productId) };
});

export const POST = handle<{ code: string; itemId: string }>(async (req, { code, itemId }) => {
  const b = await body(req);
  await resolveShortItem(await requireCustomer(), code, Number(itemId), b.action, b.productId, b.price);
  return { order: await getCustomerOrder(await requireCustomer(), code) };
});
