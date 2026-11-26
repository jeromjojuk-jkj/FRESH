import { body, handle } from "@/lib/server/http";
import { requireCustomer } from "@/lib/server/session";
import { rateOrder } from "@/lib/server/orders";

export const POST = handle<{ code: string }>(async (req, { code }) => {
  const b = await body(req);
  return rateOrder(await requireCustomer(), code, b.stars, b.note);
});
