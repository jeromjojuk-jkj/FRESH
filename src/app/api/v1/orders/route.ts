import { body, handle } from "@/lib/server/http";
import { requireCustomer } from "@/lib/server/session";
import { listCustomerOrders, placeOrder } from "@/lib/server/orders";

export const GET = handle(async () => ({ orders: await listCustomerOrders(await requireCustomer()) }));

export const POST = handle(async (req) => {
  const customerId = await requireCustomer();
  const res = await placeOrder(customerId, await body(req));
  return Response.json(res, { status: res.duplicate ? 200 : 201 });
});
