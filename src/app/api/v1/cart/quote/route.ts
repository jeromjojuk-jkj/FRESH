import { ApiError, body, handle } from "@/lib/server/http";
import { query } from "@/lib/server/db";
import { cleanLines, quote } from "@/lib/server/cart";
import { requireCustomer } from "@/lib/server/session";

export const POST = handle(async (req) => {
  const b = await body(req);
  if (!b.storeId) throw new ApiError(400, "NO_STORE", "Choose a store first.");
  const customerId = await requireCustomer();
  return { quote: await quote(query, String(b.storeId), cleanLines(b.items ?? []), b.location, { couponCode: b.couponCode, tip: Number(b.tip) || 0, customerId }) };
});
